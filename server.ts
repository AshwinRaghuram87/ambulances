import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import type {
  Ambulance,
  AmbulanceStatus,
  AmbulanceType,
  ZoneName,
  LocationPoint,
  FleetStats,
  FleetAlert,
  HospitalFacility,
  RegisterAmbulancePayload,
  TriageLevel,
} from './src/types.ts';

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// Center: Bangalore Metropolitan Emergency Zone
const CITY_CENTER = { lat: 12.9716, lng: 77.5946 };

const ZONES: ZoneName[] = ['Central', 'North', 'South', 'East', 'West'];

const ZONE_OFFSETS: Record<ZoneName, { dLat: number; dLng: number }> = {
  Central: { dLat: 0.0, dLng: 0.0 },
  North: { dLat: 0.055, dLng: 0.015 },
  South: { dLat: -0.058, dLng: -0.012 },
  East: { dLat: 0.012, dLng: 0.065 },
  West: { dLat: -0.008, dLng: -0.062 },
};

const SECTORS_DATA = [
  { num: 1, name: 'Kempegowda Metro Sector', zone: 'North' as ZoneName },
  { num: 2, name: 'Chowdeshwari Medical Hub', zone: 'North' as ZoneName },
  { num: 3, name: 'Atturu Emergency Ring', zone: 'North' as ZoneName },
  { num: 4, name: 'Yelahanka Trauma Sector', zone: 'North' as ZoneName },
  { num: 5, name: 'Malleshwaram Central ER', zone: 'Central' as ZoneName },
  { num: 6, name: 'Rajajinagar Hospital Belt', zone: 'West' as ZoneName },
  { num: 7, name: 'Shivajinagar Acute Sector', zone: 'Central' as ZoneName },
  { num: 8, name: 'Shanthi Nagar Station', zone: 'Central' as ZoneName },
  { num: 9, name: 'Jayanagar Emergency Zone', zone: 'South' as ZoneName },
  { num: 10, name: 'Basavanagudi Medical Ring', zone: 'South' as ZoneName },
  { num: 11, name: 'JP Nagar Cardiac Sector', zone: 'South' as ZoneName },
  { num: 12, name: 'BTM Layout Trauma Unit', zone: 'South' as ZoneName },
  { num: 13, name: 'Indiranagar 100ft Medical', zone: 'East' as ZoneName },
  { num: 14, name: 'Halasuru Lake EMS Station', zone: 'East' as ZoneName },
  { num: 15, name: 'Domlur Tech Park ER', zone: 'East' as ZoneName },
  { num: 16, name: 'Koramangala 5th Block Station', zone: 'South' as ZoneName },
  { num: 17, name: 'Vijayanagar Trauma Zone', zone: 'West' as ZoneName },
  { num: 18, name: 'Mahalakshmi Rapid Base', zone: 'West' as ZoneName },
  { num: 19, name: 'Yeshwanthpur Express Hub', zone: 'North' as ZoneName },
  { num: 20, name: 'Hebbal Emergency Highway', zone: 'North' as ZoneName },
];

const AMBULANCE_TYPES: AmbulanceType[] = [
  'ALS (Advanced Life Support)',
  'BLS (Basic Life Support)',
  'Cardiac ICU Mobile Unit',
  'Neonatal Intensive Care',
  'Rapid Emergency Response Unit',
];

const DRIVER_NAMES = [
  'Ramesh Kumar', 'Suresh Gowda', 'Mohammed Arif', 'Anand Raj', 'Rajesh Sharma',
  'Vikram Singh', 'Manjunath B.', 'Santosh Patil', 'Praveen Reddy', 'Syed Nayeem',
  'Karthik S.', 'Sunil Jadhav', 'Dharmendra Yadav', 'Ganesh Murthy', 'Vijay Kulkarni',
  'Naveen Prasad', 'Abdul Rahim', 'Mahesh Hegde', 'Chandrashekhar', 'Raju Nayak',
  'Harish Rao', 'Shiva Shankar', 'Deepak Verma', 'Lokesh Kumar', 'Pradeep Shenoy'
];

