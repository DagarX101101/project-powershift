import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { MineSelector } from '../components/common/MineSelector';
import { fetchClustersAndMines } from '../services/calculationEngine';
import {
  Truck,
  Zap,
  ShieldAlert,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Activity,
  Settings,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Database,
  Eye,
  FileSpreadsheet,
  Moon,
  Sun,
  Palette,
  Printer,
} from 'lucide-react';
import { Logo } from '../components/common/Logo';

// Types matching the backend aggregation service schema
interface Cluster {
  id: string;
  name: string;
  mines: Mine[];
}

interface Mine {
  id: string;
  name: string;
  clusterId: string;
}

interface KPIItem {
  id: string;
  title: string;
  value: number;
  unit: string;
  subtitle: string;
}

interface ClusterDetailMine {
  mineId: string;
  mineName: string;
  availableEVPower: number;
  chpRequirement: number;
  requiredPower: number;
  vehiclesDeployable: number;
}

interface ClusterSummaryItem {
  clusterName: string;
  mineCount: number;
  totalEVFleet: number;
  availableEVPower: number;
  requiredPower: number;
  vehiclesDeployable: number;
  mines: ClusterDetailMine[];
}

interface MineTableRow {
  mineId: string;
  mineName: string;
  clusterId: string;
  availableEVPower: number;
  chpRequirement: number;
  requiredEVPower: number;
  vehiclesDeployable: number;
  totalEVFleet: number;
  status: 'Ready' | 'Pending Inputs' | 'Calculation Required';
}

