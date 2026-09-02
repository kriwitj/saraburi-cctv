import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Camera, Maximize, Minimize } from 'lucide-react';
import L from 'leaflet';
import { useLocalGovernments } from '../api/hooks';
import SearchableSelect from '../components/SearchableSelect';
import { SARABURI_BOUNDARY } from '../data/saraburiBoundary';

// Covers the whole visible world; paired with SARABURI_BOUNDARY as a hole to dim everything outside the province.
const WORLD_MASK_RING: [number, number][] = [[85, -180], [85, 180], [-85, 180], [-85, -180]];

const STATUS_OPTIONS = [
  { value: 'PENDING_INSTALL', label: 'PENDING_INSTALL' },
  { value: 'ONLINE', label: 'ONLINE' },
  { value: 'OFFLINE', label: 'OFFLINE' },
  { value: 'MAINTENANCE', label: 'MAINTENANCE' },
  { value: 'REMOVED', label: 'REMOVED' },
];

interface CameraItem {
  id: string;
  address_ref: string;
  brand: string;
  status: string;
  latitude: number;
  longitude: number;
  azimuth_deg: number;
  view_angle_deg: number;
  view_range_m: number;
  district_id?: string;
  local_gov_id?: string;
}

interface GisMapProps {
  currentUser: any;
  cameras: CameraItem[];
  handleWatchStream: (cam: CameraItem) => void;
}

