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

export default router;
