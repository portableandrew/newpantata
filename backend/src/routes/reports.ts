import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { startOfMonth, endOfMonth, format, subMonths, eachMonthOfInterval } from 'date-fns';

const router = Router();

// GET report readiness checklist
router.get('/readiness/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  // Check last project health updates
  const activeProjects = await prisma.project.findMany({
    where: { status: { in: ['Active', 'OnHold'] } },
    include: {
      healthUpdates: {
        orderBy: { updateDate: 'desc' },
        take: 1,
      },
    },
  });

  const projectsNeedingUpdate = activeProjects.filter(p => {
    if (!p.healthUpdates.length) return true;
    const daysSinceUpdate = Math.floor(
      (Date.now() - p.healthUpdates[0].updateDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceUpdate > 14;
  });

  // Check Harvest sync
  const lastSync = await prisma.harvestSync.findFirst({
    where: { status: 'completed' },
    orderBy: { completedAt: 'desc' },
  });

  const syncDaysAgo = lastSync?.completedAt
    ? Math.floor((Date.now() - lastSync.completedAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Check financials
  const financials = await prisma.monthlyFinancial.findUnique({
    where: { month: monthStart },
  });

  // Check client feedback
  const feedback = await prisma.clientFeedback.findMany({
    where: { sentDate: { gte: monthStart, lte: monthEnd } },
  });

  // Pipeline check
  const pipelineCount = await prisma.project.count({
    where: { status: 'Pipeline' },
  });

  res.json({
    items: [
      {
        key: 'project_health',
        label: 'Project health updates',
        ready: projectsNeedingUpdate.length === 0,
        detail: projectsNeedingUpdate.length > 0
          ? `${projectsNeedingUpdate.length} project(s) need updates`
          : 'All projects updated',
      },
      {
        key: 'feedback_from_last',
        label: 'Feedback from last report',
        ready: false,
        detail: 'Manual input required',
        manual: true,
      },
      {
        key: 'client_feedback',
        label: 'Client feedback imported',
        ready: feedback.length > 0,
        detail: feedback.length > 0 ? `${feedback.length} response(s)` : 'No feedback recorded',
      },
      {
        key: 'harvest_sync',
        label: 'Harvest sync current',
        ready: syncDaysAgo !== null && syncDaysAgo < 2,
        detail: syncDaysAgo !== null ? `Last sync: ${syncDaysAgo} day(s) ago` : 'Never synced',
      },
      {
        key: 'pl_data',
        label: 'P&L data confirmed',
        ready: financials !== null,
        detail: financials ? 'Financial data entered' : 'No financial data for this month',
      },
      {
        key: 'pipeline',
        label: 'Pipeline deals current',
        ready: pipelineCount > 0,
        detail: `${pipelineCount} active deal(s) in pipeline`,
      },
      {
        key: 'strategic_focus',
        label: 'Strategic focus areas',
        ready: false,
        detail: 'Manual input required',
        manual: true,
      },
    ],
  });
});

// POST generate monthly report
router.post('/generate/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  const { feedbackFromLastReport = [], strategicFocusAreas = [] } = req.body;

  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const reportMonth = format(date, 'MMMM yyyy');

  // --- Projects ---
  const activeProjects = await prisma.project.findMany({
    where: { status: { in: ['Active', 'OnHold'] } },
    include: {
      client: { select: { name: true } },
      healthUpdates: { orderBy: { updateDate: 'desc' }, take: 1 },
      financials: { orderBy: { month: 'desc' }, take: 1 },
    },
  });

  const mapStatus = (s: string) => {
    if (s === 'Green') return 'green';
    if (s === 'Orange') return 'orange';
    return 'red';
  };

  const projectData = (projects: typeof activeProjects) =>
    projects.map(p => ({
      name: p.name,
      client_name: p.client.name,
      status: p.healthUpdates[0]?.overallStatus
        ? (p.healthUpdates[0].overallStatus === 'Green' ? 'GRN' : p.healthUpdates[0].overallStatus === 'Orange' ? 'ORG' : 'RED')
        : 'N/A',
      overall: mapStatus(p.healthUpdates[0]?.overallStatus || 'Green'),
      schedule: mapStatus(p.healthUpdates[0]?.scheduleStatus || 'Green'),
      scope: mapStatus(p.healthUpdates[0]?.scopeStatus || 'Green'),
      budget_status: mapStatus(p.healthUpdates[0]?.budgetStatus || 'Green'),
      client_status: mapStatus(p.healthUpdates[0]?.clientStatus || 'Green'),
      budget_amount: p.budget,
      notes: p.healthUpdates[0]?.notes || '',
    }));

  const slas = activeProjects.filter(p => p.projectType === 'SLA');
  const active = activeProjects.filter(p => p.projectType !== 'SLA' && p.projectType !== 'RIInternal');
  const rAndI = activeProjects.filter(p => p.projectType === 'RIInternal');

  // --- Client Feedback ---
  const feedback = await prisma.clientFeedback.findMany({
    where: { sentDate: { gte: monthStart, lte: monthEnd } },
    include: { project: { select: { name: true } } },
    orderBy: { clientScore: 'desc' },
  });

  // --- Financials ---
  const monthFinancial = await prisma.monthlyFinancial.findUnique({
    where: { month: monthStart },
  });

  // Get quarterly data
  const now = new Date();
  const fyStart = now.getMonth() >= 6
    ? new Date(now.getFullYear(), 6, 1)
    : new Date(now.getFullYear() - 1, 6, 1);

  const allMonthlyFinancials = await prisma.monthlyFinancial.findMany({
    where: { month: { gte: fyStart } },
    orderBy: { month: 'asc' },
  });

  const quarterlyFinancials: Record<string, any> = {};
  allMonthlyFinancials.forEach(f => {
    const m = f.month.getMonth();
    // FY quarters: Q1=Jul-Sep, Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun
    const q = m >= 6 && m <= 8 ? 'Q1' : m >= 9 && m <= 11 ? 'Q2' : m >= 0 && m <= 2 ? 'Q3' : 'Q4';
    if (!quarterlyFinancials[q]) {
      quarterlyFinancials[q] = { invoiced: 0, totalRevenue: 0, directCosts: 0, grossProfit: 0, netProfit: 0, months: 0 };
    }
    quarterlyFinancials[q].invoiced += Number(f.invoiced);
    quarterlyFinancials[q].totalRevenue += Number(f.totalRevenue);
    quarterlyFinancials[q].directCosts += Number(f.directCosts);
    quarterlyFinancials[q].grossProfit += Number(f.grossProfit);
    quarterlyFinancials[q].netProfit += Number(f.netProfit);
    quarterlyFinancials[q].months++;
  });

  // --- Pipeline ---
  const pipeline = await prisma.project.findMany({
    where: { status: 'Pipeline' },
    include: { client: { select: { name: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  const recentWins = pipeline.filter(p => p.dealStage === 'Won');
  const recentLosses = pipeline.filter(p => p.dealStage === 'Lost');
  const disqualified = pipeline.filter(p => p.dealStage === 'Disqualified');
  const activePipeline = pipeline.filter(p => !['Won', 'Lost', 'Disqualified'].includes(p.dealStage || ''));
  const highlyLikely = activePipeline.filter(p => p.dealLikelihood === 'High');
  const submissions = activePipeline.filter(p => ['Proposal', 'Negotiation'].includes(p.dealStage || ''));

  // --- Utilization ---
  const timeEntries = await prisma.timeEntry.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
    include: {
      teamMember: { select: { id: true, name: true, role: true, weeklyHours: true } },
      project: { select: { projectType: true } },
    },
  });

  const members = await prisma.teamMember.findMany({ where: { isActive: true } });
  const workingDays = getWorkingDays(monthStart, monthEnd);

  const memberUtilization = members.map(m => {
    const memberEntries = timeEntries.filter(e => e.teamMember.id === m.id);
    const available = Number(m.weeklyHours) * (workingDays / 5);
    const billable = memberEntries.filter(e => e.isBillable).reduce((s, e) => s + Number(e.hours), 0);
    const rAndI = memberEntries.filter(e => e.project.projectType === 'RIInternal').reduce((s, e) => s + Number(e.hours), 0);

    return {
      name: m.name,
      role: m.role,
      available,
      billable,
      rAndI,
      billableUtil: available > 0 ? (billable / available) * 100 : 0,
    };
  });

  const roleGroups: Record<string, string[]> = {
    design: ['Designer'],
    ba_dev: ['BA', 'Developer'],
    production: ['Production'],
    principals: ['Principal'],
    leads: ['Lead'],
  };

  const targets: Record<string, number> = {
    design: 77.11,
    ba_dev: 72.89,
    production: 68.1,
    principals: 40.0,
    leads: 68.1,
  };

  const byRole: Record<string, any> = {};
  Object.entries(roleGroups).forEach(([key, roles]) => {
    const groupMembers = memberUtilization.filter(m => roles.includes(m.role));
    const totalBillable = groupMembers.reduce((s, m) => s + m.billable, 0);
    const totalAvailable = groupMembers.reduce((s, m) => s + m.available, 0);
    const actual = totalAvailable > 0 ? (totalBillable / totalAvailable) * 100 : 0;
    byRole[key] = {
      actual: Math.round(actual * 100) / 100,
      target: targets[key],
      variance: Math.round((actual - targets[key]) * 100) / 100,
      members: groupMembers.length,
    };
  });

  // --- Team ---
  const contractors = await prisma.contractor.findMany({
    where: { status: 'Active' },
    include: { project: { select: { name: true } } },
  });

  const timesheetData = members.map(m => {
    const entries = timeEntries.filter(e => e.teamMember.id === m.id);
    const actual = entries.reduce((s, e) => s + Number(e.hours), 0);
    const expected = Number(m.weeklyHours) * (workingDays / 5);
    return {
      name: m.name,
      role: m.role,
      actual: Math.round(actual * 10) / 10,
      expected: Math.round(expected * 10) / 10,
      variance: Math.round((actual - expected) * 10) / 10,
    };
  });

  // Build the report
  const report = {
    report_month: reportMonth,
    generated_at: new Date().toISOString(),
    feedback_from_last_report: feedbackFromLastReport,

    projects: {
      slas: projectData(slas),
      active: projectData(active),
      r_and_i: projectData(rAndI),
      summary: {
        total: activeProjects.length,
        green: activeProjects.filter(p => p.healthUpdates[0]?.overallStatus === 'Green').length,
        orange: activeProjects.filter(p => p.healthUpdates[0]?.overallStatus === 'Orange').length,
        red: activeProjects.filter(p => p.healthUpdates[0]?.overallStatus === 'Red').length,
      },
    },

    client_feedback: {
      scores: feedback.map(f => ({
        project: f.project.name,
        score: f.clientScore,
        happiness: f.happiness,
        confidence: f.confidence,
        collaboration: f.collaboration,
        respondent: f.respondentName,
        date: f.sentDate,
      })),
      quotes: feedback
        .filter(f => f.feedbackText)
        .map(f => ({ text: f.feedbackText, project: f.project.name })),
      average: feedback.length > 0
        ? Math.round(feedback.reduce((s, f) => s + Number(f.clientScore || 0), 0) / feedback.length * 10) / 10
        : null,
    },

    financials: {
      [format(date, 'MMMM').toLowerCase()]: monthFinancial ? {
        invoiced: Number(monthFinancial.invoiced),
        total_revenue: Number(monthFinancial.totalRevenue),
        direct_costs: Number(monthFinancial.directCosts),
        gross_profit: Number(monthFinancial.grossProfit),
        gross_margin: Number(monthFinancial.grossMargin),
        net_profit: Number(monthFinancial.netProfit),
        net_margin: Number(monthFinancial.netMargin),
        r_and_i_hours: Number(monthFinancial.rAndIHours),
      } : null,
      quarterly: quarterlyFinancials,
    },

    pipeline: {
      recent_submissions: submissions.map(p => ({
        client: p.client.name,
        name: p.name,
        amount: p.dealAmount,
        stage: p.dealStage,
        likelihood: p.dealLikelihood,
        expected_close: p.expectedCloseDate,
      })),
      highly_likely: highlyLikely.map(p => ({
        client: p.client.name,
        name: p.name,
        amount: p.dealAmount,
      })),
      recent_wins: recentWins.map(p => ({
        client: p.client.name,
        name: p.name,
        amount: p.dealAmount,
      })),
      recent_losses: recentLosses.map(p => ({
        client: p.client.name,
        name: p.name,
        amount: p.dealAmount,
      })),
      disqualified: disqualified.map(p => ({
        client: p.client.name,
        name: p.name,
      })),
      total_value: activePipeline.reduce((s, p) => s + Number(p.dealAmount || 0), 0),
      weighted_value: activePipeline.reduce((s, p) => {
        const w = p.dealLikelihood === 'High' ? 0.8 : p.dealLikelihood === 'Medium' ? 0.5 : 0.2;
        return s + Number(p.dealAmount || 0) * w;
      }, 0),
    },

    utilization: {
      by_role: byRole,
      by_person: memberUtilization.map(m => ({
        name: m.name,
        role: m.role,
        billable_util: Math.round(m.billableUtil * 10) / 10,
        billable_hours: Math.round(m.billable * 10) / 10,
        available_hours: Math.round(m.available * 10) / 10,
      })),
    },

    team: {
      contractors: contractors.map(c => ({
        name: c.name,
        project: c.project.name,
        cost: c.totalCost,
        status: c.status,
        end_date: c.endDate,
      })),
      tamsheek_completion: timesheetData,
      active_count: members.length,
    },

    strategic_focus_areas: strategicFocusAreas,
  };

  // Save snapshot
  await prisma.monthlySnapshot.upsert({
    where: { month: monthStart },
    update: {
      totalRevenue: monthFinancial?.totalRevenue || 0,
      totalCosts: monthFinancial?.directCosts || 0,
      grossProfit: monthFinancial?.grossProfit || 0,
      netProfit: monthFinancial?.netProfit || 0,
      netProfitMargin: monthFinancial?.netMargin || 0,
      teamCount: members.length,
      snapshotData: report as any,
    },
    create: {
      month: monthStart,
      totalRevenue: monthFinancial?.totalRevenue || 0,
      totalCosts: monthFinancial?.directCosts || 0,
      grossProfit: monthFinancial?.grossProfit || 0,
      netProfit: monthFinancial?.netProfit || 0,
      netProfitMargin: monthFinancial?.netMargin || 0,
      teamCount: members.length,
      snapshotData: report as any,
    },
  });

  res.json(report);
});

// GET historical snapshots
router.get('/snapshots', async (_req, res) => {
  const snapshots = await prisma.monthlySnapshot.findMany({
    orderBy: { month: 'desc' },
    select: {
      id: true,
      month: true,
      totalRevenue: true,
      grossProfit: true,
      netProfit: true,
      netProfitMargin: true,
      teamCount: true,
      createdAt: true,
    },
  });
  res.json(snapshots);
});

// GET specific snapshot
router.get('/snapshots/:id', async (req, res) => {
  const snapshot = await prisma.monthlySnapshot.findUniqueOrThrow({
    where: { id: req.params.id },
  });
  res.json(snapshot);
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
