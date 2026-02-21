import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

const router = Router();

router.get('/', async (_req, res) => {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  // Active projects with latest health status
  const activeProjects = await prisma.project.findMany({
    where: { status: { in: ['Active', 'OnHold'] } },
    include: {
      client: { select: { name: true } },
      healthUpdates: {
        orderBy: { updateDate: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Pipeline value
  const pipeline = await prisma.project.findMany({
    where: {
      status: 'Pipeline',
      dealStage: { not: 'Lost' },
    },
    select: {
      dealAmount: true,
      dealLikelihood: true,
      dealStage: true,
    },
  });

  const pipelineTotal = pipeline.reduce((sum, p) => sum + Number(p.dealAmount || 0), 0);
  const weightedPipeline = pipeline.reduce((sum, p) => {
    const weight = p.dealLikelihood === 'High' ? 0.8 : p.dealLikelihood === 'Medium' ? 0.5 : 0.2;
    return sum + Number(p.dealAmount || 0) * weight;
  }, 0);

  // Current month financials
  const monthFinancial = await prisma.monthlyFinancial.findFirst({
    where: { month: monthStart },
  });

  // Team utilization (current month)
  const timeEntries = await prisma.timeEntry.groupBy({
    by: ['teamMemberId'],
    where: {
      date: { gte: monthStart, lte: monthEnd },
    },
    _sum: { hours: true },
  });

  const activeTeamMembers = await prisma.teamMember.count({
    where: { isActive: true },
  });

  // Last harvest sync
  const lastSync = await prisma.harvestSync.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  // Projects needing attention (red/orange status)
  const alertProjects = activeProjects.filter(p => {
    const latest = p.healthUpdates[0];
    return latest && (latest.overallStatus === 'Red' || latest.overallStatus === 'Orange');
  });

  res.json({
    activeProjectsCount: activeProjects.filter(p => p.status === 'Active').length,
    alertProjectsCount: alertProjects.length,
    activeProjects: activeProjects.map(p => ({
      id: p.id,
      name: p.name,
      client: p.client.name,
      projectType: p.projectType,
      status: p.status,
      healthStatus: p.healthUpdates[0]?.overallStatus || null,
      budget: p.budget,
    })),
    pipeline: {
      total: pipelineTotal,
      weighted: weightedPipeline,
      count: pipeline.length,
    },
    financials: monthFinancial ? {
      revenue: monthFinancial.totalRevenue,
      costs: monthFinancial.directCosts,
      grossProfit: monthFinancial.grossProfit,
      grossMargin: monthFinancial.grossMargin,
      netProfit: monthFinancial.netProfit,
      netMargin: monthFinancial.netMargin,
    } : null,
    team: {
      activeCount: activeTeamMembers,
      memberUtilization: timeEntries.length,
    },
    lastHarvestSync: lastSync?.completedAt || null,
  });
});

export default router;
