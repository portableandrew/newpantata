import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfYear } from 'date-fns';
import { Save, TrendingUp, TrendingDown } from 'lucide-react';
import api, { fmt } from '../lib/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { MonthlyFinancial } from '../types';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function FinancialRow({ label, value, sub, isTotal, isNegative, variant = 'default' }: {
  label: string;
  value: number;
  sub?: string;
  isTotal?: boolean;
  isNegative?: boolean;
  variant?: 'default' | 'profit' | 'cost';
}) {
  const isNeg = isNegative !== undefined ? isNegative : value < 0;
  return (
    <div className={`flex items-center justify-between py-2.5 px-4 ${isTotal ? 'bg-gray-50 font-semibold rounded-lg' : 'border-b border-gray-50'}`}>
      <div>
        <p className={`text-sm ${isTotal ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <p className={`text-sm font-${isTotal ? 'bold' : 'medium'} ${
        variant === 'profit' ? (isNeg ? 'text-red-600' : 'text-green-600') :
        variant === 'cost' ? 'text-gray-900' :
        'text-gray-900'
      }`}>
        {fmt.currency(value)}
      </p>
    </div>
  );
}

function MonthlyPnL({ year, month }: { year: number; month: number }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: financial, isLoading } = useQuery<MonthlyFinancial | null>({
    queryKey: ['financials-monthly', year, month],
    queryFn: () => api.get(`/financials/monthly/${year}/${month}`).then(r => r.data).catch(() => null),
  });

  const [form, setForm] = useState({
    invoiced: '',
    prepayments: '',
    internalRevenue: '',
    wagesCost: '',
    contractorsCost: '',
    travelCost: '',
    otherDirectCost: '',
    indirectCosts: '',
    rAndIHours: '',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: () => api.put(`/financials/monthly/${year}/${month}`, {
      invoiced: parseFloat(form.invoiced) || 0,
      prepayments: parseFloat(form.prepayments) || 0,
      internalRevenue: parseFloat(form.internalRevenue) || 0,
      wagesCost: parseFloat(form.wagesCost) || 0,
      contractorsCost: parseFloat(form.contractorsCost) || 0,
      travelCost: parseFloat(form.travelCost) || 0,
      otherDirectCost: parseFloat(form.otherDirectCost) || 0,
      indirectCosts: parseFloat(form.indirectCosts) || 0,
      rAndIHours: parseFloat(form.rAndIHours) || 0,
      notes: form.notes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financials-monthly', year, month] });
      setEditing(false);
    },
  });

  const startEdit = () => {
    if (financial) {
      setForm({
        invoiced: String(financial.invoiced),
        prepayments: String(financial.prepayments),
        internalRevenue: String(financial.internalRevenue),
        wagesCost: String(financial.wagesCost),
        contractorsCost: String(financial.contractorsCost),
        travelCost: String(financial.travelCost),
        otherDirectCost: String(financial.otherDirectCost),
        indirectCosts: String(financial.indirectCosts),
        rAndIHours: String(financial.rAndIHours),
        notes: financial.notes || '',
      });
    }
    setEditing(true);
  };

  if (isLoading) return <LoadingSpinner className="py-8" />;

  const monthLabel = MONTHS.find(m => m.value === month)?.label;

  if (editing) {
    const f = (name: keyof typeof form) => ({
      name,
      value: form[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(prev => ({ ...prev, [name]: e.target.value })),
    });

    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">{monthLabel} {year} — P&L</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Revenue</h3>
            <div className="space-y-2">
              <div><label className="label">Invoiced</label><input className="input" type="number" {...f('invoiced')} /></div>
              <div><label className="label">Prepayments</label><input className="input" type="number" {...f('prepayments')} /></div>
              <div><label className="label">Internal Revenue</label><input className="input" type="number" {...f('internalRevenue')} /></div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Direct Costs</h3>
            <div className="space-y-2">
              <div><label className="label">Wages</label><input className="input" type="number" {...f('wagesCost')} /></div>
              <div><label className="label">Contractors</label><input className="input" type="number" {...f('contractorsCost')} /></div>
              <div><label className="label">Travel</label><input className="input" type="number" {...f('travelCost')} /></div>
              <div><label className="label">Other Direct</label><input className="input" type="number" {...f('otherDirectCost')} /></div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Indirect & Other</h3>
            <div className="space-y-2">
              <div><label className="label">Indirect Costs</label><input className="input" type="number" {...f('indirectCosts')} /></div>
              <div><label className="label">R&I Hours Value</label><input className="input" type="number" {...f('rAndIHours')} /></div>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</h3>
            <textarea className="input h-28 resize-none" {...f('notes')} placeholder="Any notes for this month..." />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="btn-primary flex items-center gap-2">
            <Save size={14} />
            {mutation.isPending ? 'Saving…' : 'Save P&L'}
          </button>
        </div>
      </div>
    );
  }

  if (!financial) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">{monthLabel} {year} — P&L</h2>
          <button onClick={startEdit} className="btn-primary">Enter Data</button>
        </div>
        <p className="text-sm text-gray-400 text-center py-8">No financial data entered for this month.</p>
      </div>
    );
  }

  const ri = Number(financial.rAndIHours);
  const netInclRI = Number(financial.netProfit) + ri;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">{monthLabel} {year} — P&L</h2>
        <button onClick={startEdit} className="btn-secondary text-xs">Edit</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-4">Revenue</h3>
          <FinancialRow label="Invoiced" value={Number(financial.invoiced)} />
          <FinancialRow label="Prepayments" value={Number(financial.prepayments)} />
          <FinancialRow label="Internal Revenue" value={Number(financial.internalRevenue)} />
          <FinancialRow label="Total Revenue" value={Number(financial.totalRevenue)} isTotal />

          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-4 mt-4">Direct Costs</h3>
          <FinancialRow label="Wages" value={Number(financial.wagesCost)} />
          <FinancialRow label="Contractors" value={Number(financial.contractorsCost)} />
          <FinancialRow label="Travel" value={Number(financial.travelCost)} />
          <FinancialRow label="Other Direct" value={Number(financial.otherDirectCost)} />
          <FinancialRow label="Total Direct Costs" value={Number(financial.directCosts)} isTotal />
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-4">Profitability</h3>
          <FinancialRow
            label="Gross Profit"
            value={Number(financial.grossProfit)}
            sub={fmt.percent(Number(financial.grossMargin)) + ' margin'}
            isTotal
            variant="profit"
          />
          <FinancialRow label="Indirect Costs" value={Number(financial.indirectCosts)} />
          <FinancialRow
            label="Net Profit"
            value={Number(financial.netProfit)}
            sub={fmt.percent(Number(financial.netMargin)) + ' margin'}
            isTotal
            variant="profit"
          />
          {ri > 0 && (
            <FinancialRow
              label="Net Profit (incl. R&I)"
              value={netInclRI}
              sub="Adjusted for R&I investment"
              variant="profit"
            />
          )}

          {/* Summary metrics */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg ${Number(financial.grossMargin) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-xs text-gray-500">Gross Margin</p>
              <div className="flex items-center gap-1 mt-1">
                {Number(financial.grossMargin) >= 0
                  ? <TrendingUp size={14} className="text-green-600" />
                  : <TrendingDown size={14} className="text-red-600" />}
                <p className={`text-lg font-bold ${Number(financial.grossMargin) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {fmt.percent(Number(financial.grossMargin))}
                </p>
              </div>
            </div>
            <div className={`p-3 rounded-lg ${Number(financial.netMargin) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-xs text-gray-500">Net Margin</p>
              <div className="flex items-center gap-1 mt-1">
                {Number(financial.netMargin) >= 0
                  ? <TrendingUp size={14} className="text-green-600" />
                  : <TrendingDown size={14} className="text-red-600" />}
                <p className={`text-lg font-bold ${Number(financial.netMargin) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {fmt.percent(Number(financial.netMargin))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {financial.notes && (
        <div className="mt-4 bg-gray-50 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-700">{financial.notes}</p>
        </div>
      )}
    </div>
  );
}

interface QuarterlySummary {
  quarter: string;
  totalRevenue: number;
  directCosts: number;
  grossProfit: number;
  netProfit: number;
  months: number;
}

export default function Financials() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const { data: quarterly } = useQuery<QuarterlySummary[]>({
    queryKey: ['financials-quarterly', year],
    queryFn: () => api.get(`/financials/quarterly/${year}`).then(r => r.data),
  });

  const { data: targets } = useQuery({
    queryKey: ['quarterly-targets'],
    queryFn: () => api.get('/financials/targets').then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
        <div className="flex items-center gap-3">
          <select className="input w-auto" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex gap-2 flex-wrap">
        {MONTHS.map(m => (
          <button
            key={m.value}
            onClick={() => setSelectedMonth(m.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedMonth === m.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {m.label.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Monthly P&L */}
      <MonthlyPnL year={year} month={selectedMonth} />

      {/* Quarterly Summary */}
      {quarterly && quarterly.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Quarterly Summary {year}</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th pl-0">Quarter</th>
                  <th className="table-th text-right">Revenue</th>
                  <th className="table-th text-right">Direct Costs</th>
                  <th className="table-th text-right">Gross Profit</th>
                  <th className="table-th text-right">Net Profit</th>
                  <th className="table-th text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {quarterly.map(q => {
                  const margin = q.totalRevenue > 0 ? (q.netProfit / q.totalRevenue) * 100 : 0;
                  return (
                    <tr key={q.quarter} className="hover:bg-gray-50">
                      <td className="table-td pl-0 font-semibold">{q.quarter}</td>
                      <td className="table-td text-right">{fmt.currency(q.totalRevenue)}</td>
                      <td className="table-td text-right">{fmt.currency(q.directCosts)}</td>
                      <td className={`table-td text-right font-medium ${q.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt.currency(q.grossProfit)}
                      </td>
                      <td className={`table-td text-right font-medium ${q.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt.currency(q.netProfit)}
                      </td>
                      <td className={`table-td text-right font-medium ${margin >= 7.5 ? 'text-green-600' : 'text-amber-600'}`}>
                        {fmt.percent(margin)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
