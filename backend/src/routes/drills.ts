import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/drills
router.get('/', async (req, res) => {
  const { category, difficulty, search } = req.query;
  const drills = await prisma.drill.findMany({
    where: {
      ...(category ? { category: category as any } : {}),
      ...(difficulty ? { difficulty: difficulty as any } : {}),
      ...(search ? { name: { contains: search as string, mode: 'insensitive' } } : {}),
    },
    include: { _count: { select: { sessionDrills: true } } },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
  res.json(drills);
});

// GET /api/drills/:id
router.get('/:id', async (req, res) => {
  const drill = await prisma.drill.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      _count: { select: { sessionDrills: true } },
      sessionDrills: {
        include: {
          session: { select: { id: true, title: true, date: true } },
        },
        orderBy: { session: { date: 'desc' } },
        take: 10,
      },
    },
  });
  res.json(drill);
});

// POST /api/drills
router.post('/', async (req, res) => {
  const drill = await prisma.drill.create({ data: req.body });
  res.status(201).json(drill);
});

// PATCH /api/drills/:id
router.patch('/:id', async (req, res) => {
  const drill = await prisma.drill.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(drill);
});

// DELETE /api/drills/:id
router.delete('/:id', async (req, res) => {
  await prisma.drill.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
