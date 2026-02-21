import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET pipeline deals (projects in pipeline status)
router.get('/', async (_req, res) => {
  const deals = await prisma.project.findMany({
    where: { status: 'Pipeline' },
    include: {
      client: { select: { id: true, name: true } },
    },
    orderBy: { expectedCloseDate: 'asc' },
  });
  res.json(deals);
});

// GET deals by stage (for kanban)
router.get('/kanban', async (_req, res) => {
  const deals = await prisma.project.findMany({
    where: { status: 'Pipeline' },
    include: {
      client: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost', 'Disqualified'];
  const kanban: Record<string, any[]> = {};

  stages.forEach(stage => {
    kanban[stage] = deals.filter(d => d.dealStage === stage);
  });

  res.json(kanban);
});

// PATCH move deal stage
router.patch('/:id/stage', async (req, res) => {
  const { dealStage } = req.body;
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { dealStage },
    include: { client: { select: { id: true, name: true } } },
  });
  res.json(project);
});

// GET pipeline summary stats
router.get('/stats', async (_req, res) => {
  const deals = await prisma.project.findMany({
    where: { status: 'Pipeline' },
    select: {
      dealStage: true,
      dealAmount: true,
      dealLikelihood: true,
    },
  });

  const totalValue = deals.reduce((s, d) => s + Number(d.dealAmount || 0), 0);
  const weightedValue = deals.reduce((s, d) => {
    const w = d.dealLikelihood === 'High' ? 0.8 : d.dealLikelihood === 'Medium' ? 0.5 : 0.2;
    return s + Number(d.dealAmount || 0) * w;
  }, 0);

  const byStage = deals.reduce((acc: Record<string, any>, d) => {
    const stage = d.dealStage || 'Unknown';
    if (!acc[stage]) acc[stage] = { count: 0, value: 0 };
    acc[stage].count++;
    acc[stage].value += Number(d.dealAmount || 0);
    return acc;
  }, {});

  res.json({ totalValue, weightedValue, count: deals.length, byStage });
});

// Recent wins and losses
router.get('/recent-outcomes', async (_req, res) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 90);

  const outcomes = await prisma.project.findMany({
    where: {
      dealStage: { in: ['Won', 'Lost', 'Disqualified'] },
      updatedAt: { gte: thirtyDaysAgo },
    },
    include: {
      client: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({
    won: outcomes.filter(o => o.dealStage === 'Won'),
    lost: outcomes.filter(o => o.dealStage === 'Lost'),
    disqualified: outcomes.filter(o => o.dealStage === 'Disqualified'),
  });
});

export default router;