const PARAMEDIC_NAMES = [
  'Dr. Ananya Sen, EMT-P', 'Nisha Sharma, Paramedic', 'Pooja Varma, Critical Care',
  'Arun Nair, Senior EMT', 'Meera Krishnan, Paramedic', 'Kavita Roy, Trauma Specialist',
  'Siddharth Joshi, Flight Paramedic', 'Divya Menon, Pediatric EMT', 'Rohan Gupta, ALS Lead',
  'Sneha Patil, EMT-Intermediate', 'Rahul Saxena, Critical EMT', 'Deepa Bhat, Paramedic Lead'
];

const HOSPITALS: HospitalFacility[] = [
  {
    id: 'HOSP-01',
    name: 'Apollo Emergency Trauma & Cardiac Center',
    type: 'Level 1 Trauma Center',
    lat: CITY_CENTER.lat + 0.025,
    lng: CITY_CENTER.lng + 0.035,
    availableBeds: 24,
    traumaLevel: 'Level 1',
    emergencyPhone: '1066',
    capacityTonsPerDay: 24,
  },
  {
    id: 'HOSP-02',
    name: 'Manipal Hospital 24/7 Acute Care & ER',
    type: 'Multi-Specialty Emergency',
    lat: CITY_CENTER.lat - 0.032,
    lng: CITY_CENTER.lng + 0.048,
    availableBeds: 18,
    traumaLevel: 'Level 1',
    emergencyPhone: '080-2502-4444',
    capacityTonsPerDay: 18,
  },
  {
    id: 'HOSP-03',
    name: 'Fortis Emergency & Heart Care Unit',
    type: 'Cardiac Care Center',
    lat: CITY_CENTER.lat - 0.048,
    lng: CITY_CENTER.lng - 0.025,
    availableBeds: 15,
    traumaLevel: 'Level 2',
    emergencyPhone: '105711',
    capacityTonsPerDay: 15,
  },
  {
    id: 'HOSP-04',
    name: 'Victoria Govt. General & Trauma Emergency',
    type: 'Level 1 Trauma Center',
    lat: CITY_CENTER.lat - 0.008,
    lng: CITY_CENTER.lng - 0.022,
    availableBeds: 32,
    traumaLevel: 'Level 1 State Apex',
    emergencyPhone: '108',
    capacityTonsPerDay: 32,
  },
  {
    id: 'HOSP-05',
    name: 'Narayana Institute of Cardiac Sciences ER',
    type: 'Cardiac Care Center',
    lat: CITY_CENTER.lat - 0.082,
    lng: CITY_CENTER.lng + 0.038,
    availableBeds: 20,
    traumaLevel: 'Level 1',
    emergencyPhone: '080-7122-2222',
    capacityTonsPerDay: 20,
  },
  {
    id: 'HOSP-06',
    name: 'Bowring & Lady Curzon Emergency Hospital',
    type: 'General District Hospital',
    lat: CITY_CENTER.lat + 0.015,
    lng: CITY_CENTER.lng - 0.010,
    availableBeds: 28,
    traumaLevel: 'Level 2',
    emergencyPhone: '080-2559-1325',
    capacityTonsPerDay: 28,
  },
];

// Initialize 20 Ambulances
const ambulances: Map<string, Ambulance> = new Map();
const alerts: FleetAlert[] = [];

