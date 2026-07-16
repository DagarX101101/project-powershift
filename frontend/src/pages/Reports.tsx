import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { reportsService } from '../services/reports';
import { fetchClustersAndMines } from '../services/calculationEngine';
import { MineSelector } from '../components/common/MineSelector';
import type { ReportType, ReportHistoryItem } from '../services/reports';
import type { Cluster } from '../../shared/types';
import {
  FileText, Download, Printer, FileSpreadsheet,
  Clock, Filter, Loader2, CheckCircle2, XCircle, ChevronDown, Building2,
} from 'lucide-react';

// ─── Hierarchy ──────────────────────────────────────────────────────────────
// (Removed static MINE_OPTIONS in favor of dynamic clusters)

const FY_OPTIONS = [
  { value: 'all', label: 'All Years' },
  { value: 'fy27', label: 'FY27' },
  { value: 'fy28', label: 'FY28' },
  { value: 'fy29', label: 'FY29' },
  { value: 'fy30', label: 'FY30' },
  { value: 'fy31', label: 'FY31' },
];

const REPORT_TYPES: { value: ReportType; label: string; description: string; icon: React.FC<any> }[] = [
  { value: 'dashboard', label: 'Dashboard Report', description: 'KPIs, mine table and cluster summary', icon: FileText },
  { value: 'master-sheet', label: 'Master Sheet Report', description: 'All calculation results by mine and year', icon: FileSpreadsheet },
  { value: 'mine-summary', label: 'Mine Summary Report', description: 'Per-mine fleet, power and deployment data', icon: Building2 },
  { value: 'cluster-summary', label: 'Cluster Summary Report', description: 'Aggregated cluster-level overview', icon: Filter },
  { value: 'company-summary', label: 'Company Summary Report', description: 'All mines, all years — enterprise overview', icon: Building2 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const cls = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

// ─── Component ───────────────────────────────────────────────────────────────
const Reports: React.FC = () => {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState<ReportType>('dashboard');
  const [selectedMine, setSelectedMine] = useState('all');
  const [selectedFY, setSelectedFY] = useState('all');
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    fetchHistory();
    fetchClustersAndMines().then(setClusters).catch(console.error);
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchHistory = async () => {
    try {
      const h = await reportsService.getHistory();
      setHistory(h);
    } catch { /* silent */ }
    finally { setLoadingHistory(false); }
  };

  const handlePreview = async () => {
    setLoadingPreview(true);
    setPreviewData(null);
    try {
      let data;
      if (selectedReport === 'dashboard') data = await reportsService.getDashboardReport(selectedMine, selectedFY);
      else if (selectedReport === 'master-sheet') data = await reportsService.getMasterSheetReport(selectedMine, selectedFY);
      else if (selectedReport === 'mine-summary') data = await reportsService.getMineSummaryReport();
      else if (selectedReport === 'cluster-summary') data = await reportsService.getClusterSummaryReport();
      else data = await reportsService.getCompanySummaryReport();
      setPreviewData(data);
    } catch { showToast('Failed to load preview data.', 'error'); }
    finally { setLoadingPreview(false); }
  };

  const handlePDF = async () => {
    setLoadingPDF(true);
    try {
      await reportsService.downloadPDF(selectedReport, selectedMine, selectedFY);
      showToast('PDF downloaded successfully.');
      await fetchHistory();
    } catch { showToast('Failed to generate PDF.', 'error'); }
    finally { setLoadingPDF(false); }
  };

  const handleExcel = async () => {
    setLoadingExcel(true);
    try {
      await reportsService.downloadExcel(selectedReport, selectedMine, selectedFY);
      showToast('Excel file downloaded successfully.');
      await fetchHistory();
    } catch { showToast('Failed to generate Excel.', 'error'); }
    finally { setLoadingExcel(false); }
  };

  const handlePrint = () => { window.print(); };

  const isViewer = user?.role === 'VIEWER';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page title */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-emerald-500" />
            Report Center
          </h1>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={cls(
          'fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl font-semibold text-sm transition-all',
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
        )}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left: filters + report type selector */}
        <div className="xl:col-span-1 space-y-4 print:hidden">
          {/* Filters */}
          <div className="theme-card border theme-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-4 flex items-center gap-2">
              <Filter className="w-3.5 h-3.5" /> Filters
            </h3>
            <div className="space-y-3">
              <div>
                <MineSelector
                  clusters={clusters}
                  value={selectedMine}
                  onChange={setSelectedMine}
                  allowAll={true}
                  label="Mine Site"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:theme-text-secondary mb-1.5">Financial Year</label>
                <select
                  value={selectedFY}
                  onChange={e => setSelectedFY(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[var(--bg-app)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                >
                  {FY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Report type selector */}
          <div className="theme-card border theme-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-4 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" /> Report Type
            </h3>
            <div className="space-y-2">
              {REPORT_TYPES.map(rt => (
                <button
                  key={rt.value}
                  onClick={() => { setSelectedReport(rt.value); setPreviewData(null); }}
                  className={cls(
                    'w-full text-left p-3 rounded-xl border transition-all',
                    selectedReport === rt.value
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                  )}
                >
                  <p className={cls(
                    'text-sm font-bold',
                    selectedReport === rt.value ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'
                  )}>{rt.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{rt.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Actions + Preview */}
        <div className="xl:col-span-3 space-y-4">
          {/* Action bar */}
          <div className="theme-card border theme-border rounded-2xl p-5 shadow-sm print:hidden">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {REPORT_TYPES.find(r => r.value === selectedReport)?.label}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedMine === 'all' ? 'All Mines' : selectedMine} · {selectedFY === 'all' ? 'All Years' : selectedFY.toUpperCase()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handlePreview}
                  disabled={loadingPreview}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] font-bold text-sm rounded-xl transition-all disabled:opacity-50"
                >
                  {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Preview
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] font-bold text-sm rounded-xl transition-all"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button
                  onClick={handlePDF}
                  disabled={loadingPDF}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 shadow-md shadow-rose-500/20"
                >
                  {loadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Export PDF
                </button>
                <button
                  onClick={handleExcel}
                  disabled={loadingExcel}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 shadow-md shadow-emerald-500/20"
                >
                  {loadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                  Export Excel
                </button>
              </div>
            </div>
          </div>

          {/* Preview panel */}
          <div ref={printRef} className="theme-card border theme-border rounded-2xl shadow-sm overflow-hidden">
            {/* Print header - only visible when printing */}
            <div className="hidden print:block px-8 pt-8 pb-4 border-b border-slate-200">
              <h2 className="text-xl font-black text-slate-800">Project PowerShift</h2>
              <p className="text-sm text-slate-600">EV Planning & Deployment</p>
              <p className="text-xl font-bold text-slate-800 mt-2">{REPORT_TYPES.find(r => r.value === selectedReport)?.label}</p>
              <p className="text-xs text-slate-500 mt-1">
                Mine: {selectedMine === 'all' ? 'All Mines' : selectedMine} | FY: {selectedFY === 'all' ? 'All Years' : selectedFY.toUpperCase()} |
                Generated: {new Date().toLocaleString()} | By: {user?.name || user?.email}
              </p>
            </div>

            {!previewData && !loadingPreview && (
              <div className="flex flex-col items-center justify-center py-24 theme-text-secondary gap-4">
                <FileText className="w-14 h-14 opacity-30" />
                <p className="text-sm font-medium">Click <span className="font-bold text-emerald-600 dark:text-emerald-400">Preview</span> to load report data</p>
              </div>
            )}

            {loadingPreview && (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            )}

            {previewData && !loadingPreview && (
              <div className="p-6 overflow-x-auto">
                <PreviewContent reportType={selectedReport} data={previewData} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report History */}
      <div className="theme-card border theme-border rounded-2xl p-6 shadow-sm print:hidden">
        <h3 className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-4 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5" /> Report History
        </h3>
        {loadingHistory ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
        ) : history.length === 0 ? (
          <p className="text-sm theme-text-secondary text-center py-8">No reports generated yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b theme-border">
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500 pb-2 pr-4">Report Type</th>
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500 pb-2 pr-4">Mine</th>
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500 pb-2 pr-4">FY</th>
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500 pb-2 pr-4">Format</th>
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500 pb-2 pr-4">Generated By</th>
                  <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-500 pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-b theme-border hover:bg-[var(--bg-card-hover)] transition-colors">
                    <td className="py-2.5 pr-4 font-semibold text-slate-800 dark:text-slate-200 capitalize">{h.reportType.replace(/-/g, ' ')}</td>
                    <td className="py-2.5 pr-4 text-slate-600 dark:theme-text-secondary">{h.mineFilter === 'all' ? 'All Mines' : h.mineFilter}</td>
                    <td className="py-2.5 pr-4 text-slate-600 dark:theme-text-secondary">{h.fyFilter === 'all' ? 'All Years' : h.fyFilter.toUpperCase()}</td>
                    <td className="py-2.5 pr-4">
                      <span className={cls(
                        'px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider',
                        h.exportFormat === 'PDF' ? 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      )}>
                        {h.exportFormat}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600 dark:theme-text-secondary">{h.generatorName}</td>
                    <td className="py-2.5 text-slate-500 text-xs">{new Date(h.generatedAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Preview Content ─────────────────────────────────────────────────────────
const PreviewContent: React.FC<{ reportType: ReportType; data: any }> = ({ reportType, data }) => {
  const thClass = "text-left text-[10px] font-black uppercase tracking-widest text-slate-500 dark:theme-text-secondary pb-2 pr-4 border-b border-slate-200 dark:border-slate-700";
  const tdClass = "py-2.5 pr-4 text-sm text-slate-700 dark:theme-text-primary border-b border-slate-100 dark:border-slate-800/50";
  const numClass = "py-2.5 pr-4 text-sm text-slate-700 dark:theme-text-primary tabular-nums border-b border-slate-100 dark:border-slate-800/50";

  if (reportType === 'dashboard' || reportType === 'company-summary') {
    return (
      <div className="space-y-6">
        {/* KPIs */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Key Performance Indicators</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.values(data.kpis || {}).map((kpi: any) => (
              <div key={kpi.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] text-slate-500 font-semibold">{kpi.title}</p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{kpi.value?.toFixed(2)}</p>
                <p className="text-[10px] theme-text-secondary">{kpi.unit}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Mine Table */}
        <div>
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Mine Summary Table</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Mine', 'EV Fleet', 'Avail. Power (MVA)', 'Chargers Req.', 'Deployable', 'Status'].map(h => (
                    <th key={h} className={thClass}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.mineTable || []).map((m: any) => (
                  <tr key={m.mineId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className={tdClass + ' font-semibold'}>{m.mineName}</td>
                    <td className={numClass}>{m.totalEVFleet.toFixed(0)}</td>
                    <td className={numClass}>{m.availableEVPower.toFixed(2)}</td>
                    <td className={numClass}>{m.chargersRequired.toFixed(0)}</td>
                    <td className={numClass}>{m.vehiclesDeployable.toFixed(0)}</td>
                    <td className={tdClass}>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.status === 'Ready' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (reportType === 'master-sheet') {
    return (
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Master Sheet — Calculation Results</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Cluster', 'Mine', 'FY', 'EV Fleet', 'Avail. Power (MVA)', 'Chargers Req.', 'Req. EV Power', 'Deployable', 'Total Req. Power (MW)'].map(h => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.rows || []).map((r: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-950/30' : ''}>
                  <td className={tdClass}>{r.cluster}</td>
                  <td className={tdClass + ' font-semibold'}>{r.mine}</td>
                  <td className={tdClass}>{r.financialYear}</td>
                  <td className={numClass}>{r.totalEVFleet?.toFixed(0)}</td>
                  <td className={numClass}>{r.availableEVPower?.toFixed(2)}</td>
                  <td className={numClass}>{r.chargersRequired?.toFixed(0)}</td>
                  <td className={numClass}>{r.requiredEVPower?.toFixed(2)}</td>
                  <td className={numClass}>{r.vehiclesDeployable?.toFixed(0)}</td>
                  <td className={numClass}>{r.totalRequiredPower?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data.rows || []).length === 0 && (
            <p className="text-center text-sm theme-text-secondary py-8">No calculation results found. Run calculations first.</p>
          )}
        </div>
      </div>
    );
  }

  if (reportType === 'cluster-summary') {
    return (
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Cluster Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Cluster', 'Mines', 'EV Fleet', 'Avail. Power (MVA)', 'Req. Power', 'Deployable'].map(h => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.clusters || []).map((c: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className={tdClass + ' font-bold'}>{c.clusterName}</td>
                  <td className={numClass}>{c.mineCount}</td>
                  <td className={numClass}>{c.totalEVFleet?.toFixed(0)}</td>
                  <td className={numClass}>{c.availableEVPower?.toFixed(2)}</td>
                  <td className={numClass}>{c.requiredPower?.toFixed(2)}</td>
                  <td className={numClass}>{c.vehiclesDeployable?.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (reportType === 'mine-summary') {
    return (
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Mine Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                {['Cluster', 'Mine', 'FY27 EV Fleet', 'FY28 EV Fleet', 'FY29 EV Fleet', 'FY30 EV Fleet', 'FY31 EV Fleet'].map(h => (
                  <th key={h} className={thClass}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.mines || []).map((m: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className={tdClass}>{m.cluster}</td>
                  <td className={tdClass + ' font-semibold'}>{m.mine}</td>
                  {['FY27','FY28','FY29','FY30','FY31'].map(fy => (
                    <td key={fy} className={numClass}>{m.byYear[fy]?.totalEVFleet?.toFixed(0) ?? '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
};

export default Reports;
