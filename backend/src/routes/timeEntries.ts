import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET /api/time-entries
router.get('/', async (req, res) => {
  const { projectId, teamMemberId, from, to, limit } = req.query;

  const entries = await prisma.timeEntry.findMany({
    where: {
      ...(projectId ? { projectId: projectId as string } : {}),
      ...(teamMemberId ? { teamMemberId: teamMemberId as string } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from as string) } : {}),
              ...(to ? { lte: new Date(to as string) } : {}),
            },
          }
        : {}),
    },
    include: {
      teamMember: { select: { id: true, name: true, role: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
    take: limit ? parseInt(limit as string) : 200,
  });

  res.json(entries);
});

// POST /api/time-entries
router.post('/', async (req, res) => {
  const { teamMemberId, projectId, date, hours, isBillable, taskCategory, notes } = req.body;

  if (!teamMemberId || !projectId || !date || !hours) {
    res.status(400).json({ error: 'teamMemberId, projectId, date, hours required' });
    return;
  }

  const entry = await prisma.timeEntry.create({
    data: {
      teamMemberId,
      projectId,
      date: new Date(date),
      hours,
      isBillable: isBillable ?? true,
      taskCategory: taskCategory || null,
      notes: notes || null,
    },
    include: {
      teamMember: { select: { id: true, name: true, role: true } },
      project: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(entry);
});

// PUT /api/time-entries/:id
router.put('/:id', async (req, res) => {
  const { date, hours, isBillable, taskCategory, notes } = req.body;

  const entry = await prisma.timeEntry.update({
    where: { id: req.params.id },
    data: {
      ...(date ? { date: new Date(date) } : {}),
      ...(hours !== undefined ? { hours } : {}),
      ...(isBillable !== undefined ? { isBillable } : {}),
      ...(taskCategory !== undefined ? { taskCategory } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
    include: {
      teamMember: { select: { id: true, name: true, role: true } },
      project: { select: { id: true, name: true } },
    },
  });

  res.json(entry);
});

// DELETE /api/time-entries/:id
router.delete('/:id', async (req, res) => {
  const entry = await prisma.timeEntry.findUniqueOrThrow({ where: { id: req.params.id } });
  if (entry.harvestEntryId) {
    res.status(400).json({ error: 'Cannot delete Harvest-synced entries' });
    return;
  }
  await prisma.timeEntry.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
