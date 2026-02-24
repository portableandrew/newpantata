import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET all projects
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
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(projects);
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

// GET project team assignments
router.get('/:id/members', async (req, res) => {
  const assignments = await prisma.projectAssignment.findMany({
    where: { projectId: req.params.id },
    include: {
      teamMember: {
        select: {
          id: true,
          name: true,
          role: true,
          hourlyRateInternal: true,
          hourlyRateBillable: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(assignments);
});

// POST add team member to project
router.post('/:id/members', async (req, res) => {
  const { teamMemberId, allocationPct, startDate, endDate, estimatedHours, notes } = req.body;
  const assignment = await prisma.projectAssignment.create({
    data: {
      projectId: req.params.id,
      teamMemberId,
      allocationPct: allocationPct ?? 100,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      estimatedHours: estimatedHours ?? undefined,
      notes: notes ?? undefined,
    },
    include: {
      teamMember: {
        select: {
          id: true,
          name: true,
          role: true,
          hourlyRateInternal: true,
          hourlyRateBillable: true,
          email: true,
        },
      },
    },
  });
  res.status(201).json(assignment);
});

// PUT update team member assignment
router.put('/:id/members/:assignmentId', async (req, res) => {
  const { allocationPct, startDate, endDate, estimatedHours, notes } = req.body;
  const assignment = await prisma.projectAssignment.update({
    where: { id: req.params.assignmentId },
    data: {
      allocationPct: allocationPct ?? undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      estimatedHours: estimatedHours ?? undefined,
      notes: notes ?? undefined,
    },
    include: {
      teamMember: {
        select: {
          id: true,
          name: true,
          role: true,
          hourlyRateInternal: true,
          hourlyRateBillable: true,
          email: true,
        },
      },
    },
  });
  res.json(assignment);
});

// DELETE remove team member from project
router.delete('/:id/members/:assignmentId', async (req, res) => {
  await prisma.projectAssignment.delete({ where: { id: req.params.assignmentId } });
  res.status(204).send();
});

// GET project costs breakdown
router.get('/:id/costs', async (req, res) => {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: req.params.id },
    select: { budget: true, startDate: true, endDate: true },
  });

  const assignments = await prisma.projectAssignment.findMany({
    where: { projectId: req.params.id },
    include: {
      teamMember: {
        select: {
          id: true,
          name: true,
          role: true,
          hourlyRateInternal: true,
          hourlyRateBillable: true,
        },
      },
    },
  });

  // Actual logged hours per team member
  const timeGroups = await prisma.timeEntry.groupBy({
    by: ['teamMemberId', 'isBillable'],
    where: { projectId: req.params.id },
    _sum: { hours: true },
  });

  const contractors = await prisma.contractor.findMany({
    where: { projectId: req.params.id },
    select: { name: true, totalCost: true, status: true },
  });

  const memberCosts = assignments.map(a => {
    const billableHoursEntry = timeGroups.find(t => t.teamMemberId === a.teamMemberId && t.isBillable);
    const nonBillableHoursEntry = timeGroups.find(t => t.teamMemberId === a.teamMemberId && !t.isBillable);
    const actualHours = Number(billableHoursEntry?._sum.hours || 0) + Number(nonBillableHoursEntry?._sum.hours || 0);
    const estimatedHours = Number(a.estimatedHours || 0);
    const internalRate = Number(a.teamMember.hourlyRateInternal);
    const billableRate = Number(a.teamMember.hourlyRateBillable);

    return {
      assignmentId: a.id,
      teamMemberId: a.teamMember.id,
      name: a.teamMember.name,
      role: a.teamMember.role,
      allocationPct: Number(a.allocationPct),
      estimatedHours,
      actualHours,
      internalRate,
      billableRate,
      estimatedCost: estimatedHours * internalRate,
      actualCost: actualHours * internalRate,
      estimatedRevenue: estimatedHours * billableRate,
      actualRevenue: actualHours * billableRate,
    };
  });

  const totalEstimatedCost = memberCosts.reduce((s, m) => s + m.estimatedCost, 0);
  const totalActualCost = memberCosts.reduce((s, m) => s + m.actualCost, 0);
  const totalEstimatedRevenue = memberCosts.reduce((s, m) => s + m.estimatedRevenue, 0);
  const totalActualRevenue = memberCosts.reduce((s, m) => s + m.actualRevenue, 0);
  const contractorCost = contractors.reduce((s, c) => s + Number(c.totalCost), 0);
  const budget = Number(project.budget);

  const totalDirectCost = totalActualCost + contractorCost;
  const grossProfit = budget > 0 ? budget - totalDirectCost : totalActualRevenue - totalDirectCost;
  const margin = budget > 0 ? (grossProfit / budget) * 100 : totalActualRevenue > 0 ? (grossProfit / totalActualRevenue) * 100 : 0;

  res.json({
    budget,
    memberCosts,
    contractors: contractors.map(c => ({ name: c.name, cost: Number(c.totalCost), status: c.status })),
    totals: {
      estimatedLaborCost: totalEstimatedCost,
      actualLaborCost: totalActualCost,
      estimatedRevenue: totalEstimatedRevenue,
      actualRevenue: totalActualRevenue,
      contractorCost,
      totalDirectCost,
      grossProfit,
      margin,
    },
  });
});

export default router;
