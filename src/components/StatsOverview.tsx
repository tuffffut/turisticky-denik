import React from 'react';
import { HikingRoute } from '../types';
import { Mountain, Route, TrendingUp, Clock, RotateCcw, Trophy } from 'lucide-react';

interface StatsOverviewProps {
  routes: HikingRoute[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ routes }) => {
  const totalKm = routes.reduce((acc, r) => acc + (r.distanceKm || 0), 0);
  const totalAscent = routes.reduce((acc, r) => acc + (r.elevationGainM || 0), 0);
  const totalMinutes = routes.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);
  const highestPeak = routes.reduce((max, r) => Math.max(max, r.highestPointM || 0), 0);
  const repeatCount = routes.filter((r) => r.wantToVisitAgain === 'yes').length;

  const totalHours = Math.floor(totalMinutes / 60);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {/* Total Distance */}
      <div className="bg-stone-900/80 border border-stone-800/80 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
        <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
          <Route className="w-5 h-5" />
        </div>
        <div>
          <span className="block text-[11px] uppercase tracking-wider text-stone-400 font-medium">Nachozeno</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-stone-100 font-display">{Math.round(totalKm * 10) / 10}</span>
            <span className="text-xs text-emerald-400 font-semibold">km</span>
          </div>
        </div>
      </div>

      {/* Elevation Gain */}
      <div className="bg-stone-900/80 border border-stone-800/80 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
        <div className="w-10 h-10 rounded-lg bg-amber-950/60 border border-amber-800/50 flex items-center justify-center text-amber-400">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div>
          <span className="block text-[11px] uppercase tracking-wider text-stone-400 font-medium">Převýšení</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-stone-100 font-display">+{totalAscent.toLocaleString('cs-CZ')}</span>
            <span className="text-xs text-amber-400 font-semibold">m</span>
          </div>
        </div>
      </div>

      {/* Highest peak */}
      <div className="bg-stone-900/80 border border-stone-800/80 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
        <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-800/50 flex items-center justify-center text-rose-400">
          <Mountain className="w-5 h-5" />
        </div>
        <div>
          <span className="block text-[11px] uppercase tracking-wider text-stone-400 font-medium">Nejvyšší bod</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-stone-100 font-display">{highestPeak}</span>
            <span className="text-xs text-rose-400 font-semibold">m n.m.</span>
          </div>
        </div>
      </div>

      {/* Total Time */}
      <div className="bg-stone-900/80 border border-stone-800/80 rounded-xl p-3.5 flex items-center gap-3 shadow-md">
        <div className="w-10 h-10 rounded-lg bg-sky-950/60 border border-sky-800/50 flex items-center justify-center text-sky-400">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <span className="block text-[11px] uppercase tracking-wider text-stone-400 font-medium">Čas na cestách</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-stone-100 font-display">{totalHours}</span>
            <span className="text-xs text-sky-400 font-semibold">hodin</span>
          </div>
        </div>
      </div>

      {/* Want to visit again count */}
      <div className="bg-stone-900/80 border border-stone-800/80 rounded-xl p-3.5 flex items-center gap-3 shadow-md col-span-2 sm:col-span-1">
        <div className="w-10 h-10 rounded-lg bg-indigo-950/60 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
          <RotateCcw className="w-5 h-5" />
        </div>
        <div>
          <span className="block text-[11px] uppercase tracking-wider text-stone-400 font-medium">Chci zopakovat</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-stone-100 font-display">{repeatCount}</span>
            <span className="text-xs text-indigo-400 font-semibold">tras</span>
          </div>
        </div>
      </div>
    </div>
  );
};
