import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { HikingRoute } from '../types';
import { Layers, Maximize2, Minimize2, Navigation, Star, ArrowUpRight, Compass } from 'lucide-react';

interface RouteMapProps {
  routes: HikingRoute[];
  selectedRouteId?: string | null;
  onSelectRoute: (routeId: string) => void;
  className?: string;
  height?: string;
}

type TileLayerType = 'topo' | 'osm' | 'satellite';

export const RouteMap: React.FC<RouteMapProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  className = '',
  height = '500px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeLayer, setActiveLayer] = useState<TileLayerType>('topo');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Define tile URLs
  const getTileConfig = (layer: TileLayerType) => {
    switch (layer) {
      case 'satellite':
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: '&copy; Esri, Maxar, Earthstar Geographics',
          maxZoom: 18,
        };
      case 'osm':
        return {
          url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        };
      case 'topo':
      default:
        return {
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attribution: 'Kartendaten: &copy; OpenStreetMap, SRTM | Kartendarstellung: &copy; OpenTopoMap (CC-BY-SA)',
          maxZoom: 17,
        };
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [49.8, 15.5], // Center of Czech Republic
      zoom: 7,
      zoomControl: true,
      attributionControl: false,
    });

    const tileConf = getTileConfig(activeLayer);
    const tileLayer = L.tileLayer(tileConf.url, {
      attribution: tileConf.attribution,
      maxZoom: tileConf.maxZoom,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle tile layer change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const tileConf = getTileConfig(activeLayer);
    const newTileLayer = L.tileLayer(tileConf.url, {
      attribution: tileConf.attribution,
      maxZoom: tileConf.maxZoom,
      subdomains: ['a', 'b', 'c'],
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTileLayer;
  }, [activeLayer]);

  // Render routes on the map
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const bounds = L.latLngBounds([]);

    // Custom marker icon helpers
    const createMarkerIcon = (color: string, label: string) => {
      return L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background: ${color};
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            width: 26px;
            height: 26px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 6px rgba(0,0,0,0.5);
            transform: translate(-50%, -50%);
          ">
            ${label}
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
    };

    routes.forEach((route) => {
      const isSelected = selectedRouteId === route.id;
      const coords = route.gpxData?.coordinates;

      if (coords && coords.length > 0) {
        const latLngs = coords.map((c) => [c[0], c[1]] as [number, number]);

        // Route color based on difficulty or selection
        let lineColor = '#10b981'; // emerald
        if (route.difficulty === 'hard') lineColor = '#f97316'; // orange
        if (route.difficulty === 'extreme') lineColor = '#ef4444'; // red
        if (route.difficulty === 'easy') lineColor = '#06b6d4'; // cyan

        if (isSelected) {
          lineColor = '#ec4899'; // pink highlight for selected
        }

        const polyline = L.polyline(latLngs, {
          color: lineColor,
          weight: isSelected ? 6 : 4,
          opacity: isSelected ? 0.95 : 0.8,
          lineJoin: 'round',
        }).addTo(group);

        latLngs.forEach((ll) => bounds.extend(ll));

        // Start marker
        const startPoint = latLngs[0];
        const startMarker = L.marker(startPoint, {
          icon: createMarkerIcon('#059669', 'S'),
        }).addTo(group);

        // Peak / Highest point or End marker
        const endPoint = latLngs[latLngs.length - 1];
        const endMarker = L.marker(endPoint, {
          icon: createMarkerIcon(route.highestPointM > 1500 ? '#e11d48' : '#6366f1', '▲'),
        }).addTo(group);

        // Waypoints if available
        if (route.gpxData?.waypoints) {
          route.gpxData.waypoints.forEach((wp) => {
            const wpMarker = L.marker([wp.lat, wp.lng], {
              icon: createMarkerIcon('#d97706', '★'),
            }).addTo(group);
            wpMarker.bindTooltip(
              `<div class="font-bold text-xs">${wp.name}</div>${wp.ele ? `<div class="text-[10px] text-amber-400">${wp.ele} m n.m.</div>` : ''}`,
              { direction: 'top', className: 'dark-tooltip' }
            );
          });
        }

        // Popup with rich route preview
        const popupContent = document.createElement('div');
        popupContent.className = 'p-3 w-64 bg-stone-900 text-stone-100 rounded-lg select-none';

        const coverPhoto = route.photos.find((p) => p.isCover)?.url || route.photos[0]?.url;

        popupContent.innerHTML = `
          ${coverPhoto ? `<div class="w-full h-28 overflow-hidden rounded-md mb-2 relative"><img src="${coverPhoto}" class="w-full h-full object-cover" referrerPolicy="no-referrer" /><div class="absolute bottom-1 left-1 bg-stone-950/80 text-[10px] px-2 py-0.5 rounded text-stone-300 font-medium">${route.region}</div></div>` : ''}
          <div class="font-bold text-sm text-stone-100 line-clamp-1 mb-1">${route.title}</div>
          <div class="flex items-center gap-2 text-xs text-stone-300 mb-2">
            <span class="text-emerald-400 font-semibold">${route.distanceKm} km</span>
            <span>•</span>
            <span class="text-amber-400 font-medium">+${route.elevationGainM} m</span>
            <span>•</span>
            <span class="text-stone-400 font-medium">★ ${route.rating}/5</span>
          </div>
          <button id="btn-view-${route.id}" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-1.5 px-3 rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
            Zobrazit detail trasy
          </button>
        `;

        polyline.bindPopup(popupContent);
        startMarker.bindPopup(popupContent);
        endMarker.bindPopup(popupContent);

        // Click on polyline
        polyline.on('click', () => {
          onSelectRoute(route.id);
        });

        // Add event listener to popup button once opened
        polyline.on('popupopen', () => {
          const btn = document.getElementById(`btn-view-${route.id}`);
          if (btn) {
            btn.onclick = (e) => {
              e.stopPropagation();
              onSelectRoute(route.id);
            };
          }
        });
      }
    });

    // Auto-fit bounds if routes exist
    if (routes.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [routes, selectedRouteId]);

  // Recalculate map size when toggling fullscreen
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 200);
    }
  }, [isFullscreen]);

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border border-stone-800 shadow-2xl transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 bg-stone-950' : 'w-full'
      } ${className}`}
      style={{ height: isFullscreen ? 'calc(100vh - 32px)' : height }}
    >
      {/* Map container element */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Control Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {/* Layer Selector Pill */}
        <div className="bg-stone-900/90 backdrop-blur-md border border-stone-700/80 rounded-xl p-1 shadow-xl flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveLayer('topo')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeLayer === 'topo'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            Topomapa
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('satellite')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeLayer === 'satellite'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            Satelit
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer('osm')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
              activeLayer === 'osm'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-300 hover:text-white hover:bg-stone-800'
            }`}
          >
            Ulice
          </button>
        </div>

        {/* Fullscreen Toggle */}
        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="self-end bg-stone-900/90 hover:bg-stone-800 text-stone-200 p-2.5 rounded-xl border border-stone-700/80 shadow-xl transition-all cursor-pointer"
          title={isFullscreen ? 'Zmenšit mapu' : 'Zvětšit na celou obrazovku'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-4 left-4 z-10 bg-stone-950/85 backdrop-blur-md border border-stone-800/80 rounded-xl px-3.5 py-2 text-xs text-stone-300 flex items-center gap-4 shadow-lg pointer-events-none">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Nenáročná / Střední</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
          <span>Náročná</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
          <span>Ferrata / Extrém</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-stone-400 pl-2 border-l border-stone-700">
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>{routes.length} tras na mapě</span>
        </div>
      </div>
    </div>
  );
};
