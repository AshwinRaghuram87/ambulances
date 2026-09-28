import React, { useState, useEffect } from 'react';
import { useFleetData } from './hooks/useFleetData.ts';
import { Header } from './components/Header.tsx';
import { MapTracker } from './components/MapTracker.tsx';
import { AutoDetailDrawer } from './components/AutoDetailDrawer.tsx';
import { MobileDriverApp } from './components/MobileDriverApp.tsx';
import { RegisterAutoView } from './components/RegisterAutoView.tsx';
import { FleetTable } from './components/FleetTable.tsx';
import { QRCodeModal } from './components/QRCodeModal.tsx';
import { AlertsDrawer } from './components/AlertsDrawer.tsx';
import type { Ambulance } from './types.ts';

export default function App() {
  const {
    autos,
    autosMap,
    stats,
    alerts,
    facilities,
    isConnected,
    loading,
    error,
    registerAuto,
    sendLocationPing,
    updateStatus,
  } = useFleetData();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'map' | 'fleet' | 'register' | 'driver'>('map');

  // Selected ambulance for map inspector
  const [selectedAuto, setSelectedAuto] = useState<Ambulance | null>(null);

  // Ambulance for QR Code modal
  const [qrModalAuto, setQrModalAuto] = useState<Ambulance | null>(null);

  // Selected ambulance for driver app
  const [driverAutoId, setDriverAutoId] = useState<string>('AMB-001');

  // Alerts drawer
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  // Check URL params on initial mount (e.g. ?mode=driver&autoId=AMB-042)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const autoId = params.get('autoId');

    if (autoId) {
      setDriverAutoId(autoId);
      const matched = autosMap.get(autoId);
      if (matched) setSelectedAuto(matched);
    }

    if (mode === 'driver') {
      setActiveTab('driver');
    }
  }, [autosMap]);

  // Keep selectedAuto synchronized with real-time updates from autosMap
  useEffect(() => {
    if (selectedAuto) {
      const updated = autosMap.get(selectedAuto.id);
      if (updated && updated !== selectedAuto) {
        setSelectedAuto(updated);
      }
    }
  }, [autosMap, selectedAuto]);

  const handleOpenMobileView = (autoId: string) => {
    setDriverAutoId(autoId);
    setActiveTab('driver');
  };

  const handleSelectAutoOnMap = (auto: Ambulance) => {
    setSelectedAuto(auto);
    setActiveTab('map');
  };

  const handleSelectAutoById = (autoId: string) => {
    const found = autosMap.get(autoId);
    if (found) {
      setSelectedAuto(found);
      setActiveTab('map');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-red-500 selection:text-white">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
        alerts={alerts}
        isConnected={isConnected}
        onOpenAlerts={() => setIsAlertsOpen(true)}
      />

      {/* Main View Body */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'map' && (
          <div className="flex-1 relative">
            <MapTracker
              autos={autos}
              facilities={facilities}
              selectedAuto={selectedAuto}
              onSelectAuto={(auto) => setSelectedAuto(auto)}
              onOpenMobileView={handleOpenMobileView}
              onOpenQRModal={(auto) => setQrModalAuto(auto)}
            />

            {/* Ambulance Inspector Drawer on map */}
            <AutoDetailDrawer
              auto={selectedAuto}
              onClose={() => setSelectedAuto(null)}
              onOpenMobileView={handleOpenMobileView}
              onOpenQRModal={(auto) => setQrModalAuto(auto)}
              onUpdateStatus={updateStatus}
            />
          </div>
        )}

        {activeTab === 'fleet' && (
          <div className="flex-1">
            <FleetTable
              autos={autos}
              onSelectAutoOnMap={handleSelectAutoOnMap}
              onOpenQRModal={(auto) => setQrModalAuto(auto)}
              onOpenMobileView={handleOpenMobileView}
            />
          </div>
        )}

        {activeTab === 'register' && (
          <div className="flex-1">
            <RegisterAutoView
              totalAutosCount={autos.length}
              registerAuto={registerAuto}
              onRegisterSuccess={(newAuto) => {
                setSelectedAuto(newAuto);
              }}
              onOpenMobileView={handleOpenMobileView}
              onNavigateToMap={() => setActiveTab('map')}
            />
          </div>
        )}

        {activeTab === 'driver' && (
          <div className="flex-1 py-4">
            <MobileDriverApp
              autos={autos}
              selectedAutoId={driverAutoId}
              onOpenQRModal={(auto) => setQrModalAuto(auto)}
              onSendLocationPing={sendLocationPing}
            />
          </div>
        )}
      </main>

      {/* QR Code Modal for Paramedic Phone Pairing */}
      <QRCodeModal
        auto={qrModalAuto}
        onClose={() => setQrModalAuto(null)}
        onOpenMobileView={handleOpenMobileView}
      />

      {/* Emergency Alerts Drawer */}
      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onSelectAutoById={handleSelectAutoById}
      />
    </div>
  );
}
