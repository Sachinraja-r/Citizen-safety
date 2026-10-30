import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocationData, Responder } from '../../types';
import { MapPin, Navigation } from 'lucide-react';

interface MapViewProps {
  incidentLocation?: LocationData | null;
  responder?: Responder | null;
  height?: string;
  zoom?: number;
  interactive?: boolean;
}

// Default fallback coordinates: Alliance University / Bangalore emergency center
const DEFAULT_CENTER: [number, number] = [12.8406, 77.6632];

export const isValidLatLng = (lat?: number | null, lng?: number | null): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat !== 0 &&
    lng !== 0 &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

// Custom DivIcons for crisp SVG rendering without asset bundle breakage
const createIncidentIcon = () =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div style="position: relative; width: 36px; height: 36px;">
        <div style="position: absolute; inset: 0; background: rgba(233, 30, 99, 0.4); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; inset: 4px; background: #E91E63; border: 2.5px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(233, 30, 99, 0.5);">
          <div style="width: 10px; height: 10px; background: #ffffff; border-radius: 50%;"></div>
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });

const createResponderIcon = (type: string) => {
  const isFemaleUnit = type === 'FEMALE_OFFICER_UNIT';
  const color = isFemaleUnit ? '#D81B60' : '#2563EB';

  return L.divIcon({
    className: 'custom-responder-marker',
    html: `
      <div style="position: relative; width: 38px; height: 38px;">
        <div style="position: absolute; inset: 0; background: ${color}33; border-radius: 50%; animation: pulse 2s infinite;"></div>
        <div style="position: absolute; inset: 3px; background: ${color}; border: 2.5px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
};

// Component to dynamically re-center map, invalidate size, and handle bounds
const MapController: React.FC<{
  incidentCoords: [number, number];
  responderCoords?: [number, number];
}> = ({ incidentCoords, responderCoords }) => {
  const map = useMap();

  useEffect(() => {
    // Crucial for Leaflet inside dynamic containers / flexbox:
    // Invalidate size immediately, and after a short timeout once layout is painted.
    map.invalidateSize();

    const t1 = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const t2 = setTimeout(() => {
      map.invalidateSize();
    }, 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);

  useEffect(() => {
    if (incidentCoords && responderCoords) {
      try {
        const bounds = L.latLngBounds([incidentCoords, responderCoords]);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
      } catch {
        map.setView(incidentCoords, map.getZoom(), { animate: true });
      }
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
  const [mapReady, setMapReady] = useState(false);

  // Validate coordinates safely, fallback to default center if unavailable
  const hasValidIncidentCoords = isValidLatLng(incidentLocation?.latitude, incidentLocation?.longitude);
  const incidentLatLng: [number, number] = hasValidIncidentCoords
    ? [incidentLocation!.latitude, incidentLocation!.longitude]
    : DEFAULT_CENTER;

  const respLat = responder?.location?.latitude;
  const respLng = responder?.location?.longitude;
  const hasValidResponderCoords = isValidLatLng(respLat, respLng);
  const responderLatLng: [number, number] | undefined =
    hasValidResponderCoords && typeof respLat === 'number' && typeof respLng === 'number'
      ? [respLat, respLng]
      : undefined;

  useEffect(() => {
    setMapReady(true);
  }, []);

  return (
    <div
      style={{ height, minHeight: '220px' }}
      className="relative w-full rounded-2xl overflow-hidden border border-[#F3D9E2] shadow-sm bg-[#f1f5f9]"
    >
      {mapReady && (
        <MapContainer
          center={incidentLatLng}
          zoom={zoom}
          scrollWheelZoom={interactive}
          dragging={interactive}
          zoomControl={interactive}
          attributionControl={false}
          className="w-full h-full"
          style={{ height: '100%', width: '100%', zIndex: 10 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            subdomains={['a', 'b', 'c']}
          />

          <MapController incidentCoords={incidentLatLng} responderCoords={responderLatLng} />

          {/* User GPS Accuracy Circle */}
          {hasValidIncidentCoords && (incidentLocation?.accuracyMeters || 20) > 0 && (
            <Circle
              center={incidentLatLng}
              radius={Math.min(incidentLocation?.accuracyMeters || 25, 100)}
              pathOptions={{
                fillColor: '#E91E63',
                fillOpacity: 0.12,
                color: '#E91E63',
                weight: 1.5,
                dashArray: '4, 4',
              }}
            />
          )}

          {/* Citizen Emergency Incident Marker */}
          <Marker position={incidentLatLng} icon={createIncidentIcon()}>
            <Popup>
              <div className="text-xs p-1 text-[#2D1B24]">
                <p className="font-bold text-[#E91E63] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {hasValidIncidentCoords ? 'Emergency Distress Beacon' : 'Approximate City Beacon'}
                </p>
                <p className="text-[#7A6570] text-[11px] mt-0.5">
                  {incidentLocation?.addressText || `${incidentLatLng[0].toFixed(4)}, ${incidentLatLng[1].toFixed(4)}`}
                </p>
                <p className="text-[#7A6570] text-[10px] mt-1">
                  Accuracy: ±{incidentLocation?.accuracyMeters || 15}m
                </p>
              </div>
            </Popup>
          </Marker>

          {/* Assigned Responder Marker */}
          {responderLatLng && (
            <Marker position={responderLatLng} icon={createResponderIcon(responder?.type || '')}>
              <Popup>
                <div className="text-xs p-1 text-[#2D1B24]">
                  <p className="font-bold text-[#2563EB] flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5" />
                    {responder?.name || 'Assigned Patrol Unit'}
                  </p>
                  <p className="text-[#7A6570] text-[11px] mt-0.5">
                    Status: <span className="font-semibold text-emerald-600">{responder?.status}</span>
                  </p>
                  {responder?.etaMinutes !== undefined && (
                    <p className="text-[#2D1B24] font-bold text-[11px] mt-0.5">
                      ETA: {responder.etaMinutes} min(s)
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-2.5 left-2.5 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#F3D9E2] text-[11px] text-[#2D1B24] shadow-sm flex items-center gap-3 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E91E63] inline-block animate-pulse" />
          You {hasValidIncidentCoords ? '(Live GPS)' : '(Approximate)'}
        </span>
        {responderLatLng ? (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] inline-block" />
            Responder
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[#7A6570]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-ping" />
            Patrol Grid Active
          </span>
        )}
      </div>

      {!hasValidIncidentCoords && (
        <div className="absolute top-2.5 right-2.5 z-[400] bg-[#FFF5F8]/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#F3D9E2] text-[10px] text-[#D81B60] font-semibold">
          Using city landmark estimate
        </div>
      )}
    </div>
  );
};