function generateInitialFleet(count = 20) {
  for (let i = 1; i <= count; i++) {
    const id = `AMB-${String(i).padStart(3, '0')}`;
    const sectorObj = SECTORS_DATA[(i - 1) % SECTORS_DATA.length];
    const zoneOffset = ZONE_OFFSETS[sectorObj.zone];
    
    // Distribute around sector center
    const angle = (i * 137.5 * Math.PI) / 180;
    const radius = 0.008 + ((i % 10) * 0.002);
    const lat = CITY_CENTER.lat + zoneOffset.dLat + Math.cos(angle) * radius;
    const lng = CITY_CENTER.lng + zoneOffset.dLng + Math.sin(angle) * radius;

    const vType = AMBULANCE_TYPES[(i - 1) % AMBULANCE_TYPES.length];
    const driverName = DRIVER_NAMES[(i - 1) % DRIVER_NAMES.length] + ` (${(i % 7) + 1})`;
    const driverPhone = `+91 98${String(40000000 + i * 317).slice(0, 8)}`;
    const paramedicName = PARAMEDIC_NAMES[(i - 1) % PARAMEDIC_NAMES.length];

    // Status distribution: Responding, On Scene, En Route Hospital, Available
    let status: AmbulanceStatus = 'AVAILABLE';
    let code3Active = false;
    let sirenActive = false;
    let patientTriage: TriageLevel = 'STANDBY';

    if (i % 5 === 1) {
      status = 'RESPONDING';
      code3Active = true;
      sirenActive = true;
      patientTriage = 'CRITICAL';
    } else if (i % 5 === 2) {
      status = 'ON_SCENE';
      code3Active = true;
      sirenActive = false;
      patientTriage = 'URGENT';
    } else if (i % 5 === 3) {
      status = 'EN_ROUTE_HOSPITAL';
      code3Active = true;
      sirenActive = true;
      patientTriage = i % 2 === 0 ? 'CRITICAL' : 'URGENT';
    } else if (i % 5 === 4) {
      status = 'AT_HOSPITAL';
      code3Active = false;
      sirenActive = false;
      patientTriage = 'STABLE';
    } else if (i === 13) {
      status = 'MAINTENANCE';
    }

    const targetHosp = HOSPITALS[(i - 1) % HOSPITALS.length].name;
    const speed = status === 'RESPONDING' || status === 'EN_ROUTE_HOSPITAL' 
      ? 48 + (i % 22) 
      : status === 'AVAILABLE' 
      ? 15 + (i % 10) 
      : 0;

    const initialPoint: LocationPoint = {
      lat,
      lng,
      speed,
      heading: (i * 45) % 360,
      accuracy: 3 + (i % 4),
      timestamp: Date.now() - (i % 20) * 1000,
    };

    const amb: Ambulance = {
      id,
      regNumber: `KA-01-AMB-${String(1000 + i)}`,
      vehicleType: vType,
      driverName,
      driverPhone,
      paramedicName,
      paramedicRank: vType.includes('ALS') || vType.includes('Cardiac') ? 'Senior Paramedic' : 'Emergency EMT',
      ward: `Sector ${String(sectorObj.num).padStart(2, '0')} - ${sectorObj.name}`,
      wardNumber: sectorObj.num,
      zone: sectorObj.zone,
      routeId: `CALL-EMG-${String(900 + i)}`,
      status,
      currentLocation: initialPoint,
      locationHistory: [
        {
          lat: lat - 0.0018,
          lng: lng - 0.0014,
          timestamp: Date.now() - 60000,
          speed: speed - 4,
        },
        {
          lat: lat - 0.0009,
          lng: lng - 0.0007,
          timestamp: Date.now() - 30000,
          speed,
        },
        initialPoint,
      ],
      batteryLevel: Math.max(45, 100 - (i % 50)),
      fuelOrCharge: Math.max(40, 95 - (i % 45)),
      oxygenLevel: Math.max(35, 98 - ((i * 3) % 60)), // Medical oxygen %
      targetHospital: targetHosp,
      patientTriage,
      sirenActive,
      code3Active,
      isPhoneConnected: i === 1 || i === 7, // live demo connections
      phoneDeviceModel: i === 1 ? 'Paramedic Toughpad G2' : undefined,
      lastPingAt: Date.now() - (i % 15) * 1000,
      rfidTag: `MED-KIT-${String(77000 + i)}`,
      shift: i % 2 === 0 ? 'Day Emergency Shift (07:00 - 19:00)' : 'Night Trauma Shift (19:00 - 07:00)',
      sosActive: i === 13,
      notes: status === 'RESPONDING' 
        ? 'Code 3 Emergency: Cardiac chest pain reported by caller' 
        : status === 'EN_ROUTE_HOSPITAL' 
        ? `Transporting patient under oxygen support to ${targetHosp}`
        : 'Standby for regional 108 dispatch',
      binsCollected: Math.floor(10 + (i % 20)),
      targetBins: 30,
      totalWeightKg: 0,
      wasteCategory: 'Medical First Response',
    };

    ambulances.set(id, amb);
  }

  // Initial Emergency Alerts
  alerts.push(
    {
      id: 'ALT-EMG-101',
      autoId: 'AMB-001',
      regNumber: 'KA-01-AMB-1001',
      driverName: 'Ramesh Kumar (1)',
      type: 'CODE_3_DISPATCH',
      message: '🚨 CODE 3 DISPATCH: Suspected Acute Myocardial Infarction. Sirens and beacons active.',
      timestamp: Date.now() - 3 * 60 * 1000,
      severity: 'high',
      lat: CITY_CENTER.lat + 0.012,
      lng: CITY_CENTER.lng + 0.014,
      hospitalTarget: 'Apollo Emergency Trauma & Cardiac Center',
    },
    {
      id: 'ALT-EMG-102',
      autoId: 'AMB-013',
      regNumber: 'KA-01-AMB-1013',
      driverName: 'Santosh Patil (7)',
      type: 'SOS',
      message: '⚠️ AMBULANCE SOS: Minor mechanical overheating en route. Backup unit requested.',
      timestamp: Date.now() - 11 * 60 * 1000,
      severity: 'high',
      lat: CITY_CENTER.lat + 0.056,
      lng: CITY_CENTER.lng + 0.014,
      hospitalTarget: 'Manipal Hospital 24/7 Acute Care & ER',
    },
    {
      id: 'ALT-EMG-103',
      autoId: 'AMB-016',
      regNumber: 'KA-01-AMB-1016',
      driverName: 'Naveen Prasad (2)',
      type: 'PATIENT_CRITICAL',
      message: '🩺 Critical patient telemetry: SPO2 88%, High-flow oxygen administered.',
      timestamp: Date.now() - 7 * 60 * 1000,
      severity: 'high',
      lat: CITY_CENTER.lat - 0.024,
      lng: CITY_CENTER.lng + 0.032,
      hospitalTarget: 'Fortis Emergency & Heart Care Unit',
    }
  );
}