export default function GisMap({ currentUser, cameras, handleWatchStream }: GisMapProps) {
  const [showViewCones, setShowViewCones] = useState(true);
  const [filterLocalGovId, setFilterLocalGovId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mapRef = useRef<any>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const localGovsApi = useLocalGovernments();

  const toggleFullscreen = () => {
    const el = mapWrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      setTimeout(() => mapRef.current?.invalidateSize(), 150);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const scopedCameras = useMemo(() => cameras.filter(cam => {
    if (currentUser.role === 'DISTRICT_ADMIN' && cam.district_id !== currentUser.district_id) return false;
    if (currentUser.role === 'LOCAL_GOV_STAFF' && cam.local_gov_id !== currentUser.local_gov_id) return false;
    if (filterLocalGovId && cam.local_gov_id !== filterLocalGovId) return false;
    if (filterStatus && cam.status !== filterStatus) return false;
    return true;
  }), [cameras, currentUser, filterLocalGovId, filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const container = document.getElementById('leaflet-map-id');
      if (container) {
        if (mapRef.current) {
          mapRef.current.remove();
        }

        const map = L.map('leaflet-map-id', { minZoom: 9, zoomControl: false }).setView([14.529, 100.913], 12);
        mapRef.current = map;

        // Default zoom control sits top-left, which collides with the floating filter/camera-list panel there.
        L.control.zoom({ position: 'bottomleft' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // Dim everything outside Saraburi province, then draw its outline on top.
        L.polygon([WORLD_MASK_RING, SARABURI_BOUNDARY], {
          stroke: false,
          fillColor: '#000000',
          fillOpacity: 0.6,
          interactive: false
        }).addTo(map);

        const boundaryLine = L.polygon(SARABURI_BOUNDARY, {
          color: '#00AEEF',
          weight: 2,
          fill: false,
          interactive: false
        }).addTo(map);

        const boundaryBounds = boundaryLine.getBounds();
        map.setMaxBounds(boundaryBounds.pad(0.5));

        const hasActiveFilter = !!filterLocalGovId || !!filterStatus;
        const camPoints: [number, number][] = scopedCameras.map(cam => [cam.latitude, cam.longitude]);

        if (hasActiveFilter && camPoints.length === 1) {
          // A single matching camera: fitBounds can't infer a sensible zoom from one point.
          map.setView(camPoints[0], 16);
        } else if (hasActiveFilter && camPoints.length > 1) {
          map.fitBounds(L.latLngBounds(camPoints), { padding: [50, 50], maxZoom: 16 });
        } else {
          map.fitBounds(boundaryBounds, { padding: [20, 20] });
        }

        // Cameras that share the exact same coordinates render as one marker with a numbered list in its popup,
        // otherwise overlapping circles just hide each other and only the topmost one is ever clickable.
        const groupsByPoint = new Map<string, CameraItem[]>();
        scopedCameras.forEach(cam => {
          const key = `${cam.latitude.toFixed(6)},${cam.longitude.toFixed(6)}`;
          const group = groupsByPoint.get(key);
          if (group) group.push(cam); else groupsByPoint.set(key, [cam]);
        });

        groupsByPoint.forEach(group => {
          const [lat, lng] = [group[0].latitude, group[0].longitude];
          const hasOffline = group.some(c => c.status === 'OFFLINE');
          const hasOnline = group.some(c => c.status === 'ONLINE');
          const markerColor = hasOffline ? '#E53935' : hasOnline ? '#27AE60' : '#F4B400';

          const marker = group.length > 1
            ? L.marker([lat, lng], {
                icon: L.divIcon({
                  className: '',
                  html: `<div style="
                    width: 26px; height: 26px; border-radius: 50%;
                    background: ${markerColor}; border: 2px solid #ffffff;
                    display: flex; align-items: center; justify-content: center;
                    color: #ffffff; font-size: 11px; font-weight: bold; font-family: inherit;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.5);
                  ">${group.length}</div>`,
                  iconSize: [26, 26],
                  iconAnchor: [13, 13]
                })
              }).addTo(map)
            : L.circleMarker([lat, lng], {
                radius: 9,
                fillColor: markerColor,
                color: '#ffffff',
                weight: 2,
                fillOpacity: 0.95
              }).addTo(map);

          const popupHtml = group.length === 1
            ? `<div class="p-2 text-slate-800 text-xs">
                <h4 class="font-bold text-sm text-[#005BAC] mb-1">${group[0].id}</h4>
                <p><strong>จุดติดตั้ง:</strong> ${group[0].address_ref}</p>
                <p><strong>สถานะ:</strong> ${group[0].status}</p>
                <button class="mt-2 w-full text-center bg-[#005BAC] hover:bg-[#00AEEF] text-white py-1 px-2 rounded cursor-pointer font-bold" id="popup-btn-${group[0].id}">ดูภาพสด/ย้อนหลัง</button>
              </div>`
            : `<div class="p-2 text-slate-800 text-xs max-h-60 overflow-y-auto">
                <h4 class="font-bold text-sm text-[#005BAC] mb-2">กล้อง ${group.length} ตัวที่จุดนี้</h4>
                ${group.map((cam, i) => `
                  <div class="pt-2 mt-2 border-t border-slate-200 first:border-0 first:pt-0 first:mt-0">
                    <p class="font-bold text-slate-700">${i + 1}. ${cam.id}</p>
                    <p class="text-slate-500">${cam.address_ref}</p>
                    <p class="text-slate-500">สถานะ: ${cam.status}</p>
                    <button class="mt-1 w-full text-center bg-[#005BAC] hover:bg-[#00AEEF] text-white py-1 px-2 rounded cursor-pointer font-bold" id="popup-btn-${cam.id}">ดูภาพสด/ย้อนหลัง</button>
                  </div>
                `).join('')}
              </div>`;

          marker.bindPopup(popupHtml, { maxWidth: 260 });

          marker.on('popupopen', () => {
            group.forEach(cam => {
              const btn = document.getElementById(`popup-btn-${cam.id}`);
              if (btn) {
                btn.onclick = () => handleWatchStream(cam);
              }
            });
          });

          if (showViewCones) {
            group.filter(cam => cam.status === 'ONLINE').forEach(cam => {
              const rangeDeg = cam.view_range_m * 0.000009;
              const startRad = (90 - (cam.azimuth_deg - cam.view_angle_deg / 2)) * (Math.PI / 180);
              const endRad = (90 - (cam.azimuth_deg + cam.view_angle_deg / 2)) * (Math.PI / 180);
              const points: [number, number][] = [[cam.latitude, cam.longitude]];
              const steps = 6;
              for (let i = 0; i <= steps; i++) {
                const rad = startRad + ((endRad - startRad) * i) / steps;
                points.push([
                  cam.latitude + rangeDeg * Math.sin(rad),
                  cam.longitude + rangeDeg * Math.cos(rad)
                ]);
              }
              L.polygon(points, {
                color: '#00AEEF',
                weight: 1,
                fillColor: '#00AEEF',
                fillOpacity: 0.15
              }).addTo(map);
            });
          }
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [scopedCameras, showViewCones]);

  return (
    <div className="flex flex-col gap-6 h-full text-white animate-in fade-in duration-300">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h3 className="font-bold text-base text-[#00AEEF]">แผนที่ภูมิสารสนเทศ (GIS Map View)</h3>
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="w-48">
            <SearchableSelect
              value={filterLocalGovId}
              onChange={setFilterLocalGovId}
              options={localGovsApi.data.map(g => ({ value: g.id, label: g.name_th }))}
              placeholder="ทุกหน่วยงาน"
              emptyLabel="ทุกหน่วยงาน"
            />
          </div>
          <div className="w-40">
            <SearchableSelect
              value={filterStatus}
              onChange={setFilterStatus}
              options={STATUS_OPTIONS}
              placeholder="ทุกสถานะ"
              emptyLabel="ทุกสถานะ"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showViewCones} onChange={(e) => setShowViewCones(e.target.checked)} className="accent-[#00AEEF]" />
            <span>แสดงทิศทางกล้อง (View Cones)</span>
          </label>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
        <div
          ref={mapWrapperRef}
          className={`lg:col-span-2 rounded-2xl overflow-hidden border border-white/10 relative ${isFullscreen ? 'bg-[#0f1424]' : ''}`}
        >
          <div id="leaflet-map-id" className="w-full h-full z-0 bg-[#0f1424]"></div>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'ดูแผนที่แบบเต็มจอ'}
            className="absolute top-3 right-3 z-[1000] bg-[#0f1524]/90 hover:bg-[#0f1524] border border-white/10 text-white p-2.5 rounded-xl cursor-pointer shadow-lg backdrop-blur-md transition"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {isFullscreen && (
            <div className="absolute top-3 left-3 z-[1000] bg-[#0f1524]/90 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-wrap items-center gap-2 text-xs text-white">
              <div className="w-44">
                <SearchableSelect
                  value={filterLocalGovId}
                  onChange={setFilterLocalGovId}
                  options={localGovsApi.data.map(g => ({ value: g.id, label: g.name_th }))}
                  placeholder="ทุกหน่วยงาน"
                  emptyLabel="ทุกหน่วยงาน"
                />
              </div>
              <div className="w-36">
                <SearchableSelect
                  value={filterStatus}
                  onChange={setFilterStatus}
                  options={STATUS_OPTIONS}
                  placeholder="ทุกสถานะ"
                  emptyLabel="ทุกสถานะ"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <input type="checkbox" checked={showViewCones} onChange={(e) => setShowViewCones(e.target.checked)} className="accent-[#00AEEF]" />
                <span>ทิศทางกล้อง</span>
              </label>
            </div>
          )}
        </div>
        <div className={`bg-[#121a2f] border border-white/10 rounded-2xl p-6 overflow-y-auto flex flex-col gap-3 ${isFullscreen ? 'hidden' : ''}`}>
          <h4 className="font-bold text-sm text-[#00AEEF]">รายการกล้องในขอบเขต</h4>
          {scopedCameras.map(cam => (
            <div
              key={cam.id}
              onClick={() => handleWatchStream(cam)}
              className="bg-black/25 border border-white/5 p-3 rounded-xl hover:border-[#00f2fe] cursor-pointer transition flex justify-between"
            >
              <div>
                <strong className="text-xs text-sky-300">{cam.id}</strong>
                <p className="text-[10px] text-slate-400 mt-1">{cam.address_ref}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
