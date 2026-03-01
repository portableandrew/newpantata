import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { subDays, startOfDay } from 'date-fns';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req, res) => {
  const now = new Date();
  const thirtyDaysAgo = subDays(startOfDay(now), 30);

  const [
    totalPlayers,
    activePlayers,
    totalDrills,
    upcomingSessions,
    recentSessions,
    recentStats,
  ] = await Promise.all([
    prisma.player.count(),
    prisma.player.count({ where: { isActive: true } }),
    prisma.drill.count(),
    prisma.trainingSession.findMany({
      where: { date: { gte: now } },
      include: {
        _count: { select: { attendances: true } },
        drills: { include: { drill: { select: { name: true, category: true } } }, orderBy: { orderIndex: 'asc' } },
      },
      orderBy: { date: 'asc' },
      take: 5,
    }),
    prisma.trainingSession.findMany({
      where: { date: { lt: now, gte: thirtyDaysAgo } },
      include: { _count: { select: { attendances: true } } },
      orderBy: { date: 'desc' },
      take: 5,
    }),
    prisma.playerStat.findMany({
      where: { statDate: { gte: thirtyDaysAgo } },
      include: { player: { select: { id: true, name: true, position: true } } },
      orderBy: { statDate: 'desc' },
      take: 20,
    }),
  ]);

  // Aggregate top performers (avg points last 30 days)
  const statsByPlayer = recentStats.reduce((acc: Record<string, any>, s: any) => {
    const key = s.playerId;
    if (!acc[key]) {
      acc[key] = { player: s.player, games: 0, points: 0, rebounds: 0, assists: 0 };
    }
    acc[key].games++;
    acc[key].points += s.points;
    acc[key].rebounds += s.rebounds;
    acc[key].assists += s.assists;
    return acc;
  }, {});

  const topPerformers = Object.values(statsByPlayer)
    .map((p: any) => ({
      player: p.player,
      avgPoints: +(p.points / p.games).toFixed(1),
      avgRebounds: +(p.rebounds / p.games).toFixed(1),
      avgAssists: +(p.assists / p.games).toFixed(1),
      games: p.games,
    }))
    .sort((a: any, b: any) => b.avgPoints - a.avgPoints)
    .slice(0, 5);

  const sessionsThisMonth = await prisma.trainingSession.count({
    where: { date: { gte: thirtyDaysAgo, lt: now } },
  });

  res.json({
    summary: {
      totalPlayers,
      activePlayers,
      totalDrills,
      sessionsThisMonth,
      upcomingCount: upcomingSessions.length,
    },
    upcomingSessions,
    recentSessions,
    topPerformers,
  });
});

export default router;
