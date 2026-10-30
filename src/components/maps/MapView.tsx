import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LocationData, Responder } from '../../types';
import { AlertTriangle } from 'lucide-react';

interface MapViewProps {
  incidentLocation?: LocationData | null;
  responder?: Responder | null;
  height?: string;
  zoom?: number;
  interactive?: boolean;
}

// Custom DivIcons for crisp SVG rendering without asset bundle breakage
const createIncidentIcon = () =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; width: 34px; height: 34px;">
        <div style="position: absolute; inset: 0; background: rgba(239, 68, 68, 0.4); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; inset: 4px; background: #dc2626; border: 2.5px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
          <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });

const createResponderIcon = (type: string) => {
  const isFemaleUnit = type === 'FEMALE_OFFICER_UNIT';
  const color = isFemaleUnit ? '#ec4899' : '#3b82f6';

  return L.divIcon({
    className: 'custom-responder-marker',
    html: `
      <div style="position: relative; width: 36px; height: 36px;">
        <div style="position: absolute; inset: 0; background: ${color}33; border-radius: 50%; animation: pulse 2s infinite;"></div>
        <div style="position: absolute; inset: 3px; background: ${color}; border: 2.5px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.6);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
};

// Component to dynamically re-center map when coordinates change or bounds expand
const MapController: React.FC<{
  incidentCoords?: [number, number];
  responderCoords?: [number, number];
}> = ({ incidentCoords, responderCoords }) => {
  const map = useMap();

  useEffect(() => {
    if (incidentCoords && responderCoords) {
      const bounds = L.latLngBounds([incidentCoords, responderCoords]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (incidentCoords) {
      map.setView(incidentCoords, map.getZoom(), { animate: true });
    }
  }, [incidentCoords, responderCoords, map]);

  return null;
};

export const MapView: React.FC<MapViewProps> = ({
  incidentLocation,
  responder,
  height = '320px',
  zoom = 15,
  interactive = true,
}) => {
  if (!incidentLocation) {
    return (
      <div
        style={{ height }}
        className="w-full bg-[#111827] border border-slate-800 rounded-xl flex flex-col items-center justify-center p-6 text-center"
      >
        <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
        <p className="text-sm font-semibold text-slate-300">Live Map Coordinates Unavailable</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          GPS positioning is required to display your real-time emergency coordinates and responder routes.
        </p>
      </div>
    );
  }

  const incidentLatLng: [number, number] = [incidentLocation.latitude, incidentLocation.longitude];
  const responderLatLng: [number, number] | undefined =
    responder?.location?.latitude && responder?.location?.longitude
      ? [responder.location.latitude, responder.location.longitude]
      : undefined;

  return (
    <div
      style={{ height }}
      className="relative w-full rounded-xl overflow-hidden border border-slate-800 shadow-lg dark-tiles"
    >
      <MapContainer
        center={incidentLatLng}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        attributionControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapController incidentCoords={incidentLatLng} responderCoords={responderLatLng} />

        {/* User GPS Accuracy Circle */}
        {incidentLocation.accuracyMeters && incidentLocation.accuracyMeters > 0 && (
          <Circle
            center={incidentLatLng}
            radius={incidentLocation.accuracyMeters}
            pathOptions={{
              fillColor: '#ef4444',
              fillOpacity: 0.12,
              color: '#ef4444',
              weight: 1.5,
              dashArray: '4, 4',
            }}
          />
        )}

        {/* Citizen Emergency Incident Marker */}
        <Marker position={incidentLatLng} icon={createIncidentIcon()}>
          <Popup>
            <div className="text-xs p-1">
              <p className="font-bold text-red-400">Emergency Incident Location</p>
              <p className="text-slate-300 mt-0.5">
                {incidentLocation.addressText || `${incidentLocation.latitude.toFixed(4)}, ${incidentLocation.longitude.toFixed(4)}`}
              </p>
              {incidentLocation.accuracyMeters && (
                <p className="text-slate-400 text-[10px] mt-1">Accuracy: ±{incidentLocation.accuracyMeters}m</p>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Assigned Responder Marker if live coordinates exist */}
        {responderLatLng && (
          <Marker position={responderLatLng} icon={createResponderIcon(responder?.type || '')}>
            <Popup>
              <div className="text-xs p-1">
                <p className="font-bold text-blue-400">{responder?.name || 'Assigned Responder'}</p>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Status: <span className="font-semibold text-emerald-400">{responder?.status}</span>
                </p>
                {responder?.etaMinutes !== undefined && (
                  <p className="text-slate-300 text-[11px]">
                    ETA: <span className="font-bold text-white">{responder.etaMinutes} min(s)</span>
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-2.5 left-2.5 z-[400] bg-[#0b0f17]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 flex items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> You (Emergency)
        </span>
        {responderLatLng && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Responder
          </span>
        )}
      </div>
    </div>
  );
};
