import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Copy,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';
import api, { fmt } from '../lib/api';
import RagBadge from '../components/ui/RagBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface ReadinessItem {
  key: string;
  label: string;
  ready: boolean;
  detail: string;
  manual?: boolean;
}

interface ReportReadiness {
  items: ReadinessItem[];
}

interface Snapshot {
  id: string;
  month: string;
  totalRevenue: number;
  grossProfit: number;
  netProfit: number;
  netProfitMargin: number;
  teamCount: number;
  createdAt: string;
}

function ReadinessChecklist({ items }: { items: ReadinessItem[] }) {
  const ready = items.filter(i => i.ready).length;
  const total = items.length;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Report Readiness</h2>
        <span className={`text-sm font-medium ${ready === total ? 'text-green-600' : 'text-amber-600'}`}>
          {ready}/{total} ready
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full mb-4">
        <div
          className={`h-2 rounded-full transition-all ${ready === total ? 'bg-green-500' : 'bg-amber-400'}`}
          style={{ width: `${(ready / total) * 100}%` }}
        />
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.key} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-50">
            {item.ready ? (
              <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
            ) : item.manual ? (
              <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            ) : (
              <XCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportOutput({ report }: { report: any }) {
  const [format_type, setFormatType] = useState<'json' | 'markdown'>('json');
  const [copied, setCopied] = useState(false);

  const getMarkdown = () => {
    const r = report;
    const lines: string[] = [];
    lines.push(`# Monthly Report — ${r.report_month}`);
    lines.push(`*Generated: ${new Date(r.generated_at).toLocaleString('en-AU')}*\n`);

    lines.push('## Projects\n');
    lines.push(`| Project | Status | Schedule | Budget | Client |`);
    lines.push(`|---------|--------|----------|--------|--------|`);
    [...(r.projects.slas || []), ...(r.projects.active || [])].forEach((p: any) => {
      lines.push(`| ${p.name} | ${p.status} | ${p.schedule} | ${p.budget} | ${p.client_status || p.client} |`);
    });

    if (r.financials) {
      lines.push('\n## Financials\n');
      const monthKey = Object.keys(r.financials).find(k => k !== 'quarterly');
      if (monthKey && r.financials[monthKey]) {
        const f = r.financials[monthKey];
        lines.push(`- **Total Revenue:** ${fmt.currency(f.total_revenue)}`);
        lines.push(`- **Gross Profit:** ${fmt.currency(f.gross_profit)} (${f.gross_margin?.toFixed(1)}%)`);
        lines.push(`- **Net Profit:** ${fmt.currency(f.net_profit)} (${f.net_margin?.toFixed(1)}%)`);
      }
    }

    lines.push('\n## Utilization\n');
    if (r.utilization?.by_role) {
      Object.entries(r.utilization.by_role).forEach(([role, data]: [string, any]) => {
        const variance = data.variance >= 0 ? `+${data.variance}` : `${data.variance}`;
        lines.push(`- **${role}:** ${data.actual}% (target ${data.target}%, variance ${variance}%)`);
      });
    }

    lines.push('\n## Pipeline\n');
    if (r.pipeline) {
      lines.push(`- **Total Value:** ${fmt.currency(r.pipeline.total_value)}`);
      lines.push(`- **Weighted Value:** ${fmt.currency(r.pipeline.weighted_value)}`);
    }

    lines.push('\n## Team\n');
    if (r.team) {
      lines.push(`- **Active Members:** ${r.team.active_count}`);
      if (r.team.contractors?.length > 0) {
        lines.push(`- **Active Contractors:** ${r.team.contractors.length}`);
      }
    }

    return lines.join('\n');
  };

  const content = format_type === 'json' ? JSON.stringify(report, null, 2) : getMarkdown();

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: format_type === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paradise-report-${r.report_month?.toLowerCase().replace(' ', '-')}.${format_type === 'json' ? 'json' : 'md'}`;
    a.click();
  };

  const r = report;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <p className="label">Projects</p>
          <p className="text-2xl font-bold text-gray-900">{r.projects?.summary?.total || 0}</p>
          <div className="flex justify-center gap-2 mt-1">
            <span className="text-xs text-green-600">{r.projects?.summary?.green || 0} green</span>
            <span className="text-xs text-amber-600">{r.projects?.summary?.orange || 0} amber</span>
            <span className="text-xs text-red-600">{r.projects?.summary?.red || 0} red</span>
          </div>
        </div>
        {r.financials && (() => {
          const monthKey = Object.keys(r.financials).find(k => k !== 'quarterly');
          const f = monthKey ? r.financials[monthKey] : null;
          return f ? (
            <>
              <div className="card text-center">
                <p className="label">Revenue</p>
                <p className="text-xl font-bold text-gray-900">{fmt.currency(f.total_revenue)}</p>
              </div>
              <div className={`card text-center ${f.gross_profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="label">Gross Profit</p>
                <p className={`text-xl font-bold ${f.gross_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt.currency(f.gross_profit)}</p>
                <p className="text-xs mt-0.5 text-gray-500">{f.gross_margin?.toFixed(1)}%</p>
              </div>
              <div className={`card text-center ${f.net_profit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <p className="label">Net Profit</p>
                <p className={`text-xl font-bold ${f.net_profit >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt.currency(f.net_profit)}</p>
                <p className="text-xs mt-0.5 text-gray-500">{f.net_margin?.toFixed(1)}%</p>
              </div>
            </>
          ) : <div className="col-span-3 card flex items-center justify-center"><p className="text-sm text-gray-400">No financial data</p></div>;
        })()}
      </div>

      {/* Projects health */}
      {r.projects && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Project Health</h3>
          {[
            { title: 'SLAs', items: r.projects.slas },
            { title: 'Active Projects', items: r.projects.active },
            { title: 'R&I', items: r.projects.r_and_i },
          ].map(({ title, items }) => items?.length > 0 && (
            <div key={title} className="mb-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">{title}</h4>
              <div className="space-y-1">
                {items.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50">
                    <RagBadge status={p.overall === 'green' ? 'Green' : p.overall === 'orange' ? 'Orange' : 'Red'} size="sm" />
                    <span className="text-sm text-gray-900 flex-1">{p.name}</span>
                    {p.notes && <span className="text-xs text-gray-400 max-w-xs truncate">{p.notes}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Utilization */}
      {r.utilization?.by_role && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Utilization by Role</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(r.utilization.by_role).map(([role, data]: [string, any]) => (
              <div key={role} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-500 capitalize">{role.replace('_', ' ')}</p>
                <p className={`text-xl font-bold mt-1 ${data.actual >= data.target ? 'text-green-600' : 'text-red-500'}`}>
                  {data.actual?.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">Target: {data.target}%</p>
                <p className={`text-xs font-medium ${data.variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {data.variance >= 0 ? '+' : ''}{data.variance?.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Client feedback */}
      {r.client_feedback?.scores?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Client Feedback</h3>
          {r.client_feedback.average && (
            <div className="text-3xl font-bold text-indigo-600 mb-4">{r.client_feedback.average}<span className="text-lg text-gray-400">/10</span></div>
          )}
          <div className="space-y-2">
            {r.client_feedback.scores.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50">
                <span className="text-sm font-medium text-gray-900 flex-1">{s.project}</span>
                <span className="text-sm font-bold text-indigo-600">{Number(s.score).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export section */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Export Report</h3>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button onClick={() => setFormatType('json')} className={`px-3 py-1 rounded text-sm font-medium ${format_type === 'json' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>JSON</button>
            <button onClick={() => setFormatType('markdown')} className={`px-3 py-1 rounded text-sm font-medium ${format_type === 'markdown' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>Markdown</button>
          </div>
        </div>
        <div className="flex gap-3 mb-3">
          <button onClick={handleCopy} className="btn-secondary flex items-center gap-2">
            <Copy size={14} />
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button onClick={handleDownload} className="btn-primary flex items-center gap-2">
            <Download size={14} />
            Download {format_type === 'json' ? 'JSON' : 'Markdown'}
          </button>
        </div>
        <pre className="bg-gray-50 rounded-lg p-4 text-xs overflow-auto max-h-64 text-gray-600">
          {content.slice(0, 2000)}{content.length > 2000 ? '\n\n... (truncated)' : ''}
        </pre>
      </div>
    </div>
  );
}

export default function Reports() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(format(now, 'yyyy-MM'));
  const [feedbackItems, setFeedbackItems] = useState<string[]>(['']);
  const [strategicItems, setStrategicItems] = useState<string[]>(['']);
  const [report, setReport] = useState<any>(null);

  const [year, month] = selectedMonth.split('-').map(Number);

  const { data: readiness, isLoading: readinessLoading } = useQuery<ReportReadiness>({
    queryKey: ['report-readiness', year, month],
    queryFn: () => api.get(`/reports/readiness/${year}/${month}`).then(r => r.data),
  });

  const { data: snapshots } = useQuery<Snapshot[]>({
    queryKey: ['report-snapshots'],
    queryFn: () => api.get('/reports/snapshots').then(r => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post(`/reports/generate/${year}/${month}`, {
      feedbackFromLastReport: feedbackItems.filter(Boolean),
      strategicFocusAreas: strategicItems.filter(Boolean),
    }),
    onSuccess: (res) => setReport(res.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">Generate monthly reports for stakeholders</p>
        </div>
        <input
          type="month"
          className="input w-auto"
          value={selectedMonth}
          onChange={e => { setSelectedMonth(e.target.value); setReport(null); }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {/* Readiness */}
          {readinessLoading ? <LoadingSpinner className="py-8" /> : readiness && (
            <ReadinessChecklist items={readiness.items} />
          )}

          {/* Manual inputs */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Feedback from Last Report</h3>
            <div className="space-y-2">
              {feedbackItems.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={item}
                    onChange={e => {
                      const next = [...feedbackItems];
                      next[i] = e.target.value;
                      setFeedbackItems(next);
                    }}
                    placeholder="Enter feedback item..."
                  />
                  <button
                    onClick={() => setFeedbackItems(feedbackItems.filter((_, j) => j !== i))}
                    className="btn-ghost text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button onClick={() => setFeedbackItems([...feedbackItems, ''])} className="btn-ghost text-xs flex items-center gap-1">
                <Plus size={12} /> Add item
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-3">Strategic Focus Areas</h3>
            <div className="space-y-2">
              {strategicItems.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1"
                    value={item}
                    onChange={e => {
                      const next = [...strategicItems];
                      next[i] = e.target.value;
                      setStrategicItems(next);
                    }}
                    placeholder="Enter focus area..."
                  />
                  <button
                    onClick={() => setStrategicItems(strategicItems.filter((_, j) => j !== i))}
                    className="btn-ghost text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button onClick={() => setStrategicItems([...strategicItems, ''])} className="btn-ghost text-xs flex items-center gap-1">
                <Plus size={12} /> Add item
              </button>
            </div>
          </div>

          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {generateMutation.isPending ? (
              <><RefreshCw size={16} className="animate-spin" /> Generating…</>
            ) : (
              <><FileText size={16} /> Generate {format(new Date(year, month - 1, 1), 'MMMM yyyy')} Report</>
            )}
          </button>

          {/* Past reports */}
          {snapshots && snapshots.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3">Previous Reports</h3>
              <div className="space-y-1">
                {snapshots.slice(0, 6).map(s => (
                  <div key={s.id} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="text-gray-700">{format(new Date(s.month), 'MMM yyyy')}</span>
                    <span className={`font-medium text-xs ${Number(s.netProfit) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {fmt.currency(Number(s.netProfit))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Report output */}
        <div className="lg:col-span-2">
          {report ? (
            <ReportOutput report={report} />
          ) : (
            <div className="card flex flex-col items-center justify-center py-20 text-center">
              <FileText size={48} className="text-gray-200 mb-4" />
              <h2 className="text-gray-900 font-semibold">Ready to generate</h2>
              <p className="text-sm text-gray-400 mt-1 max-w-sm">
                Review the readiness checklist and add any manual inputs, then click Generate Report.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