generateInitialFleet(20);

// SSE Client list
type SSEClient = { id: number; res: express.Response };
const sseClients: SSEClient[] = [];
let nextClientId = 1;

function broadcastToClients(data: object) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].res.write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }

  // Also broadcast to WebSockets
  const wsMsg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(wsMsg);
    }
  });
}

// Background simulation ticker for ambulances
setInterval(() => {
  const now = Date.now();
  const updatedAmbulances: Array<{
    id: string;
    location: LocationPoint;
    status: AmbulanceStatus;
    siren: boolean;
    oxygen: number;
    triage: TriageLevel;
  }> = [];

  ambulances.forEach((amb) => {
    if (amb.isPhoneConnected && now - amb.lastPingAt < 30000) {
      return;
    } else if (amb.isPhoneConnected && now - amb.lastPingAt >= 30000) {
      amb.isPhoneConnected = false;
    }

    if (amb.status === 'RESPONDING' || amb.status === 'EN_ROUTE_HOSPITAL' || amb.status === 'AVAILABLE') {
      const headingRad = ((amb.currentLocation.heading || 0) * Math.PI) / 180;
      // Step faster for ambulances in emergency mode
      const isEmergency = amb.status === 'RESPONDING' || amb.status === 'EN_ROUTE_HOSPITAL';
      const step = 0.00015 * (isEmergency ? 2.2 : 0.9);
      
      const newHeading = ((amb.currentLocation.heading || 0) + (Math.random() * 24 - 12) + 360) % 360;
      const newLat = amb.currentLocation.lat + Math.cos(headingRad) * step;
      const newLng = amb.currentLocation.lng + Math.sin(headingRad) * step;

      const newSpeed = isEmergency
        ? Math.floor(45 + Math.random() * 25) 
        : Math.floor(18 + Math.random() * 12);

      const newPoint: LocationPoint = {
        lat: newLat,
        lng: newLng,
        heading: Math.round(newHeading),
        speed: newSpeed,
        accuracy: 3,
        timestamp: now,
      };

      amb.currentLocation = newPoint;
      amb.locationHistory.push(newPoint);
      if (amb.locationHistory.length > 30) {
        amb.locationHistory.shift();
      }

      // Small oxygen consumption when patient is aboard
      if (amb.status === 'EN_ROUTE_HOSPITAL' && Math.random() < 0.1 && amb.oxygenLevel > 20) {
        amb.oxygenLevel -= 1;
      }

      updatedAmbulances.push({
        id: amb.id,
        location: newPoint,
        status: amb.status,
        siren: amb.sirenActive,
        oxygen: amb.oxygenLevel,
        triage: amb.patientTriage,
      });
    }
  });

  if (updatedAmbulances.length > 0) {
    broadcastToClients({
      type: 'FLEET_TICK',
      timestamp: now,
      updates: updatedAmbulances,
    });
  }
}, 3000);

