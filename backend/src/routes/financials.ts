import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// GET monthly financials
router.get('/monthly', async (req, res) => {
  const { year } = req.query;
  const financials = await prisma.monthlyFinancial.findMany({
    where: year ? {
      month: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${parseInt(year as string) + 1}-01-01`),
      },
    } : {},
    orderBy: { month: 'desc' },
  });
  res.json(financials);
});

// GET single month
router.get('/monthly/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);

  const financial = await prisma.monthlyFinancial.findUnique({
    where: { month: date },
  });

  res.json(financial);
});

// POST/PUT monthly financial data
router.put('/monthly/:year/:month', async (req, res) => {
  const { year, month } = req.params;
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);

  const data = req.body;

  // Auto-calculate derived fields
  const directCosts = (Number(data.wagesCost) || 0) + (Number(data.contractorsCost) || 0) +
    (Number(data.travelCost) || 0) + (Number(data.otherDirectCost) || 0);

  const totalRevenue = (Number(data.invoiced) || 0) + (Number(data.prepayments) || 0) +
    (Number(data.internalRevenue) || 0);

  const grossProfit = totalRevenue - directCosts;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const netProfit = grossProfit - (Number(data.indirectCosts) || 0);
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const financial = await prisma.monthlyFinancial.upsert({
    where: { month: date },
    update: {
      ...data,
      totalRevenue,
      directCosts,
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,
    },
    create: {
      month: date,
      ...data,
      totalRevenue,
      directCosts,
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,
    },
  });

  res.json(financial);
});

// GET quarterly targets
router.get('/targets', async (_req, res) => {
  const targets = await prisma.quarterlyTarget.findMany({
    orderBy: { startDate: 'desc' },
  });
  res.json(targets);
});

router.post('/targets', async (req, res) => {
  const target = await prisma.quarterlyTarget.create({ data: req.body });
  res.status(201).json(target);
});

router.put('/targets/:id', async (req, res) => {
  const target = await prisma.quarterlyTarget.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(target);
});

// GET quarterly summary
router.get('/quarterly/:year', async (req, res) => {
  const year = parseInt(req.params.year);

  const financials = await prisma.monthlyFinancial.findMany({
    where: {
      month: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
    orderBy: { month: 'asc' },
  });

  // Group by quarter
  const quarters: Record<string, any> = { Q1: [], Q2: [], Q3: [], Q4: [] };
  financials.forEach(f => {
    const m = f.month.getMonth() + 1;
    const q = m <= 3 ? 'Q1' : m <= 6 ? 'Q2' : m <= 9 ? 'Q3' : 'Q4';
    quarters[q].push(f);
  });

  const summary = Object.entries(quarters).map(([quarter, months]) => ({
    quarter,
    totalRevenue: months.reduce((s: number, m: any) => s + Number(m.totalRevenue), 0),
    directCosts: months.reduce((s: number, m: any) => s + Number(m.directCosts), 0),
    grossProfit: months.reduce((s: number, m: any) => s + Number(m.grossProfit), 0),
    netProfit: months.reduce((s: number, m: any) => s + Number(m.netProfit), 0),
    months: months.length,
  }));

  res.json(summary);
});

export default router;
