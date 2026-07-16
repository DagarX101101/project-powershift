import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Printer,
  Download,
  AlertTriangle,
  Info,
  ChevronDown,
  Database,
  Zap,
  Activity,
  Clock,
  Settings,
  ShieldCheck,
  Loader2,
  Copy,
  CheckCircle2,
} from 'lucide-react';
import { reportsService } from '../services/reports';
import { Logo } from '../components/common/Logo';
import { useSearchParams } from 'react-router-dom';
import { fetchClustersAndMines, fetchCalculationResult, fetchCalculationResultAll, fetchLayoutConfig } from '../services/calculationEngine';
import { MineSelector } from '../components/common/MineSelector';
import {
  FINANCIAL_YEARS,
  FINANCIAL_YEAR_LABELS,
  type CalculationResult,
  type Cluster,
  type Mine,
  type FinancialYearKey,
  type MasterSheetRowConfig,
} from '../services/calculationEngine';

type FYOption = FinancialYearKey | 'all';

// ─────────────────────────────────────────────────────────────────────────────
// Format Helpers — pure display formatting, no calculations
// ─────────────────────────────────────────────────────────────────────────────
function fmt(value: number | null, decimals = 2): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtInt(value: number | null): string {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return Math.round(value).toLocaleString('en-IN');
}

function resolveValue(result: CalculationResult | null, path: string | undefined): number | null {
  if (!result || !path) return null;
  
  // Custom check for coalDumperEV if paths differ (precautionary)
  const normalizedPath = path === 'coalDumperEV' ? 'vehicle.coalDumperEV' : path;
  
  return normalizedPath.split('.').reduce((acc, part) => acc && (acc as any)[part], result) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton Loader
// ─────────────────────────────────────────────────────────────────────────────
const SkeletonRow: React.FC<{ activeColumnsCount: number }> = ({ activeColumnsCount }) => (
  <tr className="animate-pulse">
    <td className="px-4 py-3">
      <div className="h-4 rounded bg-slate-700/40 w-48" />
    </td>
    <td className="px-4 py-3">
      <div className="h-4 rounded bg-slate-700/40 w-12" />
    </td>
    {Array.from({ length: activeColumnsCount }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 rounded bg-slate-700/30 w-16 ml-auto" />
      </td>
    ))}
  </tr>
);

// ─────────────────────────────────────────────────────────────────────────────
// Section Icon Mapper
// ─────────────────────────────────────────────────────────────────────────────
const SectionIcon: React.FC<{ id: string }> = ({ id }) => {
  if (id === 'sec-vehicle') return <Database className="w-3.5 h-3.5" />;
  if (id === 'sec-power') return <Zap className="w-3.5 h-3.5" />;
  if (id.startsWith('sec-consumption')) return <Activity className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
};

// ─────────────────────────────────────────────────────────────────────────────
// Custom Select dropdown
// ─────────────────────────────────────────────────────────────────────────────
interface SelectProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
  label: string;
}

