import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';

const router = Router();

router.get('/', async (req, res) => {
  const { active, role } = req.query;

  const members = await prisma.teamMember.findMany({
    where: {
      ...(active !== undefined ? { isActive: active === 'true' } : {}),
      ...(role ? { role: role as any } : {}),
    },
    include: {
      manager: { select: { id: true, name: true } },
      _count: { select: { reports: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(members);
});

router.get('/:id', async (req, res) => {
  const member = await prisma.teamMember.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      manager: { select: { id: true, name: true } },
      reports: { select: { id: true, name: true, role: true } },
    },
  });
  res.json(member);
});

router.post('/', async (req, res) => {
  const member = await prisma.teamMember.create({ data: req.body });
  res.status(201).json(member);
});

router.put('/:id', async (req, res) => {
  const member = await prisma.teamMember.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(member);
});

router.delete('/:id', async (req, res) => {
  await prisma.teamMember.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.status(204).send();
});

// GET timesheet completion for a month
router.get('/timesheet/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  const members = await prisma.teamMember.findMany({
    where: { isActive: true },
    include: {
      timeEntries: {
        where: { date: { gte: monthStart, lte: monthEnd } },
        select: { hours: true, isBillable: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Calculate working days in month (rough: 22 days)
  const workingDays = 22;

  const result = members.map(m => {
    const totalHours = m.timeEntries.reduce((sum, e) => sum + Number(e.hours), 0);
    const expectedHours = Number(m.weeklyHours) * (workingDays / 5);
    const billableHours = m.timeEntries
      .filter(e => e.isBillable)
      .reduce((sum, e) => sum + Number(e.hours), 0);

    return {
      id: m.id,
      name: m.name,
      role: m.role,
      actualHours: totalHours,
      expectedHours: expectedHours,
      variance: totalHours - expectedHours,
      billableHours,
      billableUtilization: expectedHours > 0 ? (billableHours / expectedHours) * 100 : 0,
    };
  });

  res.json(result);
});

export default router;
