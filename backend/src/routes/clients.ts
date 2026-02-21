import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const clients = await prisma.client.findMany({
    include: {
      _count: { select: { projects: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json(clients);
});

router.get('/:id', async (req, res) => {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: req.params.id },
    include: {
      projects: {
        include: {
          healthUpdates: { orderBy: { updateDate: 'desc' }, take: 1 },
        },
      },
      feedback: { orderBy: { sentDate: 'desc' } },
    },
  });
  res.json(client);
});

router.post('/', async (req, res) => {
  const client = await prisma.client.create({ data: req.body });
  res.status(201).json(client);
});

router.put('/:id', async (req, res) => {
  const client = await prisma.client.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(client);
});

router.delete('/:id', async (req, res) => {
  await prisma.client.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
