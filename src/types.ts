export type AmbulanceStatus =
  | 'RESPONDING' // Code 3: Lights & siren to emergency scene
  | 'ON_SCENE' // Paramedics treating patient at location
  | 'EN_ROUTE_HOSPITAL' // Transporting patient to hospital ER
  | 'AT_HOSPITAL' // At hospital emergency room / patient transfer
  | 'AVAILABLE' // Ready for immediate emergency dispatch
  | 'MAINTENANCE' // Out of service / refuel / restock
  // Backward-compatibility aliases
  | 'COLLECTING'
  | 'IN_TRANSIT'
  | 'DUMPING'
  | 'IDLE'
  | 'BREAKDOWN'
  | 'OFF_DUTY';

export type VehicleStatus = AmbulanceStatus;

export type AmbulanceType =
  | 'ALS (Advanced Life Support)'
  | 'BLS (Basic Life Support)'
  | 'Cardiac ICU Mobile Unit'
  | 'Neonatal Intensive Care'
  | 'Rapid Emergency Response Unit';

export type VehicleType = AmbulanceType | 'Auto Tipper' | 'Mini Hydraulic Compactor' | 'E-Waste Cart' | 'Open Tipper';

export type WasteCategory = string;

export type ZoneName = 'Central' | 'North' | 'South' | 'East' | 'West';

export type TriageLevel = 'CRITICAL' | 'URGENT' | 'STABLE' | 'STANDBY';

export interface LocationPoint {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number; // in km/h
  accuracy?: number; // in meters
  timestamp: number;
}

export interface HospitalFacility {
  id: string;
  name: string;
  type: 'Level 1 Trauma Center' | 'Multi-Specialty Emergency' | 'Cardiac Care Center' | 'Children & Neonatal ER' | 'General District Hospital';
  lat: number;
  lng: number;
  availableBeds: number;
  traumaLevel: string;
  emergencyPhone: string;
  capacityTonsPerDay?: number; // backward compatibility
}

export type WasteFacility = HospitalFacility;

export interface Ambulance {
  id: string; // e.g. "AMB-001"
  regNumber: string; // e.g. "KA-01-AMB-1001"
  vehicleType: AmbulanceType;
  driverName: string;
  driverPhone: string;
  paramedicName: string;
  paramedicRank: string;
  ward: string; // District / Sector (e.g. "Sector 04 - Malleshwaram")
  wardNumber: number;
  zone: ZoneName;
  routeId: string; // Dispatch Call ID e.g. "CALL-294"
  status: AmbulanceStatus;
  currentLocation: LocationPoint;
  locationHistory: LocationPoint[];
  batteryLevel: number; // 0-100
  fuelOrCharge: number; // 0-100
  oxygenLevel: number; // 0-100% Medical O2 Tank
  targetHospital: string;
  patientTriage: TriageLevel;
  sirenActive: boolean;
  code3Active: boolean; // Lights & Siren emergency
  isPhoneConnected: boolean;
  phoneDeviceModel?: string;
  lastPingAt: number;
  rfidTag: string; // Medical inventory tag
  shift: string;
  sosActive?: boolean;
  notes?: string;
  // Backward compatibility fields
  wasteCategory?: string;
  binsCollected?: number;
  targetBins?: number;
  totalWeightKg?: number;
}

export type SWMAuto = Ambulance;

export interface RegisterAmbulancePayload {
  regNumber: string;
  customId?: string;
  vehicleType: AmbulanceType;
  driverName: string;
  driverPhone: string;
  paramedicName: string;
  paramedicRank?: string;
  ward: string;
  wardNumber?: number;
  zone: ZoneName;
  targetHospital?: string;
  routeId?: string;
  notes?: string;
  // Backward compatibility
  wasteCategory?: string;
  targetBins?: number;
  rfidTag?: string;
}

export type RegisterAutoPayload = RegisterAmbulancePayload;

export interface FleetStats {
  totalAmbulances: number;
  activeResponding: number;
  onScene: number;
  enRouteHospital: number;
  atHospital: number;
  availableForDispatch: number;
  maintenanceOrSos: number;
  phoneConnectedCount: number;
  activeCode3Emergencies: number;
  avgResponseTimeMin: number;
  activeAlertsCount: number;
  // Backward compatibility
  totalAutos?: number;
  activeCollecting?: number;
  inTransit?: number;
  atDumpingYard?: number;
  idleOrOffDuty?: number;
  breakdown?: number;
  totalBinsCollected?: number;
  totalWeightCollectedTons?: number;
  totalDistanceKm?: number;
}

export interface FleetAlert {
  id: string;
  autoId: string;
  regNumber: string;
  driverName: string;
  type: 'SOS' | 'CODE_3_DISPATCH' | 'OVERSPEED' | 'ROUTE_DEVIATION' | 'LOW_OXYGEN' | 'PATIENT_CRITICAL';
  message: string;
  timestamp: number;
  severity: 'high' | 'medium' | 'low';
  lat: number;
  lng: number;
  hospitalTarget?: string;
}
