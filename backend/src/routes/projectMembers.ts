import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router({ mergeParams: true });

// GET /api/projects/:id/members
router.get('/', async (req, res) => {
  const { id: projectId } = req.params;

  const members = await prisma.projectMember.findMany({
    where: { projectId },
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
    orderBy: { createdAt: 'asc' },
  });

  const timeData = await prisma.timeEntry.groupBy({
    by: ['teamMemberId'],
    where: { projectId },
    _sum: { hours: true },
  });

  const result = members.map(m => {
    const logged = timeData.find(t => t.teamMemberId === m.teamMemberId);
    const loggedHours = Number(logged?._sum.hours ?? 0);
    const allocatedHours = Number(m.allocatedHours);
    const remainingHours = allocatedHours - loggedHours;
    const pctUtilised = allocatedHours > 0 ? (loggedHours / allocatedHours) * 100 : 0;
    const costToDate = loggedHours * Number(m.teamMember.hourlyRateInternal);

    return {
      id: m.id,
      projectId: m.projectId,
      teamMemberId: m.teamMemberId,
      teamMember: m.teamMember,
      allocatedHours,
      loggedHours,
      remainingHours,
      pctUtilised,
      costToDate,
      updatedAt: m.updatedAt,
    };
  });

  res.json(result);
});

// POST /api/projects/:id/members
router.post('/', async (req, res) => {
  const { id: projectId } = req.params;
  const { teamMemberId, allocatedHours } = req.body;

  if (!teamMemberId) {
    res.status(400).json({ error: 'teamMemberId required' });
    return;
  }

  const member = await prisma.projectMember.upsert({
    where: { projectId_teamMemberId: { projectId, teamMemberId } },
    update: { allocatedHours: allocatedHours ?? 0 },
    create: { projectId, teamMemberId, allocatedHours: allocatedHours ?? 0 },
    include: {
      teamMember: {
        select: { id: true, name: true, role: true, hourlyRateInternal: true },
      },
    },
  });

  res.status(201).json(member);
});

// PATCH /api/projects/:id/members/:memberId
router.patch('/:memberId', async (req, res) => {
  const { memberId } = req.params;
  const { allocatedHours } = req.body;

  const member = await prisma.projectMember.update({
    where: { id: memberId },
    data: { allocatedHours },
    include: {
      teamMember: {
        select: { id: true, name: true, role: true, hourlyRateInternal: true },
      },
    },
  });

  res.json(member);
});

// DELETE /api/projects/:id/members/:memberId
router.delete('/:memberId', async (req, res) => {
  await prisma.projectMember.delete({ where: { id: req.params.memberId } });
  res.status(204).send();
});

export default router;
