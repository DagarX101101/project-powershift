export interface User {
  id: string;
  email: string;
  name: string;
  department?: string | null;
  mobileNumber?: string | null;
  role: 'ADMIN' | 'ENGINEER' | 'VIEWER';
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  mustChangePassword: boolean;
  profilePhoto?: string | null;
  themePreference?: string;
  lastLoginAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface Cluster {
  id: string;
  name: string;
}

export interface Mine {
  id: string;
  name: string;
  clusterId: string;
  cluster?: Cluster;
}

export interface FinancialYear {
  id: string;
  yearCode: string;
  isActive: boolean;
}

export interface VehicleProductivity {
  id: string;
  vehicleType: string;
  targetHaulage: number;
  distance: number;
  uom: string;
  version: number;
  isActive: boolean;
}

export interface SiteInput {
  id: string;
  mineId: string;
  financialYearId: string;
  coalProduction: number;
  obProduction: number;
  chpWasheryMiningReq: number; // in MVA Apparent Power
  totalAvailablePower: number; // in MVA Apparent Power
  version: number;
  isActive: boolean;
}

export interface ElectricalTod {
  id: string;
  clusterId: string;
  normalHours: number;
  peakHours: number;
  offPeakHours: number;
  normalPercent: number;
  peakPercent: number;
  offPeakPercent: number;
  differenceFactor: number;
  version: number;
  isActive: boolean;
}

// Master Sheet Computed Row representation (Generated dynamically in-memory)
export interface MasterSheetRow {
  mineId: string;
  mineName: string;
  clusterName: string;
  coalProduction: number;
  obProduction: number;
  chpWasheryMiningReq: number; // MVA
  totalAvailablePower: number; // MVA
  totalEvFleet: number;        // calculated number of EVs
  totalRequiredPower: number;  // calculated required power in MVA
  vehiclesDeployable: number;  // calculated vehicles deployable
}
