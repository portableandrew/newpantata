import { Router } from 'express';
import { prisma } from '../lib/prisma';
import projectMembersRouter from './projectMembers';

const router = Router();

// GET all projects — includes live margin computed from time entries
router.get('/', async (req, res) => {
  const { status, type, clientId } = req.query;

  const projects = await prisma.project.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(type ? { projectType: type as any } : {}),
      ...(clientId ? { clientId: clientId as string } : {}),
    },
    include: {
      client: { select: { id: true, name: true } },
      healthUpdates: {
        orderBy: { updateDate: 'desc' },
        take: 1,
      },
      financials: {
        orderBy: { month: 'desc' },
        take: 1,
      },
      _count: { select: { timeEntries: true } },
      timeEntries: {
        include: { teamMember: { select: { hourlyRateInternal: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const result = projects.map(p => {
    const totalCost = p.timeEntries.reduce(
      (s, e) => s + Number(e.hours) * Number(e.teamMember.hourlyRateInternal),
      0
    );
    const totalHours = p.timeEntries.reduce((s, e) => s + Number(e.hours), 0);
    const budget = Number(p.budget);
    const liveMargin = budget > 0 ? ((budget - totalCost) / budget) * 100 : null;
    const { timeEntries, ...rest } = p; // strip raw entries from response
    return { ...rest, liveMargin, totalCostToDate: totalCost, totalHoursLogged: totalHours };
  });

  res.json(result);
});

// GET single project
router.get('/:id', async (req, res) => {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      client: true,
      healthUpdates: {
        orderBy: { updateDate: 'desc' },
        include: {
          updatedBy: { select: { id: true, name: true } },
        },
      },
      financials: { orderBy: { month: 'desc' } },
      contractors: { orderBy: { createdAt: 'desc' } },
      feedback: { orderBy: { sentDate: 'desc' } },
      timeEntries: {
        include: {
          teamMember: { select: { id: true, name: true, role: true } },
        },
        orderBy: { date: 'desc' },
        take: 50,
      },
    },
  });

  res.json(project);
});

// POST create project
router.post('/', async (req, res) => {
  const project = await prisma.project.create({
    data: req.body,
    include: { client: true },
  });
  res.status(201).json(project);
});

// PUT update project
router.put('/:id', async (req, res) => {
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: req.body,
    include: { client: true },
  });
  res.json(project);
});

// DELETE project
router.delete('/:id', async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// POST health update
router.post('/:id/health', async (req, res) => {
  const update = await prisma.projectHealthUpdate.create({
    data: {
      projectId: req.params.id,
      ...req.body,
    },
    include: {
      updatedBy: { select: { id: true, name: true } },
    },
  });
  res.status(201).json(update);
});

// GET health updates for project
router.get('/:id/health', async (req, res) => {
  const updates = await prisma.projectHealthUpdate.findMany({
    where: { projectId: req.params.id },
    orderBy: { updateDate: 'desc' },
    include: {
      updatedBy: { select: { id: true, name: true } },
    },
  });
  res.json(updates);
});

// POST project financials
router.post('/:id/financials', async (req, res) => {
  const { month, ...data } = req.body;
  const financial = await prisma.projectFinancial.upsert({
    where: {
      projectId_month: {
        projectId: req.params.id,
        month: new Date(month),
      },
    },
    update: data,
    create: {
      projectId: req.params.id,
      month: new Date(month),
      ...data,
    },
  });
  res.json(financial);
});

// GET time entries summary for project
router.get('/:id/time-summary', async (req, res) => {
  const summary = await prisma.timeEntry.groupBy({
    by: ['teamMemberId', 'isBillable'],
    where: { projectId: req.params.id },
    _sum: { hours: true },
  });

  const teamMembers = await prisma.teamMember.findMany({
    where: { id: { in: summary.map(s => s.teamMemberId) } },
    select: { id: true, name: true, role: true },
  });

  const result = teamMembers.map(tm => {
    const billable = summary.find(s => s.teamMemberId === tm.id && s.isBillable);
    const nonBillable = summary.find(s => s.teamMemberId === tm.id && !s.isBillable);
    return {
      ...tm,
      billableHours: Number(billable?._sum.hours || 0),
      nonBillableHours: Number(nonBillable?._sum.hours || 0),
    };
  });

  res.json(result);
});

// GET live metrics — margin, cost, burn derived from time entries × cost rates
router.get('/:id/metrics', async (req, res) => {
  const { id: projectId } = req.params;

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { budget: true, budgetHours: true, startDate: true, endDate: true },
  });

  // All time entries for this project, with team member cost rate
  const entries = await prisma.timeEntry.findMany({
    where: { projectId },
    include: {
      teamMember: { select: { hourlyRateInternal: true } },
    },
    orderBy: { date: 'asc' },
  });

  const totalHoursLogged = entries.reduce((s, e) => s + Number(e.hours), 0);
  const totalCost = entries.reduce(
    (s, e) => s + Number(e.hours) * Number(e.teamMember.hourlyRateInternal),
    0
  );

  const budget = Number(project.budget);
  const budgetHours = Number(project.budgetHours);
  const margin = budget > 0 ? ((budget - totalCost) / budget) * 100 : null;
  const hoursRemaining = budgetHours > 0 ? budgetHours - totalHoursLogged : null;
  const burnRate = totalCost; // cost to date

  // --- Burndown series: cumulative hours remaining over time ---
  // Group entries by week (ISO week start Monday)
  const weekMap = new Map<string, number>();
  for (const e of entries) {
    const d = new Date(e.date);
    // Snap to Monday of that week
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const key = monday.toISOString().slice(0, 10);
    weekMap.set(key, (weekMap.get(key) ?? 0) + Number(e.hours));
  }

  let cumulative = 0;
  const burndown = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, hours]) => {
      cumulative += hours;
      return {
        week,
        hoursLogged: cumulative,
        hoursRemaining: budgetHours > 0 ? Math.max(budgetHours - cumulative, 0) : null,
      };
    });

  // --- Margin-over-time: rolling margin by month ---
  const monthMap = new Map<string, { hours: number; cost: number }>();
  for (const e of entries) {
    const key = new Date(e.date).toISOString().slice(0, 7); // YYYY-MM
    const cur = monthMap.get(key) ?? { hours: 0, cost: 0 };
    cur.hours += Number(e.hours);
    cur.cost += Number(e.hours) * Number(e.teamMember.hourlyRateInternal);
    monthMap.set(key, cur);
  }

  let cumulativeCost = 0;
  const marginOverTime = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { cost }]) => {
      cumulativeCost += cost;
      const m = budget > 0 ? ((budget - cumulativeCost) / budget) * 100 : null;
      return { month, cumulativeCost, margin: m };
    });

  res.json({
    totalHoursLogged,
    budgetHours,
    hoursRemaining,
    totalCost,
    budget,
    margin,
    burnRate,
    burndown,
    marginOverTime,
  });
});

// Mount project members subrouter
router.use('/:id/members', projectMembersRouter);

export default router;