// API Endpoints

// 1. Get all ambulances (supports filtering query params)
app.get('/api/autos', (req, res) => {
  const { zone, status, search, limit } = req.query;
  let list = Array.from(ambulances.values());

  if (zone && typeof zone === 'string' && zone !== 'ALL') {
    list = list.filter((a) => a.zone.toLowerCase() === zone.toLowerCase());
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    list = list.filter((a) => a.status.toLowerCase() === status.toLowerCase());
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    list = list.filter(
      (a) =>
        a.id.toLowerCase().includes(q) ||
        a.regNumber.toLowerCase().includes(q) ||
        a.driverName.toLowerCase().includes(q) ||
        a.paramedicName.toLowerCase().includes(q) ||
        a.ward.toLowerCase().includes(q) ||
        a.targetHospital.toLowerCase().includes(q) ||
        a.vehicleType.toLowerCase().includes(q)
    );
  }

  if (limit && !isNaN(Number(limit))) {
    list = list.slice(0, Number(limit));
  }

  res.json({
    success: true,
    total: ambulances.size,
    count: list.length,
    autos: list,
  });
});

// Also provide /api/ambulances route alias
app.get('/api/ambulances', (req, res) => {
  res.redirect(307, '/api/autos');
});

// 2. Get single ambulance with history
app.get('/api/autos/:id', (req, res) => {
  const amb = ambulances.get(req.params.id);
  if (!amb) {
    return res.status(404).json({ success: false, error: 'Ambulance not found' });
  }
  res.json({ success: true, auto: amb });
});

// 3. Register New Ambulance
app.post('/api/autos/register', (req, res) => {
  const payload: RegisterAmbulancePayload = req.body;

  if (!payload.regNumber || !payload.driverName || !payload.driverPhone) {
    return res.status(400).json({
      success: false,
      error: 'Ambulance registration number, driver name, and phone are required',
    });
  }

  const nextIndex = ambulances.size + 1;
  const newId = payload.customId || `AMB-${String(nextIndex).padStart(3, '0')}`;

  if (ambulances.has(newId)) {
    return res.status(400).json({ success: false, error: `Ambulance ID ${newId} already exists` });
  }

  const zone = payload.zone || 'Central';
  const zoneOffset = ZONE_OFFSETS[zone] || { dLat: 0, dLng: 0 };
  const baseLat = CITY_CENTER.lat + zoneOffset.dLat + (Math.random() * 0.01 - 0.005);
  const baseLng = CITY_CENTER.lng + zoneOffset.dLng + (Math.random() * 0.01 - 0.005);

  const initialPoint: LocationPoint = {
    lat: baseLat,
    lng: baseLng,
    speed: 0,
    heading: 0,
    accuracy: 3,
    timestamp: Date.now(),
  };

  const newAmb: Ambulance = {
    id: newId,
    regNumber: payload.regNumber.toUpperCase().trim(),
    vehicleType: payload.vehicleType || 'ALS (Advanced Life Support)',
    driverName: payload.driverName.trim(),
    driverPhone: payload.driverPhone.trim(),
    paramedicName: payload.paramedicName || 'Assigned Paramedic',
    paramedicRank: payload.paramedicRank || 'EMT-P Critical Care',
    ward: payload.ward || 'Sector 08 - Shanthi Nagar Medical Station',
    wardNumber: payload.wardNumber || 8,
    zone,
    routeId: payload.routeId || `CALL-EMG-${String(900 + nextIndex)}`,
    status: 'AVAILABLE',
    currentLocation: initialPoint,
    locationHistory: [initialPoint],
    batteryLevel: 100,
    fuelOrCharge: 100,
    oxygenLevel: 100,
    targetHospital: payload.targetHospital || HOSPITALS[0].name,
    patientTriage: 'STANDBY',
    sirenActive: false,
    code3Active: false,
    isPhoneConnected: false,
    lastPingAt: Date.now(),
    rfidTag: `MED-KIT-${String(80000 + nextIndex)}`,
    shift: 'Day Emergency Shift (07:00 - 19:00)',
    notes: payload.notes || 'Newly commissioned emergency response ambulance unit',
  };

  ambulances.set(newId, newAmb);

  // Broadcast creation
  broadcastToClients({
    type: 'AUTO_REGISTERED',
    auto: newAmb,
  });

  res.status(201).json({
    success: true,
    message: 'Ambulance commissioned and added to active fleet',
    auto: newAmb,
  });
});

