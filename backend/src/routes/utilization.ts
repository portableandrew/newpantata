import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

const router = Router();

// GET utilization for a month, by team member
router.get('/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  const members = await prisma.teamMember.findMany({
    where: { isActive: true },
    include: {
      timeEntries: {
        where: { date: { gte: monthStart, lte: monthEnd } },
        select: { hours: true, isBillable: true, project: { select: { projectType: true } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Working days (approximate: weekdays in month)
  const workingDays = getWorkingDays(monthStart, monthEnd);

  const result = members.map(m => {
    const availableHours = Number(m.weeklyHours) * (workingDays / 5);
    const billableHours = m.timeEntries
      .filter(e => e.isBillable)
      .reduce((s, e) => s + Number(e.hours), 0);
    const rAndIHours = m.timeEntries
      .filter(e => e.project.projectType === 'RIInternal')
      .reduce((s, e) => s + Number(e.hours), 0);
    const totalHours = m.timeEntries.reduce((s, e) => s + Number(e.hours), 0);

    return {
      id: m.id,
      name: m.name,
      role: m.role,
      availableHours,
      billableHours,
      rAndIHours,
      totalHours,
      billableUtilization: availableHours > 0 ? (billableHours / availableHours) * 100 : 0,
      productiveUtilization: availableHours > 0 ? ((billableHours + rAndIHours) / availableHours) * 100 : 0,
    };
  });

  // Group by role
  const byRole: Record<string, any> = {};
  const roleGroups: Record<string, string[]> = {
    design: ['Designer'],
    ba_dev: ['BA', 'Developer'],
    production: ['Production'],
    principals: ['Principal'],
    leads: ['Lead'],
  };

  Object.entries(roleGroups).forEach(([groupKey, roles]) => {
    const groupMembers = result.filter(m => roles.includes(m.role));
    const totalBillable = groupMembers.reduce((s, m) => s + m.billableHours, 0);
    const totalAvailable = groupMembers.reduce((s, m) => s + m.availableHours, 0);
    byRole[groupKey] = {
      members: groupMembers,
      totalBillable,
      totalAvailable,
      utilization: totalAvailable > 0 ? (totalBillable / totalAvailable) * 100 : 0,
    };
  });

  res.json({ byPerson: result, byRole });
});

// GET utilization history (last 13 months)
router.get('/history', async (_req, res) => {
  const now = new Date();
  const months = eachMonthOfInterval({
    start: subMonths(now, 12),
    end: now,
  });

  const history = await Promise.all(
    months.map(async (monthStart) => {
      const monthEnd = endOfMonth(monthStart);

      const entries = await prisma.timeEntry.groupBy({
        by: ['isBillable'],
        where: { date: { gte: monthStart, lte: monthEnd } },
        _sum: { hours: true },
      });

      const billable = entries.find(e => e.isBillable)?._sum.hours || 0;
      const nonBillable = entries.find(e => !e.isBillable)?._sum.hours || 0;

      const memberCount = await prisma.teamMember.count({ where: { isActive: true } });
      const workingDays = getWorkingDays(monthStart, monthEnd);
      const avgWeeklyHours = 38; // approximate
      const totalAvailable = memberCount * avgWeeklyHours * (workingDays / 5);

      return {
        month: monthStart.toISOString().slice(0, 7),
        billableHours: Number(billable),
        nonBillableHours: Number(nonBillable),
        totalAvailable,
        utilization: totalAvailable > 0 ? (Number(billable) / totalAvailable) * 100 : 0,
      };
    })
  );

  res.json(history);
});

function getWorkingDays(start: Date, end: Date): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export default router;
