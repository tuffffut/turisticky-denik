import React, { useState } from 'react';
import { HikingRoute, RoutePhoto } from '../types';
import { RouteMap } from './RouteMap';
import { ElevationProfile } from './ElevationProfile';
import { PhotoLightbox } from './PhotoLightbox';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  X,
  Calendar,
  MapPin,
  Mountain,
  Clock,
  Star,
  RotateCcw,
  Sparkles,
  Users,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Download,
  Edit,
  Trash2,
  Camera,
  Video,
  Share2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Compass,
} from 'lucide-react';

interface RouteDetailModalProps {
  route: HikingRoute;
  onClose: () => void;
  onEdit: (route: HikingRoute) => void;
  onDelete: (id: string) => void;
  onToggleVisitAgain: (id: string, current: string) => void;
}

export const RouteDetailModal: React.FC<RouteDetailModalProps> = ({
  route,
  onClose,
  onEdit,
  onDelete,
  onToggleVisitAgain,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'map' | 'gallery'>('overview');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const coverPhoto = route.photos.find((p) => p.isCover)?.url || route.photos[0]?.url;

  const difficultyColors = {
    easy: 'bg-teal-950/80 text-teal-300 border-teal-800',
    moderate: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    hard: 'bg-amber-950/80 text-amber-300 border-amber-800',
    extreme: 'bg-rose-950/80 text-rose-300 border-rose-800',
  };

  const difficultyLabels = {
    easy: 'Nenáročná trasa',
    moderate: 'Středně náročná',
    hard: 'Náročná horská túra',
    extreme: 'Vysokohorská / Ferrata',
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} minut`;
    return m > 0 ? `${h} h ${m} min` : `${h} hodin`;
  };

  // Download GPX file
  const handleDownloadGpx = () => {
    let xml = route.gpxData?.gpxXml;
    if (!xml && route.gpxData?.coordinates) {
      // Build basic GPX XML from coordinates
      xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Horsky Denik" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${route.title}</name>
    <desc>${route.description.replace(/[<>&'"]/g, '')}</desc>
  </metadata>
  <trk>
    <name>${route.title}</name>
    <trkseg>
      ${route.gpxData.coordinates
        .map((c) => `<trkpt lat="${c[0]}" lon="${c[1]}">${c[2] ? `<ele>${c[2]}</ele>` : ''}</trkpt>`)
        .join('\n      ')}
    </trkseg>
  </trk>
</gpx>`;
    }

    if (!xml) {
      alert('Tato trasa neobsahuje GPX data.');
      return;
    }

    const blob = new Blob([xml], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = route.gpxFileName || `${route.id}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header Hero Image */}
        <div className="relative h-64 sm:h-80 w-full shrink-0 overflow-hidden bg-stone-950">
          {coverPhoto ? (
            <img
              src={coverPhoto}
              alt={route.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-stone-900 text-stone-600">
              <Mountain className="w-16 h-16 stroke-1" />
            </div>
          )}

          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-950/40 to-black/60" />

          {/* Top Actions */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-stone-950/80 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-semibold text-stone-200 border border-stone-700/60 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>{route.mountainRange ? `${route.mountainRange} • ${route.region}` : route.region}</span>
              </span>
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${difficultyColors[route.difficulty]}`}>
                {difficultyLabels[route.difficulty]}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleVisitAgain(route.id, route.wantToVisitAgain)}
                className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                  route.wantToVisitAgain === 'yes'
                    ? 'bg-amber-500 text-stone-950 border-amber-400 font-bold'
                    : 'bg-stone-900/80 text-stone-300 border-stone-700 hover:text-white'
                }`}
                title={route.wantToVisitAgain === 'yes' ? 'Označeno: Chci navštívit znovu' : 'Označit k opětovné návštěvě'}
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onEdit(route)}
                className="p-2 bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white rounded-xl border border-stone-700 backdrop-blur-md transition-colors cursor-pointer"
                title="Upravit trasu"
              >
                <Edit className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 bg-stone-900/80 hover:bg-rose-900/80 text-stone-300 hover:text-rose-200 rounded-xl border border-stone-700 backdrop-blur-md transition-colors cursor-pointer"
                title="Smazat trasu"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white rounded-xl border border-stone-700 backdrop-blur-md transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Hero Bottom: Title & Rating */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < route.rating
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-stone-600'
                  }`}
                />
              ))}
              <span className="text-sm text-stone-300 font-bold ml-1">
                {route.rating}.0 / 5
              </span>
              <span className="text-stone-400 text-xs ml-3 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(route.date).toLocaleDateString('cs-CZ', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>

            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white leading-tight">
              {route.title}
            </h1>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-stone-800 bg-stone-950/60 px-6 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              Přehled & Zápisník
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'map'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              Mapa & Výškový profil
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gallery')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'gallery'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              Fotografie ({route.photos.length}) & Videa
            </button>
          </div>

          {/* GPX Download Button */}
          {route.gpxData && (
            <button
              type="button"
              onClick={handleDownloadGpx}
              className="hidden sm:flex items-center gap-1.5 text-xs text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 px-3 py-1.5 rounded-lg border border-stone-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Stáhnout GPX</span>
            </button>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Vital Stat Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800 text-center">
                  <span className="block text-[10px] uppercase font-semibold tracking-wider text-stone-400 mb-1">
                    Celková délka
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-400 font-display">
                    {route.distanceKm} <span className="text-sm font-normal text-stone-400">km</span>
                  </span>
                </div>

                <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800 text-center">
                  <span className="block text-[10px] uppercase font-semibold tracking-wider text-stone-400 mb-1">
                    Převýšení nahoru
                  </span>
                  <span className="text-2xl font-extrabold text-amber-400 font-display">
                    +{route.elevationGainM} <span className="text-sm font-normal text-stone-400">m</span>
                  </span>
                </div>

                <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800 text-center">
                  <span className="block text-[10px] uppercase font-semibold tracking-wider text-stone-400 mb-1">
                    Nejvyšší bod
                  </span>
                  <span className="text-2xl font-extrabold text-rose-400 font-display">
                    {route.highestPointM} <span className="text-sm font-normal text-stone-400">m</span>
                  </span>
                </div>

                <div className="bg-stone-950/60 p-3.5 rounded-xl border border-stone-800 text-center">
                  <span className="block text-[10px] uppercase font-semibold tracking-wider text-stone-400 mb-1">
                    Doba túry
                  </span>
                  <span className="text-2xl font-extrabold text-sky-400 font-display">
                    {formatDuration(route.durationMinutes)}
                  </span>
                </div>
              </div>

              {/* Story Description */}
              <div className="bg-stone-950/40 p-5 rounded-2xl border border-stone-800">
                <h3 className="text-sm font-bold text-stone-200 uppercase tracking-wider mb-3">
                  Zápis z deníku & Popis cesty
                </h3>
                <p className="text-stone-300 text-sm leading-relaxed whitespace-pre-line font-normal">
                  {route.description}
                </p>
              </div>

              {/* Highlights & Companions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Highlights */}
                {route.highlights && route.highlights.length > 0 && (
                  <div className="bg-stone-950/40 p-4 rounded-xl border border-stone-800">
                    <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Zajímavosti a body zájmu</span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {route.highlights.map((hl, i) => (
                        <span
                          key={i}
                          className="bg-stone-800 text-stone-200 px-2.5 py-1 rounded-lg text-xs border border-stone-700"
                        >
                          {hl}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Companions & Weather */}
                <div className="bg-stone-950/40 p-4 rounded-xl border border-stone-800 space-y-3">
                  {route.companions && route.companions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Kdo šel se mnou</span>
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {route.companions.map((comp, i) => (
                          <span
                            key={i}
                            className="bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 px-2.5 py-0.5 rounded-lg text-xs"
                          >
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {route.weather && (
                    <div>
                      <h4 className="text-xs font-bold text-stone-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>Počasí během túry</span>
                      </h4>
                      <p className="text-xs text-stone-400">
                        {route.weather.condition === 'sunny' && 'Slunečno / Jasno'}
                        {route.weather.condition === 'partly_cloudy' && 'Polojasno'}
                        {route.weather.condition === 'cloudy' && 'Zataženo / Mlha'}
                        {route.weather.condition === 'rain' && 'Deštivo'}
                        {route.weather.condition === 'snow' && 'Sníh a mráz'}
                        {route.weather.tempC !== undefined && ` • ${route.weather.tempC}°C`}
                        {route.weather.note && ` • ${route.weather.note}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags & Private Notes */}
              {route.tags && route.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-stone-500 mr-2">Štítky:</span>
                  {route.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs text-stone-400 bg-stone-950 px-2.5 py-1 rounded-md border border-stone-800"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MAP & ELEVATION PROFILE */}
          {activeTab === 'map' && (
            <div className="space-y-6">
              {/* Interactive Route Map */}
              <div>
                <RouteMap
                  routes={[route]}
                  selectedRouteId={route.id}
                  onSelectRoute={() => {}}
                  height="420px"
                />
              </div>

              {/* Elevation profile chart */}
              {route.gpxData?.elevationProfile && (
                <ElevationProfile
                  profile={route.gpxData.elevationProfile}
                  highestPointM={route.highestPointM}
                  lowestPointM={route.lowestPointM}
                  totalDistanceKm={route.distanceKm}
                  elevationGainM={route.elevationGainM}
                  elevationLossM={route.elevationLossM}
                />
              )}

              {/* Waypoints list */}
              {route.gpxData?.waypoints && route.gpxData.waypoints.length > 0 && (
                <div className="bg-stone-950/60 p-4 rounded-xl border border-stone-800">
                  <h4 className="font-semibold text-stone-100 text-sm mb-3">
                    Významné body trasy (Waypoints):
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {route.gpxData.waypoints.map((wp, i) => (
                      <div
                        key={i}
                        className="bg-stone-900 p-2.5 rounded-lg border border-stone-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-stone-200">{wp.name}</span>
                          {wp.desc && <span className="block text-stone-400 text-[11px]">{wp.desc}</span>}
                        </div>
                        {wp.ele && (
                          <span className="text-amber-400 font-mono text-[11px]">{wp.ele} m</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GALLERY & VIDEOS */}
          {activeTab === 'gallery' && (
            <div className="space-y-6">
              {/* Photos Grid */}
              {route.photos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {route.photos.map((photo, idx) => (
                    <div
                      key={photo.id}
                      onClick={() => setLightboxIndex(idx)}
                      className="group relative rounded-xl overflow-hidden border border-stone-800 h-52 bg-stone-950 cursor-pointer"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || 'Foto'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-xs text-white font-medium">
                          {photo.caption || 'Klikněte pro zvětšení'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-stone-950/40 rounded-xl border border-stone-800 text-stone-400 text-sm">
                  K této trase zatím nebyly přidány žádné fotografie.
                </div>
              )}

              {/* Videos */}
              {route.videos && route.videos.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-stone-800">
                  <h4 className="font-semibold text-stone-100 text-sm flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-emerald-400" />
                    <span>Videa z trasy</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {route.videos.map((vid) => (
                      <div key={vid.id} className="bg-stone-950 rounded-xl p-3 border border-stone-800">
                        <a
                          href={vid.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-400 hover:underline font-semibold block truncate"
                        >
                          {vid.title || vid.url}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={route.photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* In-app Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          routeTitle={route.title}
          onConfirm={() => {
            setShowDeleteConfirm(false);
            onDelete(route.id);
            onClose();
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
};