// 4. Live GPS Ping from Mobile Paramedic / Driver Phone
app.post('/api/autos/:id/location', (req, res) => {
  const { id } = req.params;
  const amb = ambulances.get(id);

  if (!amb) {
    return res.status(404).json({ success: false, error: 'Ambulance not found' });
  }

  const { lat, lng, speed, heading, accuracy, batteryLevel, oxygenLevel, siren, sos, deviceModel, triage } = req.body;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ success: false, error: 'Valid lat and lng required' });
  }

  const point: LocationPoint = {
    lat,
    lng,
    speed: typeof speed === 'number' ? Math.round(speed) : amb.currentLocation.speed,
    heading: typeof heading === 'number' ? Math.round(heading) : amb.currentLocation.heading,
    accuracy: typeof accuracy === 'number' ? Math.round(accuracy) : 3,
    timestamp: Date.now(),
  };

  amb.currentLocation = point;
  amb.locationHistory.push(point);
  if (amb.locationHistory.length > 40) {
    amb.locationHistory.shift();
  }

  amb.isPhoneConnected = true;
  amb.lastPingAt = Date.now();
  if (deviceModel) amb.phoneDeviceModel = deviceModel;
  if (typeof batteryLevel === 'number') amb.batteryLevel = batteryLevel;
  if (typeof oxygenLevel === 'number') amb.oxygenLevel = oxygenLevel;
  if (typeof siren === 'boolean') {
    amb.sirenActive = siren;
    amb.code3Active = siren;
  }
  if (triage) amb.patientTriage = triage;

  if (sos) {
    amb.sosActive = true;
    amb.status = 'MAINTENANCE';
    alerts.unshift({
      id: `ALT-SOS-${Date.now().toString().slice(-4)}`,
      autoId: amb.id,
      regNumber: amb.regNumber,
      driverName: amb.driverName,
      type: 'SOS',
      message: `🚨 AMBULANCE SOS: Crew triggered emergency alert via mobile app! Paramedic assistance or tow unit needed immediately.`,
      timestamp: Date.now(),
      severity: 'high',
      lat,
      lng,
    });
  }

  // Check overspeed alert (> 85 km/h)
  if (point.speed && point.speed > 85) {
    alerts.unshift({
      id: `ALT-SPD-${Date.now().toString().slice(-4)}`,
      autoId: amb.id,
      regNumber: amb.regNumber,
      driverName: amb.driverName,
      type: 'OVERSPEED',
      message: `Ambulance exceeding corridor safety limit: ${point.speed} km/h (Max corridor: 80 km/h)`,
      timestamp: Date.now(),
      severity: 'medium',
      lat,
      lng,
    });
  }

  // Trim alerts
  if (alerts.length > 50) alerts.length = 50;

  // Broadcast live update
  broadcastToClients({
    type: 'LIVE_LOCATION_PING',
    autoId: amb.id,
    location: point,
    status: amb.status,
    battery: amb.batteryLevel,
    oxygen: amb.oxygenLevel,
    siren: amb.sirenActive,
    isPhoneConnected: true,
    sos: amb.sosActive,
  });

  res.json({
    success: true,
    message: 'Ambulance location received',
    autoId: amb.id,
    receivedAt: point.timestamp,
  });
});

// 5. Update Status & Controls
app.post('/api/autos/:id/status', (req, res) => {
  const amb = ambulances.get(req.params.id);
  if (!amb) return res.status(404).json({ success: false, error: 'Ambulance not found' });

  const { status, sosActive, sirenActive, targetHospital, patientTriage } = req.body;
  if (status) amb.status = status;
  if (typeof sosActive === 'boolean') amb.sosActive = sosActive;
  if (typeof sirenActive === 'boolean') {
    amb.sirenActive = sirenActive;
    amb.code3Active = sirenActive;
  }
  if (targetHospital) amb.targetHospital = targetHospital;
  if (patientTriage) amb.patientTriage = patientTriage;

  broadcastToClients({
    type: 'STATUS_CHANGED',
    autoId: amb.id,
    status: amb.status,
    sosActive: amb.sosActive,
    sirenActive: amb.sirenActive,
  });

  res.json({ success: true, auto: amb });
});