const Select: React.FC<SelectProps> = ({ id, value, onChange, disabled, children, label }) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={id} className="text-xs font-semibold theme-text-secondary uppercase tracking-wider">
      {label}
    </label>
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="appearance-none pl-3 pr-8 py-2 rounded-lg text-sm font-semibold
          theme-card theme-text-primary border theme-border
          focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] focus:border-transparent
          transition-all duration-150 cursor-pointer
          disabled:opacity-50 disabled:cursor-not-allowed
          min-w-[160px]"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-secondary pointer-events-none" />
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main MasterSheet Component
// ─────────────────────────────────────────────────────────────────────────────
export const MasterSheet: React.FC = () => {
  const [searchParams] = useSearchParams();

  // ── States ────────────────────────────────────────────────────────────────
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedMineId, setSelectedMineId] = useState<string>('all'); // Default to All Mines
  const [selectedFY, setSelectedFY] = useState<FYOption>('all'); // Default to All Years
  const [layout, setLayout] = useState<MasterSheetRowConfig[]>([]);

  // We store calculated years in a mapped record: { fy27: Result, fy28: Result, ... }
  const [resultData, setResultData] = useState<Partial<Record<FinancialYearKey, CalculationResult>> | null>(null);
  
  const [initializing, setInitializing] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Metadata panel info
  const [lastCalculatedAt, setLastCalculatedAt] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<string | null>(null);
  const calculationVersion = '1.0.0';

  const fetchIdRef = useRef<number>(0);
  const [copied, setCopied] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);

  const handleExportExcel = async () => {
    setLoadingExcel(true);
    try {
      await reportsService.downloadExcel('master-sheet', selectedMineId, selectedFY);
    } catch (err) {
      console.error('Failed to export Excel:', err);
    } finally {
      setLoadingExcel(false);
    }
  };

  const handleCopyTable = () => {
    try {
      const table = document.querySelector('table');
      if (!table) return;
      const range = document.createRange();
      range.selectNode(table);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      document.execCommand('copy');
      window.getSelection()?.removeAllRanges();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy table:', err);
    }
  };

  // ── Load clusters and Layout Definitions on mount ─────────────────────────
  useEffect(() => {
    const initialize = async () => {
      try {
        const [clusterData, layoutConfigs] = await Promise.all([
          fetchClustersAndMines(),
          fetchLayoutConfig(),
        ]);
        setClusters(clusterData);
        setLayout(layoutConfigs);
        
        const qMineId = searchParams.get('mineId');
        const qFY = searchParams.get('fy');
        
        if (qMineId) {
          setSelectedMineId(qMineId);
        } else if (clusterData.length > 0 && clusterData[0].mines.length > 0) {
          setSelectedMineId(clusterData[0].mines[0].id);
        } else {
          setSelectedMineId('');
        }
        
        if (qFY) {
          setSelectedFY(qFY as any);
        } else {
          setSelectedFY('all');
        }
      } catch (err: any) {
        setError('Failed to initialize page configuration. Please refresh.');
      } finally {
        setInitializing(false);
      }
    };
    initialize();
  }, [searchParams]);

  // ── Fetch calculation data on Mine/FY change ─────────────────────────────
  const loadCalculation = useCallback(async (mineId: string, fy: FYOption) => {
    if (!mineId || mineId === 'all') {
      setResultData(null);
      setLastCalculatedAt(null);
      setLastFetched(null);
      setLoading(false);
      return;
    }

    const myFetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    setErrorCode(null);


    try {
      if (fy === 'all') {
        const data = await fetchCalculationResultAll(mineId);
        if (fetchIdRef.current !== myFetchId) return;
        setResultData(data.years);
        setLastCalculatedAt(data.lastCalculatedAt);
      } else {
        const data = await fetchCalculationResult(mineId, fy);
        if (fetchIdRef.current !== myFetchId) return;
        setResultData({ [fy]: data });
        setLastCalculatedAt(data.calculatedAt);
      }
      setLastFetched(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      if (fetchIdRef.current !== myFetchId) return;
      const code = err.response?.data?.error?.code ?? null;
      const msg = err.response?.data?.error?.message ?? err.message ?? 'Failed to retrieve calculation data.';
      setErrorCode(code);
      setError(msg);
      setResultData(null);
      setLastCalculatedAt(null);
    } finally {
      if (fetchIdRef.current === myFetchId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initializing && selectedMineId) {
      loadCalculation(selectedMineId, selectedFY);
    }
  }, [selectedMineId, selectedFY, initializing, loadCalculation]);

  // ── Derived parameters ─────────────────────────────────────────────────────
  const allMines = clusters.flatMap((c) => c.mines);
  
  const selectedMineName = allMines.find((m) => m.id === selectedMineId)?.name ?? '—';

  // Determine which financial year columns are currently active in the table
  const activeColumns: FinancialYearKey[] = selectedFY === 'all'
    ? FINANCIAL_YEARS
    : [selectedFY];


  // ───────────────────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 min-h-0">
      {/* Print Header */}
      <div className="hidden print:flex flex-col border-b border-slate-300 pb-4 mb-6 w-full">
        <div className="flex items-center gap-3">
          <Logo size="md" withText={true} />
          <div className="ml-auto text-right text-xs text-slate-500">
            <p>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            <p>By: System User</p>
          </div>
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-bold text-slate-800">Master Calculation Sheet</h2>
          <p className="text-xs text-slate-500">Mine: {selectedMineName} | FY: {selectedFY === 'all' ? 'All Years' : selectedFY.toUpperCase()}</p>
        </div>
      </div>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title Block */}
        <div className="flex items-center gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: 'var(--accent-color)' }}
          >
            <FileSpreadsheet className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <h1 className="text-xl font-bold theme-text-primary tracking-tight">Master Sheet</h1>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Mine Selector */}
          <MineSelector
            clusters={clusters}
            value={selectedMineId}
            onChange={setSelectedMineId}
            allowAll={true}
            disabled={loading || initializing}
            label="Mine Site"
            className="min-w-[200px]"
          />

          {/* Financial Year Selector */}
          <Select
            id="fy-selector"
            label="Financial Year"
            value={selectedFY}
            onChange={(v) => setSelectedFY(v as FYOption)}
            disabled={loading || initializing}
          >
            <option value="all">All Years (FY27 - FY31)</option>
            {FINANCIAL_YEARS.map((fy) => (
              <option key={fy} value={fy}>{FINANCIAL_YEAR_LABELS[fy]}</option>
            ))}
          </Select>

          {/* Refresh Button */}
          <button
            id="master-sheet-refresh"
            onClick={() => loadCalculation(selectedMineId, selectedFY)}
            disabled={loading || !selectedMineId}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold
              theme-card border theme-border theme-text-primary
              hover:bg-[var(--accent-color)] hover:text-slate-900 hover:border-[var(--accent-color)]
              disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            title="Refresh calculation data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Print Button */}
          <button
            id="master-sheet-print"
            onClick={() => window.print()}
            disabled={loading || initializing}
            title="Print Master Sheet"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold
              theme-card border theme-border theme-text-primary
              hover:bg-[var(--accent-color)] hover:text-slate-900 hover:border-[var(--accent-color)]
              disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 print:hidden"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Export Button */}
          <button
            id="master-sheet-export"
            onClick={handleExportExcel}
            disabled={loadingExcel || loading || initializing || selectedMineId === 'all'}
            title="Export to Excel"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold
              theme-card border theme-border theme-text-primary
              hover:bg-[var(--accent-color)] hover:text-slate-900 hover:border-[var(--accent-color)]
              disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 print:hidden"
          >
            {loadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {/* Copy Button */}
          <button
            id="master-sheet-copy"
            onClick={handleCopyTable}
            disabled={loading || initializing || selectedMineId === 'all'}
            title="Copy table to clipboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold
              theme-card border theme-border theme-text-primary
              hover:bg-[var(--accent-color)] hover:text-slate-900 hover:border-[var(--accent-color)]
              disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 print:hidden"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Table'}</span>
          </button>
        </div>
      </div>

      {/* ── Refinement: Metadata Information Panel ───────────────────────── */}
      {resultData && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 px-4 py-3 rounded-xl theme-card border theme-border shadow-sm">
          {/* Mine info */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary">Selected Mine</span>
            <span className="text-sm font-semibold theme-text-primary">{selectedMineName}</span>
          </div>
          {/* Data Source */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary">Data Source</span>
            <span className="text-sm font-semibold text-emerald-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              Calculation Engine
            </span>
          </div>
          {/* Calculation Version */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary">Engine Version</span>
            <span className="text-sm font-semibold theme-text-primary">v{calculationVersion}</span>
          </div>
          {/* Last Calculated Timestamp */}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary">Last Calculated</span>
            <span className="text-sm font-semibold theme-text-primary whitespace-nowrap">
              {lastCalculatedAt ? new Date(lastCalculatedAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
              }) : '—'}
            </span>
          </div>
        </div>
      )}

      {/* ── Initializing Spinner ────────────────────────────────────────── */}
      {initializing && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-color)' }} />
          <p className="text-sm theme-text-secondary">Loading page layout config…</p>
        </div>
      )}

      {/* ── Empty State: No mines configured or "All Mines" selected ── */}
      {!initializing && (allMines.length === 0 || selectedMineId === 'all') && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 theme-card border theme-border rounded-2xl">
          <Database className="w-12 h-12 theme-text-secondary opacity-40" />
          <div className="text-center">
            <p className="font-bold theme-text-primary text-base">No Engineering Data Available</p>
            <p className="text-sm theme-text-secondary mt-1 max-w-md px-4 leading-relaxed">
              {selectedMineId === 'all'
                ? 'Please select a specific mine from the dropdown selector to view engineering calculation results.'
                : 'Strap Data planning inputs have not been configured. Please specify inputs and productivities in Strap Data first.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Error State: NOT_FOUND (Calculation not yet run) ─────────────── */}
      {!loading && !initializing && selectedMineId !== 'all' && errorCode === 'NOT_FOUND' && (
        <div
          className="flex items-start gap-4 p-5 rounded-xl border shadow-sm"
          style={{
            background: 'color-mix(in srgb, var(--accent-color) 8%, transparent)',
            borderColor: 'color-mix(in srgb, var(--accent-color) 30%, transparent)'
          }}
        >
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent-color)' }} />
          <div>
            <p className="font-bold text-sm theme-text-primary">
              Calculation Not Found
            </p>
            <p className="text-sm theme-text-secondary mt-1 leading-relaxed">
              No pre-computed results exist for <strong>{selectedMineName}</strong>. 
              Please run a backend calculation to generate the data sheet.
            </p>
          </div>
        </div>
      )}

      {/* ── General Error Card ──────────────────────────────────────────── */}
      {!loading && !initializing && selectedMineId !== 'all' && error && errorCode !== 'NOT_FOUND' && (
        <div className="flex items-start gap-4 p-5 rounded-xl border border-red-500/20 bg-red-500/5 shadow-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-red-400">Failed to Load Master Sheet</p>
            <p className="text-sm theme-text-secondary mt-1 leading-relaxed">{error}</p>
            <button
              onClick={() => loadCalculation(selectedMineId, selectedFY)}
              className="mt-3 text-xs font-semibold text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Sticky, Scrollable Engineering Table ────────────────────────── */}
      {!initializing && allMines.length > 0 && selectedMineId !== 'all' && !error && (
        <div className="theme-card border theme-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
          {/* Scroll container */}
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)]">
            <table className="w-full border-collapse text-sm text-left" style={{ minWidth: '600px' }}>
              
              {/* ── THEAD ────────────────────────────────────────────────────── */}
              <thead>
                <tr
                  className="sticky top-0 z-10"
                  style={{
                    background: 'var(--bg-card)',
                    borderBottom: '2px solid var(--accent-color)',
                  }}
                >
                  {/* Sticky parameter column */}
                  <th
                    className="sticky left-0 z-20 px-4 py-3.5 font-bold theme-text-secondary text-xs uppercase tracking-wider"
                    style={{ background: 'var(--bg-card)', minWidth: '260px' }}
                  >
                    Parameter
                  </th>
                  <th
                    className="px-4 py-3.5 font-bold theme-text-secondary text-xs uppercase tracking-wider whitespace-nowrap"
                    style={{ minWidth: '60px' }}
                  >
                    Unit
                  </th>
                  {/* Year Columns */}
                  {activeColumns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3.5 font-bold text-xs uppercase tracking-wider text-right whitespace-nowrap"
                      style={{ color: 'var(--accent-color)', minWidth: '100px' }}
                    >
                      {FINANCIAL_YEAR_LABELS[col]}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* ── TBODY ────────────────────────────────────────────────────── */}
              <tbody>
                {loading || layout.length === 0
                  ? /* Render skeletons matching the current column list width */
                    Array.from({ length: 12 }).map((_, i) => (
                      <SkeletonRow key={i} activeColumnsCount={activeColumns.length} />
                    ))
                  : layout.map((row, rowIndex) => {
                      const isEven = rowIndex % 2 === 0;

                      /* 1. Section Header Row */
                      if (row.type === 'section-header') {
                        return (
                          <tr
                            key={row.id}
                            className="border-t theme-border"
                            style={{ background: 'color-mix(in srgb, var(--accent-color) 8%, transparent)' }}
                          >
                            <td
                              colSpan={2 + activeColumns.length}
                              className="sticky left-0 px-4 py-2.5 z-10"
                              style={{ background: 'color-mix(in srgb, var(--accent-color) 8%, transparent)' }}
                            >
                              <div className="flex items-center gap-2">
                                <span style={{ color: 'var(--accent-color)' }}>
                                  <SectionIcon id={row.id} />
                                </span>
                                <span
                                  className="text-xs font-bold uppercase tracking-wider"
                                  style={{ color: 'var(--accent-color)' }}
                                >
                                  {row.label}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      /* 2. Total / Subtotal Row */
                      if (row.type === 'total') {
                        return (
                          <tr
                            key={row.id}
                            className="border-t theme-border font-semibold"
                            style={{ background: 'color-mix(in srgb, var(--bg-card) 60%, var(--border-color) 40%)' }}
                          >
                            {/* Parameter Label */}
                            <td
                              className="sticky left-0 px-4 py-3 theme-text-primary"
                              style={{
                                background: 'color-mix(in srgb, var(--bg-card) 60%, var(--border-color) 40%)',
                                paddingLeft: row.indent ? '2rem' : undefined
                              }}
                            >
                              {row.label}
                            </td>
                            {/* Unit */}
                            <td className="px-4 py-3 theme-text-secondary text-xs">{row.unit ?? ''}</td>
                            {/* Year Values */}
                            {activeColumns.map((col) => {
                              const resultObject = resultData?.[col] ?? null;
                              const val = resolveValue(resultObject, row.path);
                              const isIntegerUnit = row.unit === 'Nos.';
                              return (
                                <td key={col} className="px-4 py-3 text-right tabular-nums theme-text-primary">
                                  {isIntegerUnit ? fmtInt(val) : fmt(val)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      }

                      /* 3. Standard Data Row */
                      return (
                        <tr
                          key={row.id}
                          className="border-t theme-border transition-colors duration-100 hover:bg-[var(--accent-color)]/5"
                          style={{
                            background: isEven
                              ? 'var(--bg-card)'
                              : 'color-mix(in srgb, var(--bg-card) 88%, var(--border-color) 12%)',
                          }}
                        >
                          {/* Parameter Label */}
                          <td
                            className="sticky left-0 px-4 py-3 theme-text-primary"
                            style={{
                              background: isEven
                                ? 'var(--bg-card)'
                                : 'color-mix(in srgb, var(--bg-card) 88%, var(--border-color) 12%)',
                              paddingLeft: row.indent ? '2rem' : undefined,
                            }}
                          >
                            {row.label}
                          </td>
                          {/* Unit */}
                          <td className="px-4 py-3 theme-text-secondary text-xs whitespace-nowrap">
                            {row.unit ?? ''}
                          </td>
                          {/* Year Values */}
                          {activeColumns.map((col) => {
                            const resultObject = resultData?.[col] ?? null;
                            const val = resolveValue(resultObject, row.path);
                            const isIntegerUnit = row.unit === 'Nos.';
                            return (
                              <td key={col} className="px-4 py-3 text-right tabular-nums theme-text-primary">
                                {isIntegerUnit ? fmtInt(val) : fmt(val)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>

          {/* Attestation Table Footer */}
          <div className="px-4 py-3 border-t theme-border flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p className="text-xs theme-text-secondary">
              <span className="font-semibold theme-text-primary font-mono">Schema Config:</span>{' '}
              Exposed dynamically via <code className="text-xs opacity-75 font-mono">GET /api/calculation-engine/layout</code>
            </p>
            <p className="text-xs theme-text-secondary italic">
              Attestation: The Master Sheet contains zero engineering calculations. All values are supplied exclusively by the Calculation Engine.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterSheet;
