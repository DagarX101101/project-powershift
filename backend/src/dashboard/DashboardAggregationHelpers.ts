import hierarchy from '../../../shared/mineHierarchy.json';

export interface DashboardFilters {
  mineId: string;
  financialYear: string;
}

export interface KPIItem {
  id: string;
  title: string;
  value: number;
  unit: string;
  subtitle: string;
}

export interface ClusterDetailMine {
  mineId: string;
  mineName: string;
  availableEVPower: number;
  chargersRequired: number;
  requiredPower: number;
  vehiclesDeployable: number;
}

export interface ClusterSummaryItem {
  clusterName: string;
  mineCount: number;
  totalEVFleet: number;
  availableEVPower: number;
  requiredPower: number;
  vehiclesDeployable: number;
  mines: ClusterDetailMine[];
}

export interface MineTableRow {
  mineId: string;
  mineName: string;
  clusterId: string;
  availableEVPower: number;
  chargersRequired: number;
  requiredEVPower: number;
  vehiclesDeployable: number;
  totalEVFleet: number;
  status: 'Ready' | 'Pending Inputs' | 'Calculation Required';
}

export interface DashboardSummaryResponse {
  kpis: {
    totalEVFleet: KPIItem;
    availableEVPower: KPIItem;
    chargersRequired: KPIItem;
    totalRequiredPower: KPIItem;
    vehiclesDeployable: KPIItem;
  };
  clusters: ClusterSummaryItem[];
  mineTable: MineTableRow[];
  metadata: {
    lastCalculatedAt: string | null;
    dataSource: string;
    version: string;
  };
}