// 6. Fleet Stats Summary
app.get('/api/stats', (req, res) => {
  let activeResponding = 0;
  let onScene = 0;
  let enRouteHospital = 0;
  let atHospital = 0;
  let availableForDispatch = 0;
  let maintenanceOrSos = 0;
  let phoneConnectedCount = 0;
  let activeCode3Emergencies = 0;

  ambulances.forEach((a) => {
    if (a.status === 'RESPONDING') {
      activeResponding++;
      activeCode3Emergencies++;
    } else if (a.status === 'ON_SCENE') {
      onScene++;
    } else if (a.status === 'EN_ROUTE_HOSPITAL') {
      enRouteHospital++;
      activeCode3Emergencies++;
    } else if (a.status === 'AT_HOSPITAL') {
      atHospital++;
    } else if (a.status === 'AVAILABLE') {
      availableForDispatch++;
    } else {
      maintenanceOrSos++;
    }

    if (a.isPhoneConnected) phoneConnectedCount++;
  });

  const stats: FleetStats = {
    totalAmbulances: ambulances.size,
    activeResponding,
    onScene,
    enRouteHospital,
    atHospital,
    availableForDispatch,
    maintenanceOrSos,
    phoneConnectedCount,
    activeCode3Emergencies,
    avgResponseTimeMin: 6.8,
    activeAlertsCount: alerts.length,
    // Backward compatibility aliases
    totalAutos: ambulances.size,
    activeCollecting: activeResponding,
    inTransit: enRouteHospital,
    atDumpingYard: atHospital,
    idleOrOffDuty: availableForDispatch,
    breakdown: maintenanceOrSos,
    totalBinsCollected: 1420,
    totalWeightCollectedTons: 28.5,
    totalDistanceKm: Math.round(ambulances.size * 34.2),
  };

  res.json({ success: true, stats });
});

// 7. Get Emergency Alerts
app.get('/api/alerts', (req, res) => {
  res.json({ success: true, alerts: alerts.slice(0, 30) });
});

// 8. Get Hospitals (facilities)
app.get('/api/facilities', (req, res) => {
  res.json({ success: true, facilities: HOSPITALS });
});

// 9. Server-Sent Events (SSE) Live Telemetry Stream
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const clientId = nextClientId++;
  const client: SSEClient = { id: clientId, res };
  sseClients.push(client);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, totalAmbulances: ambulances.size })}\n\n`);

  req.on('close', () => {
    const idx = sseClients.findIndex((c) => c.id === clientId);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// WebSocket Server attached to HTTP server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'WS_CONNECTED', message: 'Ambulance EMS Telemetry WebSocket Connected' }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'MOBILE_GPS_PING' && data.autoId) {
        const amb = ambulances.get(data.autoId);
        if (amb) {
          const pt: LocationPoint = {
            lat: data.lat,
            lng: data.lng,
            speed: data.speed || 0,
            heading: data.heading || 0,
            accuracy: data.accuracy || 3,
            timestamp: Date.now(),
          };
          amb.currentLocation = pt;
          amb.locationHistory.push(pt);
          if (amb.locationHistory.length > 40) amb.locationHistory.shift();
          amb.isPhoneConnected = true;
          amb.lastPingAt = Date.now();
          if (typeof data.battery === 'number') amb.batteryLevel = data.battery;
          if (typeof data.oxygen === 'number') amb.oxygenLevel = data.oxygen;
          if (typeof data.siren === 'boolean') amb.sirenActive = data.siren;

          broadcastToClients({
            type: 'LIVE_LOCATION_PING',
            autoId: amb.id,
            location: pt,
            status: amb.status,
            battery: amb.batteryLevel,
            oxygen: amb.oxygenLevel,
            siren: amb.sirenActive,
            isPhoneConnected: true,
          });

          ws.send(JSON.stringify({ type: 'ACK', autoId: amb.id, timestamp: Date.now() }));
        }
      }
    } catch {
      // Ignore malformed WS payloads
    }
  });
});

// Vite & Static file handling
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚑 Emergency Ambulance Command Center running on http://0.0.0.0:${PORT}`);
  });
}

start();
