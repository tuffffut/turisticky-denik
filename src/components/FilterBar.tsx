import React from 'react';
import { RouteFilterState, HikingRoute } from '../types';
import {
  Search,
  Filter,
  Calendar,
  Star,
  RotateCcw,
  SlidersHorizontal,
  X,
  MapPin,
  Mountain,
} from 'lucide-react';

interface FilterBarProps {
  filters: RouteFilterState;
  onFilterChange: (newFilters: RouteFilterState) => void;
  onResetFilters: () => void;
  routes: HikingRoute[];
  totalFilteredCount: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  routes,
  totalFilteredCount,
}) => {
  // Extract unique regions & years for dropdowns
  const availableRegions = Array.from(
    new Set(
      routes
        .flatMap((r) => [r.region, r.mountainRange])
        .filter((val): val is string => Boolean(val && val.trim().length > 0))
    )
  ).sort();

  const availableYears = Array.from(
    new Set(routes.map((r) => r.visitedYear || new Date(r.date).getFullYear()))
  ).sort((a, b) => Number(b) - Number(a));

  const hasActiveFilters =
    Boolean(filters.searchQuery) ||
    filters.region !== 'all' ||
    filters.year !== 'all' ||
    filters.minRating > 0 ||
    filters.wantToVisitAgain !== 'all' ||
    filters.difficulty !== 'all';

  return (
    <div className="bg-stone-900/90 border border-stone-800/90 rounded-2xl p-4 shadow-xl mb-6">
      {/* Top Search Input & Quick Controls */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between mb-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            placeholder="Hledat podle názvu, hor, zajímavosti, parťáka..."
            className="w-full pl-10 pr-9 py-2.5 bg-stone-950/80 border border-stone-800 rounded-xl text-stone-100 placeholder-stone-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Want to Visit Again Toggle */}
        <button
          type="button"
          onClick={() =>
            onFilterChange({
              ...filters,
              wantToVisitAgain: filters.wantToVisitAgain === 'yes' ? 'all' : 'yes',
            })
          }
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
            filters.wantToVisitAgain === 'yes'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
              : 'bg-stone-950/60 text-stone-300 border-stone-800 hover:bg-stone-800'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span>Chci navštívit znovu</span>
        </button>

        {/* Sort selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 whitespace-nowrap hidden sm:inline">Řadit:</span>
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as any })}
            className="bg-stone-950/80 border border-stone-800 text-stone-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="date_desc">Nejnovější návštěvy</option>
            <option value="date_asc">Nejstarší návštěvy</option>
            <option value="rating_desc">Nejlépe hodnocené (5★)</option>
            <option value="distance_desc">Nejdelší trasy (km)</option>
            <option value="elevation_desc">Nejvyšší převýšení (+m)</option>
          </select>
        </div>
      </div>

      {/* Secondary Filter Row */}
      <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-stone-800/70 text-xs">
        <div className="flex items-center gap-1.5 text-stone-400 mr-1">
          <Filter className="w-3.5 h-3.5 text-emerald-400" />
          <span>Filtry:</span>
        </div>

        {/* Region & Pohoří */}
        <select
          value={filters.region}
          onChange={(e) => onFilterChange({ ...filters, region: e.target.value })}
          className="bg-stone-950/70 border border-stone-800 text-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value="all">Všechny oblasti a pohoří</option>
          {availableRegions.map((reg) => (
            <option key={reg} value={reg}>
              {reg}
            </option>
          ))}
        </select>

        {/* Year */}
        <select
          value={filters.year}
          onChange={(e) => onFilterChange({ ...filters, year: e.target.value })}
          className="bg-stone-950/70 border border-stone-800 text-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value="all">Všechny roky</option>
          {availableYears.map((yr) => (
            <option key={yr} value={yr.toString()}>
              Rok {yr}
            </option>
          ))}
        </select>

        {/* Rating */}
        <select
          value={filters.minRating}
          onChange={(e) => onFilterChange({ ...filters, minRating: parseInt(e.target.value, 10) })}
          className="bg-stone-950/70 border border-stone-800 text-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value={0}>Jakékoliv hodnocení</option>
          <option value={5}>Pouze 5 hvězdiček (★ 5.0)</option>
          <option value={4}>4 hvězdičky a více (★ 4+)</option>
          <option value={3}>3 hvězdičky a více (★ 3+)</option>
        </select>

        {/* Difficulty */}
        <select
          value={filters.difficulty}
          onChange={(e) => onFilterChange({ ...filters, difficulty: e.target.value })}
          className="bg-stone-950/70 border border-stone-800 text-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 cursor-pointer"
        >
          <option value="all">Všechny náročnosti</option>
          <option value="easy">Nenáročná</option>
          <option value="moderate">Střední</option>
          <option value="hard">Náročná</option>
          <option value="extreme">Vysokohorská / Ferrata</option>
        </select>

        {/* Clear Filters button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 px-2.5 py-1.5 rounded-lg ml-auto transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Vymazat filtry</span>
          </button>
        )}

        {/* Results counter badge */}
        <span className="text-stone-400 font-medium ml-auto">
          Nalezeno <strong className="text-emerald-400 font-bold">{totalFilteredCount}</strong> {totalFilteredCount === 1 ? 'trasa' : totalFilteredCount >= 2 && totalFilteredCount <= 4 ? 'trasy' : 'tras'}
        </span>
      </div>
    </div>
  );
};