export function aggregateDashboardData(
  dbClusters: any[],
  dbCalcResults: any[],
  planningInputsCounts: Record<string, number>,
  filters: DashboardFilters
): DashboardSummaryResponse {
  // 1. Resolve active financial years to aggregate
  const activeFys = filters.financialYear === 'all'
    ? ['fy27', 'fy28', 'fy29', 'fy30', 'fy31']
    : [filters.financialYear.toLowerCase()];

  // Create a fast lookup for calculation results by mineId + financialYear
  const calcMap = new Map<string, any>();
  dbCalcResults.forEach(r => {
    const key = `${r.mineId}_${r.financialYear.toLowerCase()}`;
    calcMap.set(key, r.results);
  });

  // Helper: Aggregate calculations for a single mine over active financial years
  const getMineAggregations = (mineId: string) => {
    let totalEVFleet = 0;
    let availableEVPower = 0;
    let chargersRequired = 0;
    let requiredEVPower = 0;
    let vehiclesDeployable = 0;
    let totalRequiredPower = 0;

    const aggregationYears = filters.financialYear === 'all' ? ['fy31'] : [filters.financialYear.toLowerCase()];

    aggregationYears.forEach(fy => {
      const res = calcMap.get(`${mineId}_${fy}`);
      if (res) {
        totalEVFleet += res.vehicle?.totalEVFleet ?? 0;
        availableEVPower += res.power?.availableEVPower ?? 0;
        chargersRequired += res.power?.chargersRequired ?? 0;
        requiredEVPower += res.power?.requiredEVPower ?? 0;
        vehiclesDeployable += res.power?.vehiclesDeployable ?? 0;
        totalRequiredPower += res.power?.totalRequiredPower ?? 0;
      }
    });

    return {
      totalEVFleet,
      availableEVPower,
      chargersRequired,
      requiredEVPower,
      vehiclesDeployable,
      totalRequiredPower,
    };
  };

  // 2. Build the ordered list of all mines with database records resolved
  const resolvedMines: any[] = [];
  const resolvedClusters: any[] = [];

  // Iterate clusters and mines according to hierarchy JSON order
  hierarchy.forEach(h => {
    const dbCluster = dbClusters.find(c => c.name === h.clusterName);
    if (!dbCluster) return;

    const clusterMines: any[] = [];

    h.mines.forEach(mName => {
      const dbMine = dbCluster.mines.find((m: any) => m.name === mName);
      if (!dbMine) return;

      const mineAggs = getMineAggregations(dbMine.id);

      // Determine Status
      const inputCount = planningInputsCounts[dbMine.id] ?? 0;
      let status: 'Ready' | 'Pending Inputs' | 'Calculation Required' = 'Ready';

      if (inputCount === 0) {
        status = 'Pending Inputs';
      } else {
        // If inputs exist, check if calculations exist for the selected years
        const hasAllResults = activeFys.every(fy => calcMap.has(`${dbMine.id}_${fy}`));
        if (!hasAllResults) {
          status = 'Calculation Required';
        }
      }

      const mineRow: MineTableRow = {
        mineId: dbMine.id,
        mineName: dbMine.name,
        clusterId: dbCluster.id,
        availableEVPower: mineAggs.availableEVPower,
        chargersRequired: mineAggs.chargersRequired,
        requiredEVPower: mineAggs.requiredEVPower,
        vehiclesDeployable: mineAggs.vehiclesDeployable,
        totalEVFleet: mineAggs.totalEVFleet,
        status,
      };

      resolvedMines.push({
        ...mineRow,
        totalRequiredPower: mineAggs.totalRequiredPower,
      });

      clusterMines.push({
        mineId: dbMine.id,
        mineName: dbMine.name,
        availableEVPower: mineAggs.availableEVPower,
        chargersRequired: mineAggs.chargersRequired,
        requiredPower: mineAggs.totalRequiredPower,
        vehiclesDeployable: mineAggs.vehiclesDeployable,
      });
    });

    // Compute cluster aggregated parameters
    let clusterTotalEVFleet = 0;
    let clusterAvailableEVPower = 0;
    let clusterRequiredPower = 0;
    let clusterVehiclesDeployable = 0;

    clusterMines.forEach(m => {
      const mineFull = resolvedMines.find(rm => rm.mineId === m.mineId);
      if (mineFull) {
        clusterTotalEVFleet += mineFull.totalEVFleet;
        clusterAvailableEVPower += mineFull.availableEVPower;
        clusterRequiredPower += mineFull.totalRequiredPower;
        clusterVehiclesDeployable += mineFull.vehiclesDeployable;
      }
    });

    resolvedClusters.push({
      clusterName: h.clusterName,
      mineCount: clusterMines.length,
      totalEVFleet: clusterTotalEVFleet,
      availableEVPower: clusterAvailableEVPower,
      requiredPower: clusterRequiredPower,
      vehiclesDeployable: clusterVehiclesDeployable,
      mines: clusterMines,
    });
  });

  // 3. Filter data based on selected mine filter
  const isAllMines = filters.mineId === 'all';
  const targetMines = isAllMines
    ? resolvedMines
    : resolvedMines.filter(m => m.mineId === filters.mineId);

  // Compute overall KPI aggregates
  let totalEVFleetValue = 0;
  let totalAvailableEVPowerValue = 0;
  let totalChargersRequiredValue = 0;
  let totalRequiredPowerValue = 0;
  let totalVehiclesDeployableValue = 0;

  targetMines.forEach(m => {
    totalEVFleetValue += m.totalEVFleet;
    totalAvailableEVPowerValue += m.availableEVPower;
    totalChargersRequiredValue += m.chargersRequired;
    totalRequiredPowerValue += m.totalRequiredPower;
    totalVehiclesDeployableValue += m.vehiclesDeployable;
  });

  const kpis = {
    totalEVFleet: {
      id: 'kpi-fleet',
      title: 'Total EV Fleet',
      value: totalEVFleetValue,
      unit: 'Nos.',
      subtitle: isAllMines ? 'Aggregated count across all mines' : 'EV fleet requirement',
    },
    availableEVPower: {
      id: 'kpi-power-avail',
      title: 'Total Available Power for EV',
      value: totalAvailableEVPowerValue,
      unit: 'MVA',
      subtitle: isAllMines ? 'Total electrical substation bounds' : 'Substation capacity',
    },
    chargersRequired: {
      id: 'kpi-chargers-req',
      title: 'Chargers Required',
      value: totalChargersRequiredValue,
      unit: 'Nos.',
      subtitle: isAllMines ? 'Total chargers required across mines' : 'Chargers required',
    },
    totalRequiredPower: {
      id: 'kpi-power-req',
      title: 'Total Required Power',
      value: totalRequiredPowerValue,
      unit: 'MW',
      subtitle: 'Aggregate load (EV + Mine Infrastructure)',
    },
    vehiclesDeployable: {
      id: 'kpi-deployable',
      title: 'Vehicles Deployable',
      value: totalVehiclesDeployableValue,
      unit: 'Nos.',
      subtitle: isAllMines ? 'Fleet size supported by power bounds' : 'Supported fleet capacity',
    },
  };

  // Determine calculation timestamps for metadata panel
  const timestamps = dbCalcResults
    .filter(r => isAllMines || r.mineId === filters.mineId)
    .map(r => new Date(r.calculatedAt).getTime());

  const lastCalculatedAt = timestamps.length > 0
    ? new Date(Math.max(...timestamps)).toISOString()
    : null;

  // Build the final response structure
  return {
    kpis,
    clusters: resolvedClusters,
    mineTable: resolvedMines.map(m => ({
      mineId: m.mineId,
      mineName: m.mineName,
      clusterId: m.clusterId,
      availableEVPower: m.availableEVPower,
      chargersRequired: m.chargersRequired,
      requiredEVPower: m.requiredEVPower,
      vehiclesDeployable: m.vehiclesDeployable,
      totalEVFleet: m.totalEVFleet,
      status: m.status,
    })),
    metadata: {
      lastCalculatedAt,
      dataSource: 'Calculation Engine',
      version: '1.0.0',
    },
  };
}
