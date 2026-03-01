import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/sessions
router.get('/', async (req, res) => {
  const { upcoming, type, limit } = req.query;
  const now = new Date();
  const sessions = await prisma.trainingSession.findMany({
    where: {
      ...(upcoming === 'true' ? { date: { gte: now } } : {}),
      ...(upcoming === 'false' ? { date: { lt: now } } : {}),
      ...(type ? { sessionType: type as any } : {}),
    },
    include: {
      drills: {
        include: { drill: { select: { id: true, name: true, category: true } } },
        orderBy: { orderIndex: 'asc' },
      },
      _count: { select: { attendances: true } },
    },
    orderBy: { date: upcoming === 'true' ? 'asc' : 'desc' },
    take: limit ? parseInt(limit as string) : 50,
  });
  res.json(sessions);
});

// GET /api/sessions/:id
router.get('/:id', async (req, res) => {
  const session = await prisma.trainingSession.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      drills: {
        include: { drill: true },
        orderBy: { orderIndex: 'asc' },
      },
      attendances: {
        include: { player: { select: { id: true, name: true, position: true, jerseyNumber: true } } },
      },
    },
  });
  res.json(session);
});

// POST /api/sessions
router.post('/', async (req, res) => {
  const { drills, playerIds, ...sessionData } = req.body;
  const session = await prisma.trainingSession.create({
    data: {
      ...sessionData,
      drills: drills?.length
        ? {
            create: drills.map((d: any, i: number) => ({
              drillId: d.drillId,
              orderIndex: i,
              sets: d.sets,
              reps: d.reps,
              durationMins: d.durationMins,
              notes: d.notes,
            })),
          }
        : undefined,
      attendances: playerIds?.length
        ? { create: playerIds.map((pid: string) => ({ playerId: pid })) }
        : undefined,
    },
    include: {
      drills: { include: { drill: true }, orderBy: { orderIndex: 'asc' } },
      attendances: { include: { player: true } },
    },
  });
  res.status(201).json(session);
});

// PATCH /api/sessions/:id
router.patch('/:id', async (req, res) => {
  const { drills, playerIds, ...sessionData } = req.body;
  const session = await prisma.trainingSession.update({
    where: { id: req.params.id },
    data: {
      ...sessionData,
      ...(drills !== undefined
        ? {
            drills: {
              deleteMany: {},
              create: drills.map((d: any, i: number) => ({
                drillId: d.drillId,
                orderIndex: i,
                sets: d.sets,
                reps: d.reps,
                durationMins: d.durationMins,
                notes: d.notes,
              })),
            },
          }
        : {}),
      ...(playerIds !== undefined
        ? {
            attendances: {
              deleteMany: {},
              create: playerIds.map((pid: string) => ({ playerId: pid })),
            },
          }
        : {}),
    },
    include: {
      drills: { include: { drill: true }, orderBy: { orderIndex: 'asc' } },
      attendances: { include: { player: true } },
    },
  });
  res.json(session);
});

// DELETE /api/sessions/:id
router.delete('/:id', async (req, res) => {
  await prisma.trainingSession.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// PATCH /api/sessions/:id/attendance/:playerId
router.patch('/:id/attendance/:playerId', async (req, res) => {
  const attendance = await prisma.sessionAttendance.update({
    where: {
      sessionId_playerId: {
        sessionId: req.params.id,
        playerId: req.params.playerId,
      },
    },
    data: { attended: req.body.attended },
  });
  res.json(attendance);
});

export default router;
