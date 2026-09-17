import React, { useState } from 'react';
import { HikingRoute } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  Calendar,
  MapPin,
  Mountain,
  Clock,
  Star,
  RotateCcw,
  Sparkles,
  Users,
  Compass,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  Trash2,
} from 'lucide-react';

interface RouteCardProps {
  route: HikingRoute;
  onSelect: (id: string) => void;
  onToggleVisitAgain?: (id: string, current: string) => void;
  onDelete?: (id: string) => void;
}

export const RouteCard: React.FC<RouteCardProps> = ({
  route,
  onSelect,
  onToggleVisitAgain,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const coverPhoto = route.photos.find((p) => p.isCover)?.url || route.photos[0]?.url;

  const difficultyColors = {
    easy: 'bg-teal-950/80 text-teal-300 border-teal-800/60',
    moderate: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
    hard: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
    extreme: 'bg-rose-950/80 text-rose-300 border-rose-800/60',
  };

  const difficultyLabels = {
    easy: 'Nenáročná',
    moderate: 'Střední',
    hard: 'Náročná',
    extreme: 'Vysokohorská',
  };

  const getWeatherIcon = (cond: string) => {
    switch (cond) {
      case 'rain':
        return <CloudRain className="w-3.5 h-3.5 text-blue-400" />;
      case 'snow':
        return <Snowflake className="w-3.5 h-3.5 text-sky-300" />;
      case 'cloudy':
      case 'partly_cloudy':
        return <Cloud className="w-3.5 h-3.5 text-stone-300" />;
      case 'sunny':
      default:
        return <Sun className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} min`;
    return m > 0 ? `${h} h ${m} min` : `${h} hod`;
  };

  return (
    <article
      onClick={() => onSelect(route.id)}
      className="group relative bg-stone-900/80 hover:bg-stone-850 border border-stone-800/80 hover:border-emerald-600/50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Cover Image Container */}
      <div className="relative h-56 w-full overflow-hidden bg-stone-950">
        {coverPhoto ? (
          <img
            src={coverPhoto}
            alt={route.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-600 bg-stone-900">
            <Mountain className="w-12 h-12 mb-2 stroke-1" />
            <span className="text-xs">Horská trasa</span>
          </div>
        )}

        {/* Gradient Scrim */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/30 to-black/40" />

        {/* Top Badges & Actions */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
          {/* Region / Mountain Range Badge */}
          <div className="flex items-center gap-1.5 bg-stone-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-medium text-stone-200 border border-stone-700/50">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate max-w-[140px]">{route.mountainRange || route.region}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Navštívit znovu (Visit Again) indicator */}
            {route.wantToVisitAgain === 'yes' && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleVisitAgain) onToggleVisitAgain(route.id, route.wantToVisitAgain);
                }}
                title="Chci navštívit znovu!"
                className="flex items-center gap-1 bg-amber-500/90 text-stone-950 px-2 py-1 rounded-lg text-xs font-bold shadow-md cursor-pointer hover:bg-amber-400 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Znovu</span>
              </div>
            )}

            {/* Quick delete button */}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(true);
                }}
                title="Smazat trasu z deníku"
                className="p-1.5 bg-stone-950/70 hover:bg-rose-950/90 text-stone-400 hover:text-rose-300 rounded-lg border border-stone-700/50 hover:border-rose-700 transition-colors cursor-pointer opacity-80 hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Overlay: Title & Star Rating */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-1 mb-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < route.rating
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-stone-600'
                }`}
              />
            ))}
            <span className="text-xs text-stone-300 font-semibold ml-1">
              {route.rating}.0
            </span>
          </div>
          <h3 className="font-display font-bold text-lg text-white leading-tight line-clamp-1 group-hover:text-emerald-300 transition-colors">
            {route.title}
          </h3>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        {/* Metric Pills Grid */}
        <div className="grid grid-cols-3 gap-2 p-2 bg-stone-950/60 rounded-xl border border-stone-800/60 mb-3 text-center">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-stone-400">Vzdálenost</span>
            <span className="font-semibold text-emerald-400 text-sm">{route.distanceKm} km</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-stone-400">Nastoupáno</span>
            <span className="font-semibold text-amber-400 text-sm">+{route.elevationGainM} m</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-stone-400">Doba chůze</span>
            <span className="font-semibold text-stone-200 text-sm">{formatDuration(route.durationMinutes)}</span>
          </div>
        </div>

        {/* Description snippet */}
        <p className="text-stone-300 text-xs line-clamp-2 leading-relaxed mb-3">
          {route.description}
        </p>

        {/* Highlights Preview */}
        {route.highlights && route.highlights.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {route.highlights.slice(0, 2).map((hl, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] bg-stone-800/90 text-stone-300 px-2 py-0.5 rounded-md border border-stone-700/50"
              >
                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                <span className="truncate max-w-[140px]">{hl}</span>
              </span>
            ))}
            {route.highlights.length > 2 && (
              <span className="text-[10px] text-stone-500 self-center">
                +{route.highlights.length - 2} další
              </span>
            )}
          </div>
        )}

        {/* Footer info: Date, Weather, Companions */}
        <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>{new Date(route.date).toLocaleDateString('cs-CZ')}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${difficultyColors[route.difficulty]}`}>
              {difficultyLabels[route.difficulty]}
            </span>

            {route.weather && (
              <div className="flex items-center gap-1" title={`${route.weather.tempC ?? ''}°C`}>
                {getWeatherIcon(route.weather.condition)}
                {route.weather.tempC !== undefined && (
                  <span className="text-[11px] font-medium">{route.weather.tempC}°</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-app Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmDeleteModal
          routeTitle={route.title}
          onConfirm={() => {
            setShowDeleteConfirm(false);
            if (onDelete) onDelete(route.id);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </article>
  );
};