interface DashboardSummaryResponse {
  kpis: {
    totalEVFleet: KPIItem;
    availableEVPower: KPIItem;
    chpRequirement: KPIItem;
    totalRequiredPower: KPIItem;
    vehiclesDeployable: KPIItem;
    chargersRequired: KPIItem;
  };
  clusters: ClusterSummaryItem[];
  mineTable: MineTableRow[];
  metadata: {
    lastCalculatedAt: string | null;
    dataSource: string;
    version: string;
  };
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  // Filter States
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedMineId, setSelectedMineId] = useState<string>('all');
  const [selectedFY, setSelectedFY] = useState<string>('all');

  // UI / Fetching States
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Cluster Expansion States (tracks which cluster cards are expanded by name)
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});

  // 1. Fetch Clusters list on mount for dropdown configuration
  useEffect(() => {
    const initPage = async () => {
      try {
        const clusterData = await fetchClustersAndMines();
        setClusters(clusterData);
      } catch (err: any) {
        console.error('Failed to load clusters list:', err);
        setError('Connection failed. Server offline or unreachable.');
      } finally {
        setInitializing(false);
      }
    };
    initPage();
  }, []);

  // 2. Fetch Dashboard data from the backend
  const loadDashboard = useCallback(async (mineId: string, fy: string) => {
    setLoading(true);
    setError(null);
    setErrorCode(null);

    try {
      const res = await api.get<DashboardSummaryResponse>(
        `/dashboard?mineId=${mineId}&financialYear=${fy}`
      );
      setSummary(res.data);
    } catch (err: any) {
      console.error('Error fetching dashboard summary:', err);
      const code = err.response?.data?.error?.code ?? null;
      const msg = err.response?.data?.error?.message ?? err.message ?? 'Failed to retrieve dashboard data.';
      setErrorCode(code);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initializing) {
      loadDashboard(selectedMineId, selectedFY);
    }
  }, [selectedMineId, selectedFY, initializing, loadDashboard]);

  // Toggle cluster card details expansion
  const toggleClusterExpansion = (clusterName: string) => {
    setExpandedClusters((prev) => ({
      ...prev,
      [clusterName]: !prev[clusterName],
    }));
  };

  const allMines = clusters.flatMap((c) => c.mines);

  // Helper formatting routines
  const fmtVal = (v: number | undefined, isInteger = false) => {
    if (v === undefined || v === null || isNaN(v)) return '—';
    return v.toLocaleString('en-IN', {
      minimumFractionDigits: isInteger ? 0 : 2,
      maximumFractionDigits: isInteger ? 0 : 2,
    });
  };

  // Return badge class names based on mine status
  const getStatusBadge = (status: MineTableRow['status']) => {
    switch (status) {
      case 'Ready':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Pending Inputs':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Calculation Required':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      default:
        return 'bg-slate-500/10 theme-text-secondary border border-slate-500/20';
    }
  };

  // Skeletons during loading states
  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-color)' }} />
        <p className="text-sm theme-text-secondary">Initializing Dashboard Configuration…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-0">
      {/* Print Header */}
      <div className="hidden print:flex flex-col border-b border-slate-300 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Logo size="md" withText={true} />
          <div className="ml-auto text-right text-xs text-slate-500">
            <p>Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            <p>By: {user?.name || user?.email}</p>
          </div>
        </div>
        <div className="mt-4">
          <h2 className="text-xl font-bold text-slate-800">Executive EV Planning Dashboard</h2>
          <p className="text-xs text-slate-500">Mines Site: {selectedMineId === 'all' ? 'All Mines' : allMines.find(m => m.id === selectedMineId)?.name ?? '—'} | FY: {selectedFY === 'all' ? 'All Years' : selectedFY.toUpperCase()}</p>
        </div>
      </div>

      {/* ── Welcome Banner ──────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden border theme-border shadow-sm flex flex-col gap-1 print:hidden"
        style={{
          background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(30, 41, 59, 0.3) 100%)',
        }}
      >
        <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
          <Sparkles className="w-32 h-32 theme-text-secondary" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary">Welcome Back,</span>
        <h1 className="text-2xl font-black theme-text-primary tracking-tight">
          {user?.name ?? 'Planning Engineer'}
        </h1>
      </div>

      {/* ── Global Filter & Utility Bar ──────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl theme-card border theme-border shadow-sm print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          {/* Mine Dropdown Selector (Hierarchy compliant) */}
          <div className="flex flex-col">
            <MineSelector
              clusters={clusters}
              value={selectedMineId}
              onChange={setSelectedMineId}
              allowAll={true}
              disabled={loading}
              label="Mine Site Selection"
              className="min-w-[220px]"
            />
          </div>

          {/* Financial Year Selector */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Financial Year</span>
            <div className="relative min-w-[160px]">
              <select
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                disabled={loading}
                className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs font-semibold
                  theme-card theme-text-primary border theme-border
                  focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] focus:border-transparent
                  transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                <option value="all">All Years</option>
                <option value="fy27">FY27</option>
                <option value="fy28">FY28</option>
                <option value="fy29">FY29</option>
                <option value="fy30">FY30</option>
                <option value="fy31">FY31</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Theme Dropdown Toggle (Requirement compliant switcher) */}
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">System Color Theme</span>
            <div className="relative min-w-[160px]">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg text-xs font-semibold
                  theme-card theme-text-primary border theme-border
                  focus:outline-none focus:ring-1 focus:ring-[var(--accent-color)] focus:border-transparent
                  transition-all duration-150 cursor-pointer"
              >
                <option value="dark">Dark Theme</option>
                <option value="light">Light Theme</option>
                <option value="corporate">Corporate Blue</option>
              </select>
              <Palette className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 theme-text-secondary pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Refresh Actions & Cache indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadDashboard(selectedMineId, selectedFY)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold
              theme-card border theme-border theme-text-primary
              hover:bg-[var(--accent-color)] hover:text-slate-900 hover:border-[var(--accent-color)]
              disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
            title="Force refresh caches and load data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold
              theme-card border theme-border theme-text-primary
              hover:bg-[var(--accent-color)] hover:text-slate-900 hover:border-[var(--accent-color)]
              transition-all duration-150"
            title="Print Dashboard Report"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* ── Error state handles ─────────────────────────────────────────── */}
      {error && !loading && (
        <div className="flex items-start gap-4 p-5 rounded-xl border border-red-500/20 bg-red-500/5 shadow-sm">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-red-400">Dashboard Synchronisation Mismatch</p>
            <p className="text-sm theme-text-secondary mt-1 leading-relaxed">{error}</p>
            <button
              onClick={() => loadDashboard(selectedMineId, selectedFY)}
              className="mt-3 text-xs font-semibold text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* ── LOADING SKELETON RENDER ────────────────────────────────────── */}
      {loading && (
        <div className="flex flex-col gap-6 animate-pulse">
          {/* Skeletons for KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 bg-slate-800/20 theme-border border rounded-2xl" />
            ))}
          </div>
          {/* Skeletons for Cluster summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 bg-slate-800/20 theme-border border rounded-2xl" />
            ))}
          </div>
          {/* Skeleton for Table */}
          <div className="h-64 bg-slate-800/20 theme-border border rounded-2xl" />
        </div>
      )}

      {/* ── MAIN DASHBOARD CONTENT (Render only when summary exists and not loading) ── */}
      {!loading && summary && (
        <>
          {/* 1. FIVE KPI CARDS SECTION */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Card 1: Total EV Fleet */}
            <div className="theme-card border theme-border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md flex flex-col justify-between h-28 relative">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary">Total EV Fleet</span>
                <Truck className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black theme-text-primary">
                  {fmtVal(summary.kpis.totalEVFleet.value, true)}
                </span>
                <span className="text-xs font-bold theme-text-secondary ml-1.5">{summary.kpis.totalEVFleet.unit}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1 truncate">{summary.kpis.totalEVFleet.subtitle}</p>
            </div>

            {/* Card 2: Total Available Power for EV */}
            <div className="theme-card border theme-border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md flex flex-col justify-between h-28 relative">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary">Available EV Power</span>
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black theme-text-primary">
                  {fmtVal(summary.kpis.availableEVPower.value)}
                </span>
                <span className="text-xs font-bold theme-text-secondary ml-1.5">{summary.kpis.availableEVPower.unit}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1 truncate">{summary.kpis.availableEVPower.subtitle}</p>
            </div>

            {/* Card 3: CHP, Washery & Mining Requirement */}
            <div className="theme-card border theme-border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md flex flex-col justify-between h-28 relative">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary">Chargers Required</span>
                <Settings className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black theme-text-primary">
                  {fmtVal(summary.kpis.chargersRequired.value, true)}
                </span>
                <span className="text-xs font-bold theme-text-secondary ml-1.5">{summary.kpis.chargersRequired.unit}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1 truncate">{summary.kpis.chargersRequired.subtitle}</p>
            </div>

            {/* Card 4: Total Required Power */}
            <div className="theme-card border theme-border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md flex flex-col justify-between h-28 relative">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary">Total Required Power</span>
                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black theme-text-primary">
                  {fmtVal(summary.kpis.totalRequiredPower.value)}
                </span>
                <span className="text-xs font-bold theme-text-secondary ml-1.5">{summary.kpis.totalRequiredPower.unit}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1 truncate">{summary.kpis.totalRequiredPower.subtitle}</p>
            </div>

            {/* Card 5: Vehicles Deployable */}
            <div className="theme-card border theme-border rounded-2xl p-5 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md flex flex-col justify-between h-28 relative">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary">Vehicles Deployable</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-black theme-text-primary">
                  {fmtVal(summary.kpis.vehiclesDeployable.value, true)}
                </span>
                <span className="text-xs font-bold theme-text-secondary ml-1.5">{summary.kpis.vehiclesDeployable.unit}</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1 truncate">{summary.kpis.vehiclesDeployable.subtitle}</p>
            </div>
          </div>

          {/* 2. PRODUCTION CLUSTERS SUMMARY & CARDS */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold theme-text-primary">Production Cluster Overview</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {summary.clusters.map((cluster) => {
                const isExpanded = !!expandedClusters[cluster.clusterName];

                return (
                  <div
                    key={cluster.clusterName}
                    className="theme-card border theme-border rounded-2xl p-5 shadow-sm transition-all duration-200 flex flex-col justify-between gap-4"
                  >
                    <div>
                      {/* Cluster Title Block */}
                      <div className="flex justify-between items-center pb-2 border-b theme-border">
                        <span className="font-extrabold text-xs theme-text-primary">{cluster.clusterName}</span>
                        <span className="text-[9px] bg-[var(--bg-app)] px-2 py-0.5 rounded text-[var(--text-secondary)] font-bold border border-[var(--border-color)]">
                          {cluster.mineCount} Mine{cluster.mineCount > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Cluster Metrics List */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 mt-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total EV Fleet</span>
                          <span className="text-sm font-black theme-text-primary mt-0.5">{fmtVal(cluster.totalEVFleet, true)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Available Power</span>
                          <span className="text-sm font-black theme-text-primary mt-0.5">{fmtVal(cluster.availableEVPower)} MVA</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Required Power</span>
                          <span className="text-sm font-black theme-text-primary mt-0.5">{fmtVal(cluster.requiredPower)} MW</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Vehicles Deployable</span>
                          <span className="text-sm font-black theme-text-primary mt-0.5">{fmtVal(cluster.vehiclesDeployable, true)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expand Cluster Action Bar */}
                    <div className="pt-3 border-t theme-border">
                      <button
                        onClick={() => toggleClusterExpansion(cluster.clusterName)}
                        className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider theme-text-secondary hover:text-[var(--accent-color)] transition-colors"
                      >
                        <span>{isExpanded ? 'Collapse Cluster' : 'Expand Cluster'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {/* Expandable mine detail table view */}
                      {isExpanded && (
                        <div className="mt-4 overflow-hidden rounded-xl border theme-border bg-slate-950/20 max-h-[220px] overflow-y-auto">
                          <table className="w-full text-left text-[10px] border-collapse">
                            <thead>
                              <tr className="border-b theme-border text-slate-500 font-bold uppercase tracking-wider">
                                <th className="p-2.5">Mine</th>
                                <th className="p-2.5 text-center">Avail (MVA)</th>
                                <th className="p-2.5 text-center">Required (MW)</th>
                                <th className="p-2.5 text-center">Deployable</th>
                                <th className="p-2.5 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y theme-border theme-text-primary">
                              {cluster.mines.map((mine) => (
                                <tr key={mine.mineId} className="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="p-2.5 font-bold theme-text-primary">{mine.mineName}</td>
                                  <td className="p-2.5 text-center font-mono">{fmtVal(mine.availableEVPower)}</td>
                                  <td className="p-2.5 text-center font-mono">{fmtVal(mine.requiredPower)}</td>
                                  <td className="p-2.5 text-center font-mono font-bold">{mine.vehiclesDeployable}</td>
                                  <td className="p-2.5 text-right">
                                    <button
                                      onClick={() => navigate(`/master-sheet?mineId=${mine.mineId}&fy=${selectedFY}`)}
                                      className="text-[9px] font-black text-[var(--accent-color)] hover:underline flex items-center gap-0.5 justify-end"
                                      title="Open calculations for this mine site"
                                    >
                                      <span>View</span>
                                      <ArrowRight className="w-2.5 h-2.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. MINE SUMMARY MASTER LIST TABLE */}
          <div className="theme-card border theme-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="px-6 py-5 border-b theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold theme-text-primary">Mine Summary Master List</h2>
              </div>

              {/* Metadata badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/40 text-[9px] font-bold tracking-wider theme-text-secondary uppercase select-none border theme-border w-fit">
                <Database className="h-3 w-3" />
                <span>Last Calculated: {summary.metadata.lastCalculatedAt ? new Date(summary.metadata.lastCalculatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b theme-border theme-text-secondary font-bold uppercase tracking-wider bg-[var(--bg-app)]">
                    <th className="py-3 px-6">Mine Site</th>
                    <th className="py-3 px-4 text-center">Available EV Power (MVA)</th>
                    <th className="py-3 px-4 text-center">Chargers Required</th>
                    <th className="py-3 px-4 text-center">Required EV Power (MW)</th>
                    <th className="py-3 px-4 text-center">Vehicles Deployable</th>
                    <th className="py-3 px-4 text-center">Total EV Fleet</th>
                    <th className="py-3 px-6 text-center">Status</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border theme-text-primary">
                  {summary.mineTable.map((mine) => (
                    <tr key={mine.mineId} className="hover:bg-[var(--bg-card-hover)] transition-colors">
                      <td className="py-4 px-6 font-bold theme-text-primary text-sm">{mine.mineName}</td>
                      <td className="py-4 px-4 text-center font-mono">{fmtVal(mine.availableEVPower)}</td>
                      <td className="py-4 px-4 text-center font-mono">{fmtVal(mine.chargersRequired, true)}</td>
                      <td className="py-4 px-4 text-center font-mono">{fmtVal(mine.requiredEVPower)}</td>
                      <td className="py-4 px-4 text-center font-mono font-bold">{fmtVal(mine.vehiclesDeployable, true)}</td>
                      <td className="py-4 px-4 text-center font-mono">{fmtVal(mine.totalEVFleet, true)}</td>

                      {/* Status Badge */}
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-wider select-none ${getStatusBadge(mine.status)}`}>
                          {mine.status}
                        </span>
                      </td>

                      {/* View calculations sheet */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => navigate(`/master-sheet?mineId=${mine.mineId}&fy=${selectedFY}`)}
                          className="px-3 py-1.5 rounded-lg border theme-border text-[10px] font-bold uppercase tracking-wider theme-text-primary
                            hover:bg-[var(--accent-color)] hover:text-slate-900 hover:border-[var(--accent-color)] transition-all duration-150 inline-flex items-center gap-1.5"
                          title="Open Master Sheet calculations"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Open Master Sheet</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Empty State: When no mines are returned from database ─────── */}
      {!loading && summary && summary.mineTable.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 theme-card border theme-border rounded-2xl">
          <Database className="w-12 h-12 theme-text-secondary opacity-40 animate-bounce" />
          <div className="text-center">
            <p className="font-bold theme-text-primary text-base">No Project Planning Data Available</p>
            <p className="text-xs theme-text-secondary mt-1 max-w-sm px-4 leading-relaxed">
              No planning data or mines configurations have been found. Please navigate to the Strap Data page to configure settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
