import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Truck, Zap, Shield, Edit3, Loader2, Save, X, AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { MineSelector } from '../components/common/MineSelector';
import { ClusterSelector } from '../components/common/ClusterSelector';

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

interface VehicleProductivity {
  id: string;
  updatedAt: string;
  equipment: string;
  particular: string;
  capacity: string;
  uom: string;
  avgLead: number;
  fy27: number;
  fy28: number;
  fy29: number;
  fy30: number;
  fy31: number;
  [key: string]: string | number;
}

interface MinePlanningInput {
  id: string;
  updatedAt: string;
  mineId: string;
  particular: string;
  uom: string;
  fy27: number;
  fy28: number;
  fy29: number;
  fy30: number;
  fy31: number;
  [key: string]: string | number;
}

interface ElectricalTOD {
  id: string;
  updatedAt: string;
  clusterId: string;
  period: string;
  fromTime: string;
  toTime: string;
  totalHours: number;
  consumptionPercentage: number;
  percentageDifferenceFactor: number;
  [key: string]: string | number;
}

export const StrapData: React.FC = () => {
  const { user } = useAuth();
  
  // Data loading states
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string>('');
  const [selectedMineId, setSelectedMineId] = useState<string>('');
  const [selectedTodClusterId, setSelectedTodClusterId] = useState<string>('all');
  
  // Originals (for cancelling and comparison)
  const [originalVehicleProductivity, setOriginalVehicleProductivity] = useState<VehicleProductivity[]>([]);
  const [originalSiteInputs, setOriginalSiteInputs] = useState<MinePlanningInput[]>([]);
  const [originalTodData, setOriginalTodData] = useState<ElectricalTOD[]>([]);
  
  // Active edit states
  const [vehicleProductivity, setVehicleProductivity] = useState<VehicleProductivity[]>([]);
  const [siteInputs, setSiteInputs] = useState<MinePlanningInput[]>([]);
  const [todData, setTodData] = useState<ElectricalTOD[]>([]);
  
  // Edit mode tracking
  const [isEditMode, setIsEditMode] = useState(false);
  const [lastLoadedTime, setLastLoadedTime] = useState<number>(Date.now());
  const [showLiveUpdateNotification, setShowLiveUpdateNotification] = useState(false);
  
  const [loadingClusters, setLoadingClusters] = useState(true);
  const [loadingProductivity, setLoadingProductivity] = useState(true);
  const [loadingInputs, setLoadingInputs] = useState(false);
  const [loadingTod, setLoadingTod] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Initial Fetch
  const fetchData = async () => {
    try {
      setLoadingClusters(true);
      setLoadingProductivity(true);
      setErrorMsg(null);
      
      const [clustersRes, productivityRes] = await Promise.all([
        api.get<Cluster[]>('/strap-data/clusters'),
        api.get<VehicleProductivity[]>('/strap-data/vehicle-productivity')
      ]);
      
      setClusters(clustersRes.data);
      setOriginalVehicleProductivity(productivityRes.data);
      setVehicleProductivity(JSON.parse(JSON.stringify(productivityRes.data)));
      setLastLoadedTime(Date.now());
      setShowLiveUpdateNotification(false);
      
      // Default to PEKB
      let pekbId = '';
      let pekbClusterId = '';
      for (const cluster of clustersRes.data) {
        const pekb = cluster.mines.find(m => m.name.toUpperCase() === 'PEKB');
        if (pekb) {
          pekbId = pekb.id;
          pekbClusterId = cluster.id;
          break;
        }
      }
      setSelectedMineId(pekbId);
      setSelectedClusterId(pekbClusterId);
    } catch (err: any) {
      console.error('Error in initial load:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to connect to backend strap data APIs');
    } finally {
      setLoadingClusters(false);
      setLoadingProductivity(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  // 3. Fetch inputs when mine changes
  useEffect(() => {
    const fetchMineInputs = async () => {
      if (!selectedMineId) {
        setSiteInputs([]);
        setOriginalSiteInputs([]);
        return;
      }
      try {
        setLoadingInputs(true);
        const res = await api.get<MinePlanningInput[]>(`/strap-data/mine-planning-inputs?mineId=${selectedMineId}`);
        setOriginalSiteInputs(res.data);
        setSiteInputs(JSON.parse(JSON.stringify(res.data)));
      } catch (err: any) {
        console.error('Error fetching mine planning inputs:', err);
      } finally {
        setLoadingInputs(false);
      }
    };
    fetchMineInputs();
  }, [selectedMineId]);

  // 4. Fetch TOD when TOD cluster changes
  useEffect(() => {
    const fetchTodData = async () => {
      if (!selectedTodClusterId || selectedTodClusterId === 'all') {
        setTodData([]);
        setOriginalTodData([]);
        return;
      }
      try {
        setLoadingTod(true);
        const res = await api.get<ElectricalTOD[]>(`/strap-data/electrical-tod?clusterId=${selectedTodClusterId}`);
        setOriginalTodData(res.data);
        setTodData(JSON.parse(JSON.stringify(res.data)));
      } catch (err: any) {
        console.error('Error fetching electrical TOD:', err);
      } finally {
        setLoadingTod(false);
      }
    };
    fetchTodData();
  }, [selectedTodClusterId]);

  // 5. Polling for Live Data Changes
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      // Don't show notification if already showing
      if (showLiveUpdateNotification) return;
      try {
        const res = await api.get<{ lastUpdated: string }>('/strap-data/metadata');
        const lastUpdatedServer = new Date(res.data.lastUpdated).getTime();
        if (lastUpdatedServer > lastLoadedTime) {
          setShowLiveUpdateNotification(true);
        }
      } catch (err) {
        console.error('Error polling metadata:', err);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [lastLoadedTime, showLiveUpdateNotification]);

  // Check if anything has been modified (dirty state check)
  const checkIsDirty = (): boolean => {
    const vpDirty = JSON.stringify(originalVehicleProductivity) !== JSON.stringify(vehicleProductivity);
    const siDirty = JSON.stringify(originalSiteInputs) !== JSON.stringify(siteInputs);
    const todDirty = JSON.stringify(originalTodData) !== JSON.stringify(todData);
    const dirty = vpDirty || siDirty || todDirty;
    
    // Save dirty flag to local storage for navigation confirmation check
    localStorage.setItem('powershift_is_dirty', dirty ? 'true' : 'false');
    return dirty;
  };

  const isDirty = checkIsDirty();

  // Browser reload / exit prevention hook
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes.';
        return 'You have unsaved changes.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      localStorage.removeItem('powershift_is_dirty');
    };
  }, [isDirty]);

  // Handle Edit/Cancel controls
  const handleEditToggle = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditMode(true);
  };

  const handleCancel = () => {
    // Restore original values
    setVehicleProductivity(JSON.parse(JSON.stringify(originalVehicleProductivity)));
    setSiteInputs(JSON.parse(JSON.stringify(originalSiteInputs)));
    setTodData(JSON.parse(JSON.stringify(originalTodData)));
    setIsEditMode(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    localStorage.removeItem('powershift_is_dirty');
  };

  // Cell Highlight Checks (Returns true if cell is modified relative to original)
  const isCellDirty = (type: 'vp' | 'si' | 'tod', id: string, field: string, currentValue: string | number): boolean => {
    if (!isEditMode) return false;
    if (type === 'vp') {
      const original = originalVehicleProductivity.find(v => v.id === id);
      return original ? original[field] !== currentValue : false;
    } else if (type === 'si') {
      const original = originalSiteInputs.find(v => v.id === id);
      return original ? original[field] !== currentValue : false;
    } else {
      const original = originalTodData.find(v => v.id === id);
      return original ? original[field] !== currentValue : false;
    }
  };

  // Helper inputs mapping
  const handleVpChange = (id: string, field: string, val: string) => {
    let finalVal: string | number = val;
    if (field !== 'capacity' && field !== 'uom') {
      finalVal = parseFloat(val) || 0;
    }
    setVehicleProductivity(prev => prev.map(row => row.id === id ? { ...row, [field]: finalVal } : row));
  };

  const handleSiChange = (id: string, field: string, val: string, isDecimal: boolean) => {
    const numericVal = isDecimal ? (parseFloat(val) || 0) : (parseInt(val, 10) || 0);
    setSiteInputs(prev => prev.map(row => row.id === id ? { ...row, [field]: numericVal } : row));
  };

  const handleTodChange = (id: string, field: string, val: string) => {
    let finalVal: string | number = val;
    if (field === 'totalHours' || field === 'consumptionPercentage' || field === 'percentageDifferenceFactor') {
      finalVal = parseFloat(val) || 0;
    }
    setTodData(prev => prev.map(row => row.id === id ? { ...row, [field]: finalVal } : row));
  };

  // Perform Local Validation and Save trigger
  const handleSave = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    
    // 1. Vehicle productivity validation
    for (const row of vehicleProductivity) {
      if (row.avgLead < 0 || row.fy27 < 0 || row.fy28 < 0 || row.fy29 < 0 || row.fy30 < 0 || row.fy31 < 0) {
        setErrorMsg('Validation failed: Vehicle Productivity values must be non-negative numbers');
        return;
      }
    }

    // 2. Site inputs validation
    for (const row of siteInputs) {
      if (row.fy27 < 0 || row.fy28 < 0 || row.fy29 < 0 || row.fy30 < 0 || row.fy31 < 0) {
        setErrorMsg('Validation failed: Site Requirement values must be positive numbers');
        return;
      }
      const isDecimalAllowed = ['Coal Production', 'OB Production'].includes(row.particular);
      if (!isDecimalAllowed) {
        const isWhole = (val: number) => Number.isInteger(val);
        if (!isWhole(row.fy27) || !isWhole(row.fy28) || !isWhole(row.fy29) || !isWhole(row.fy30) || !isWhole(row.fy31)) {
          setErrorMsg(`Validation failed: ${row.particular} values must be whole numbers`);
          return;
        }
      }
    }

    // 3. Electrical TOD validation
    let totalPercentage = 0;
    for (const row of todData) {
      if (row.totalHours < 0 || row.totalHours > 24) {
        setErrorMsg('Validation failed: Electrical TOD hours must be between 0 and 24');
        return;
      }
      if (row.consumptionPercentage < 0 || row.consumptionPercentage > 100) {
        setErrorMsg('Validation failed: Electrical TOD consumption percentage must be between 0 and 100');
        return;
      }
      if (row.percentageDifferenceFactor < 0) {
        setErrorMsg('Validation failed: Difference factor must be a positive number');
        return;
      }
      totalPercentage += row.consumptionPercentage;
    }

    if (Math.abs(totalPercentage - 100.0) > 0.001) {
      setErrorMsg(`Validation failed: Total consumption percentage must be exactly 100%. Current sum: ${totalPercentage}%`);
      return;
    }

    // 4. Save calculations: build patch payload (PATCH only modified rows and fields)
    try {
      setSaving(true);
      
      const vpPayload: any[] = [];
      const siPayload: any[] = [];
      const todPayload: any[] = [];

      // Check modified Vehicle Productivity rows
      vehicleProductivity.forEach(row => {
        const orig = originalVehicleProductivity.find(v => v.id === row.id);
        if (orig && JSON.stringify(orig) !== JSON.stringify(row)) {
          vpPayload.push({
            id: row.id,
            updatedAt: row.updatedAt,
            capacity: row.capacity,
            uom: row.uom,
            avgLead: row.avgLead,
            fy27: row.fy27,
            fy28: row.fy28,
            fy29: row.fy29,
            fy30: row.fy30,
            fy31: row.fy31
          });
        }
      });

      // Check modified Site inputs
      siteInputs.forEach(row => {
        const orig = originalSiteInputs.find(v => v.id === row.id);
        if (orig && JSON.stringify(orig) !== JSON.stringify(row)) {
          siPayload.push({
            id: row.id,
            updatedAt: row.updatedAt,
            particular: row.particular,
            fy27: row.fy27,
            fy28: row.fy28,
            fy29: row.fy29,
            fy30: row.fy30,
            fy31: row.fy31
          });
        }
      });

      // Check modified TOD rows
      todData.forEach(row => {
        const orig = originalTodData.find(v => v.id === row.id);
        if (orig && JSON.stringify(orig) !== JSON.stringify(row)) {
          todPayload.push({
            id: row.id,
            updatedAt: row.updatedAt,
            fromTime: row.fromTime,
            toTime: row.toTime,
            totalHours: row.totalHours,
            consumptionPercentage: row.consumptionPercentage,
            percentageDifferenceFactor: row.percentageDifferenceFactor
          });
        }
      });

      // Execute Save transactions (parallel PATCH requests if edits were made)
      const savePromises = [];
      if (vpPayload.length > 0) {
        savePromises.push(api.patch('/strap-data/vehicle-productivity', vpPayload));
      }
      if (siPayload.length > 0 && selectedMineId) {
        savePromises.push(api.patch(`/strap-data/mine-planning-inputs/${selectedMineId}`, siPayload));
      }
      if (todPayload.length > 0 && selectedTodClusterId && selectedTodClusterId !== 'all') {
        savePromises.push(api.patch(`/strap-data/electrical-tod/${selectedTodClusterId}`, todPayload));
      }

      if (savePromises.length === 0) {
        setIsEditMode(false);
        setSuccessMsg('No edits were detected. Exited edit mode.');
        return;
      }

      await Promise.all(savePromises);

      // Re-fetch latest configurations and reset edits cache
      const vpRes = await api.get<VehicleProductivity[]>('/strap-data/vehicle-productivity');
      setOriginalVehicleProductivity(vpRes.data);
      setVehicleProductivity(JSON.parse(JSON.stringify(vpRes.data)));

      if (selectedMineId && selectedMineId !== 'all') {
        const siRes = await api.get<MinePlanningInput[]>(`/strap-data/mine-planning-inputs?mineId=${selectedMineId}`);
        setOriginalSiteInputs(siRes.data);
        setSiteInputs(JSON.parse(JSON.stringify(siRes.data)));
      }

      if (selectedTodClusterId && selectedTodClusterId !== 'all') {
        const todRes = await api.get<ElectricalTOD[]>(`/strap-data/electrical-tod?clusterId=${selectedTodClusterId}`);
        setOriginalTodData(todRes.data);
        setTodData(JSON.parse(JSON.stringify(todRes.data)));
      }
      
      setIsEditMode(false);
      setSuccessMsg('Strap Data saved successfully.');
      localStorage.removeItem('powershift_is_dirty');
      setLastLoadedTime(Date.now());
      setShowLiveUpdateNotification(false);
    } catch (err: any) {
      console.error('Error saving strap data:', err);
      // Handles conflict 409 Optimistic Concurrency Conflict
      if (err.response?.status === 409) {
        setErrorMsg('Concurrency Conflict: Data has changed on the server. Please reload before saving.');
      } else {
        setErrorMsg(err.response?.data?.error || 'Database save transaction failed. Edits were preserved locally.');
      }
    } finally {
      setSaving(false);
    }
  };

  // Perform Live Reload
  const handleLiveReload = () => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Reloading will discard them. Proceed?')) {
        return;
      }
    }
    fetchData();
  };

  // Check Role Permissions
  const canEditAnySection = (): boolean => {
    return user?.role === 'ADMIN' || user?.role === 'ENGINEER';
  };

  const isMineEditableByEngineer = (): boolean => {
    if (user?.role === 'ADMIN') return true;
    if (user?.role === 'ENGINEER') {
      return user.mines?.some(m => m.id === selectedMineId) || false;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Live Reload Banner Notification */}
      {showLiveUpdateNotification && (
        <div className="flex justify-between items-center px-4 py-3 bg-amber-500 text-slate-950 font-semibold text-xs rounded-xl shadow-md animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>New Strap Data is available on the server.</span>
          </div>
          <button
            onClick={handleLiveReload}
            className="flex items-center gap-1 bg-slate-950 text-white hover:bg-slate-900 px-3 py-1.5 rounded-lg text-[10px] tracking-wider uppercase font-bold"
          >
            <RefreshCw className="h-3 w-3" />
            Reload Latest
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight theme-text-primary">Strap Data</h1>
        </div>

        {/* Dynamic Action Buttons in Header */}
        <div className="flex items-center gap-3">
          {isEditMode ? (
            <>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border theme-border hover:bg-slate-800/40 theme-text-secondary font-semibold text-xs tracking-wider flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl theme-accent-btn font-bold text-xs tracking-wider flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </>
          ) : (
            canEditAnySection() && (
              <button
                onClick={handleEditToggle}
                className="px-4 py-2.5 rounded-xl theme-accent-btn font-bold text-xs tracking-wider flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                <Edit3 className="h-4 w-4" />
                Edit Strap Data
              </button>
            )
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-semibold text-rose-400">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs font-semibold text-emerald-400">
          {successMsg}
        </div>
      )}

      {/* SECTION 1: VEHICLE PRODUCTIVITY */}
      <div className="border theme-border theme-card rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm theme-text-primary">Vehicle Productivity</h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-app)] text-[var(--text-secondary)] font-bold border border-[var(--border-color)] text-[10px] tracking-wider uppercase select-none">
            <Shield className="h-3 w-3 text-indigo-500" />
            Admin Only
          </div>
        </div>

        {loadingProductivity ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b theme-border theme-text-secondary font-bold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Equipment</th>
                  <th className="pb-3 px-4">Particulars</th>
                  <th className="pb-3 px-4">Capacity</th>
                  <th className="pb-3 px-4">UoM</th>
                  <th className="pb-3 px-4">Avg Lead (Km)</th>
                  <th className="pb-3 px-4">FY'27</th>
                  <th className="pb-3 px-4">FY'28</th>
                  <th className="pb-3 px-4">FY'29</th>
                  <th className="pb-3 px-4">FY'30</th>
                  <th className="pb-3 pl-4">FY'31</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border theme-text-primary">
                {vehicleProductivity.map((prod) => {
                  const isSectionEditable = isEditMode && user?.role === 'ADMIN';

                  return (
                    <tr key={prod.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 pr-4 font-semibold theme-text-primary">{prod.equipment}</td>
                      <td className="py-3.5 px-4 theme-text-secondary">{prod.particular}</td>
                      <td className={`py-2 px-3 font-mono transition-colors ${isCellDirty('vp', prod.id, 'capacity', prod.capacity) ? 'bg-amber-500/10 border border-amber-500/20' : ''}`}>
                        {isSectionEditable ? (
                          <input
                            type="text"
                            value={prod.capacity}
                            onChange={(e) => handleVpChange(prod.id, 'capacity', e.target.value)}
                            className="w-16 px-1.5 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-center font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                          />
                        ) : (
                          prod.capacity
                        )}
                      </td>
                      <td className={`py-2 px-3 font-mono transition-colors ${isCellDirty('vp', prod.id, 'uom', prod.uom) ? 'bg-amber-500/10 border border-amber-500/20' : ''}`}>
                        {isSectionEditable ? (
                          <input
                            type="text"
                            value={prod.uom}
                            onChange={(e) => handleVpChange(prod.id, 'uom', e.target.value)}
                            className="w-16 px-1.5 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-center font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                          />
                        ) : (
                          prod.uom
                        )}
                      </td>
                      
                      {/* Avg Lead Cell */}
                      <td className={`py-2 px-3 font-mono transition-colors ${isCellDirty('vp', prod.id, 'avgLead', prod.avgLead) ? 'bg-amber-500/10 border border-amber-500/20' : ''}`}>
                        {isSectionEditable ? (
                          <input
                            type="number"
                            step="0.01"
                            value={prod.avgLead}
                            onChange={(e) => handleVpChange(prod.id, 'avgLead', e.target.value)}
                            className="w-16 px-1.5 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-center font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                          />
                        ) : (
                          prod.avgLead
                        )}
                      </td>

                      {/* FY Years Cells */}
                      {['fy27', 'fy28', 'fy29', 'fy30', 'fy31'].map((fy) => {
                        const val = (prod as any)[fy];
                        return (
                          <td key={fy} className={`py-2 px-3 font-mono transition-colors ${isCellDirty('vp', prod.id, fy, val) ? 'bg-amber-500/10 border border-amber-500/20' : ''}`}>
                            {isSectionEditable ? (
                              <input
                                type="number"
                                step="0.01"
                                value={val}
                                onChange={(e) => handleVpChange(prod.id, fy, e.target.value)}
                                className="w-16 px-1.5 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-center font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                              />
                            ) : (
                              val.toFixed(2)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: SITE PLANNING INPUTS */}
      <div className="border theme-border theme-card rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm theme-text-primary">Site Requirements & Available Power</h2>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Select Mine</span>
              <MineSelector
                clusters={clusters}
                value={selectedMineId}
                onChange={(mId) => {
                  if (isDirty) {
                    if (!window.confirm('Discard unsaved changes?')) return;
                  }
                  setSelectedMineId(mId);
                  if (mId === '' || mId === 'all') {
                    setSelectedClusterId('');
                  } else {
                    const mineObj = clusters.flatMap(c => c.mines).find(m => m.id === mId);
                    if (mineObj) {
                      setSelectedClusterId(mineObj.clusterId);
                    }
                  }
                }}
                disabled={isEditMode}
                className="min-w-[200px]"
              />
            </div>

            <div className="flex items-center gap-1.5 mt-4 md:mt-0 px-3 py-1 rounded-full bg-[var(--bg-app)] text-[10px] font-bold tracking-wider uppercase select-none border border-[var(--border-color)]">
              {isMineEditableByEngineer() ? (
                <span className="text-emerald-600 dark:text-emerald-400">Edit Active</span>
              ) : (
                <span className="text-[var(--text-secondary)]">Read Only</span>
              )}
            </div>
          </div>
        </div>

        {!selectedMineId ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-950/5 border border-dashed theme-border rounded-xl">
            <Database className="h-8 w-8 text-slate-500 mb-2 opacity-50" />
            <p className="text-xs font-semibold theme-text-secondary">Please select a specific mine from the dropdown selector to view or edit site requirements.</p>
          </div>
        ) : loadingInputs ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b theme-border theme-text-secondary font-bold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Particulars</th>
                  <th className="pb-3 px-4">Capacity</th>
                  <th className="pb-3 px-4">UoM</th>
                  <th className="pb-3 px-3">FY27</th>
                  <th className="pb-3 px-3">FY28</th>
                  <th className="pb-3 px-3">FY29</th>
                  <th className="pb-3 px-3">FY30</th>
                  <th className="pb-3 px-3">FY31</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border theme-text-primary">
                {siteInputs.map((input) => {
                  const isSectionEditable = isEditMode && isMineEditableByEngineer();
                  const isDecimal = ['Coal Production', 'OB Production'].includes(input.particular);

                  return (
                    <tr key={input.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 pr-4 font-semibold theme-text-primary">{input.particular}</td>
                      <td className="py-3.5 px-4 font-mono">-</td>
                      <td className="py-3.5 px-4 theme-text-secondary">{input.uom}</td>

                      {/* FY Years Cells */}
                      {['fy27', 'fy28', 'fy29', 'fy30', 'fy31'].map((fy) => {
                        const val = (input as any)[fy];
                        return (
                          <td key={fy} className={`py-2 px-3 font-mono transition-colors ${isCellDirty('si', input.id, fy, val) ? 'bg-amber-500/10 border border-amber-500/20' : ''}`}>
                            {isSectionEditable ? (
                              <input
                                type="number"
                                step={isDecimal ? '0.01' : '1'}
                                value={val}
                                onChange={(e) => handleSiChange(input.id, fy, e.target.value, isDecimal)}
                                className="w-16 px-1.5 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-center font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                              />
                            ) : (
                              isDecimal ? val.toFixed(2) : val.toFixed(0)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 3: ELECTRICAL TIME OF DAY */}
      <div className="border theme-border theme-card rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm theme-text-primary">Electrical TOD</h2>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-app)] text-[var(--text-secondary)] font-bold border border-[var(--border-color)] text-[10px] tracking-wider uppercase select-none mr-2">
              <Shield className="h-3 w-3 text-purple-500" />
              Admin Only
            </div>
            <div className="flex flex-col min-w-[220px]">
              <ClusterSelector
                clusters={clusters}
                value={selectedTodClusterId}
                onChange={(cId) => {
                  if (isDirty) {
                    if (!window.confirm('Discard unsaved changes?')) return;
                  }
                  setSelectedTodClusterId(cId);
                }}
                disabled={isEditMode}
              />
            </div>
          </div>
        </div>

        {selectedTodClusterId === 'all' ? (
          <div className="flex flex-col items-center justify-center py-16 text-center bg-slate-950/5 border border-dashed theme-border rounded-xl">
            <Zap className="h-8 w-8 text-slate-500 mb-2 opacity-50" />
            <p className="text-xs font-semibold theme-text-secondary">Please select a specific cluster from the dropdown selector to view or edit Electrical TOD windows.</p>
          </div>
        ) : loadingTod ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse text-xs">
              <thead>
                <tr className="border-b theme-border theme-text-secondary font-bold uppercase tracking-wider">
                  <th className="pb-3 text-left">Period</th>
                  <th className="pb-3 px-4">From Time</th>
                  <th className="pb-3 px-4">To Time</th>
                  <th className="pb-3 px-4">Total Hours</th>
                  <th className="pb-3 px-4">Consumption Percentage (%)</th>
                  <th className="pb-3 pl-4">Difference Factor</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border theme-text-primary">
                {todData.map((row) => {
                  const isSectionEditable = isEditMode && user?.role === 'ADMIN';

                  return (
                    <tr key={row.id} className="hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 text-left font-semibold theme-text-primary">{row.period}</td>
                      
                      {/* From Time */}
                      <td className={`py-2 px-3 font-mono transition-colors ${isCellDirty('tod', row.id, 'fromTime', row.fromTime) ? 'bg-amber-500/10 border border-amber-500/20' : ''}`}>
                        {isSectionEditable ? (
                          <input
                            type="text"
                            placeholder="HH:MM"
                            value={row.fromTime}
                            onChange={(e) => handleTodChange(row.id, 'fromTime', e.target.value)}
                            className="w-16 px-1.5 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-center font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                          />
                        ) : (
                          row.fromTime
                        )}
                      </td>

                      {/* To Time */}
                      <td className={`py-2 px-3 font-mono transition-colors ${isCellDirty('tod', row.id, 'toTime', row.toTime) ? 'bg-amber-500/10 border border-amber-500/20' : ''}`}>
                        {isSectionEditable ? (
                          <input
                            type="text"
                            placeholder="HH:MM"
                            value={row.toTime}
                            onChange={(e) => handleTodChange(row.id, 'toTime', e.target.value)}
                            className="w-16 px-1.5 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-center font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                          />
                        ) : (
                          row.toTime
                        )}
                      </td>

                      {/* Total Hours */}
                      <td className={`py-2 px-3 font-mono transition-colors ${isCellDirty('tod', row.id, 'totalHours', row.totalHours) ? 'bg-amber-500/10 border border-amber-500/20' : ''}`}>
                        {isSectionEditable ? (
                          <input
                            type="number"
                            step="0.01"
                            value={row.totalHours}
                            onChange={(e) => handleTodChange(row.id, 'totalHours', e.target.value)}
                            className="w-16 px-1.5 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-center font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                          />
                        ) : (
                          row.totalHours.toFixed(2)
                        )}
                      </td>

                      {/* Consumption % */}
                      <td className={`py-2 px-3 font-mono transition-colors ${isCellDirty('tod', row.id, 'consumptionPercentage', row.consumptionPercentage) ? 'bg-amber-500/10 border border-amber-500/20' : ''}`}>
                        {isSectionEditable ? (
                          <input
                            type="number"
                            step="0.01"
                            value={row.consumptionPercentage}
                            onChange={(e) => handleTodChange(row.id, 'consumptionPercentage', e.target.value)}
                            className="w-16 px-1.5 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-center font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                          />
                        ) : (
                          `${row.consumptionPercentage.toFixed(2)}%`
                        )}
                      </td>

                      {/* Difference Factor */}
                      <td className={`py-2 pl-3 font-mono transition-colors ${isCellDirty('tod', row.id, 'percentageDifferenceFactor', row.percentageDifferenceFactor) ? 'bg-amber-500/10 border border-amber-500/20' : ''}`}>
                        {isSectionEditable ? (
                          <input
                            type="number"
                            step="0.01"
                            value={row.percentageDifferenceFactor}
                            onChange={(e) => handleTodChange(row.id, 'percentageDifferenceFactor', e.target.value)}
                            className="w-16 px-1.5 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-color)] text-[var(--text-primary)] text-center font-mono focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                          />
                        ) : (
                          row.percentageDifferenceFactor.toFixed(2)
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrapData;
