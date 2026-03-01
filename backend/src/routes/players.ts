import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/players
router.get('/', async (req, res) => {
  const { active, position, group } = req.query;
  const players = await prisma.player.findMany({
    where: {
      ...(active !== undefined ? { isActive: active === 'true' } : {}),
      ...(position ? { position: position as any } : {}),
      ...(group ? { teamGroup: group as string } : {}),
    },
    include: {
      _count: { select: { stats: true, attendances: true } },
      stats: {
        orderBy: { statDate: 'desc' },
        take: 5,
      },
    },
    orderBy: [{ teamGroup: 'asc' }, { name: 'asc' }],
  });
  res.json(players);
});

// GET /api/players/:id
router.get('/:id', async (req, res) => {
  const player = await prisma.player.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      stats: {
        orderBy: { statDate: 'desc' },
        take: 20,
      },
      attendances: {
        include: {
          session: { select: { id: true, title: true, date: true, sessionType: true } },
        },
        orderBy: { session: { date: 'desc' } },
        take: 10,
      },
    },
  });
  res.json(player);
});

// POST /api/players
router.post('/', async (req, res) => {
  const player = await prisma.player.create({ data: req.body });
  res.status(201).json(player);
});

// PATCH /api/players/:id
router.patch('/:id', async (req, res) => {
  const player = await prisma.player.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(player);
});

// DELETE /api/players/:id
router.delete('/:id', async (req, res) => {
  await prisma.player.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// GET /api/players/:id/stats
router.get('/:id/stats', async (req, res) => {
  const stats = await prisma.playerStat.findMany({
    where: { playerId: req.params.id },
    orderBy: { statDate: 'desc' },
    take: 30,
  });
  res.json(stats);
});

// POST /api/players/:id/stats
router.post('/:id/stats', async (req, res) => {
  const stat = await prisma.playerStat.create({
    data: { ...req.body, playerId: req.params.id },
  });
  res.status(201).json(stat);
});

export default router;
