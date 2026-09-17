import React from 'react';
import {
  Compass,
  Plus,
  Sparkles,
  Key,
  Map as MapIcon,
  Grid,
  Image as ImageIcon,
  Mountain,
} from 'lucide-react';

interface HeaderProps {
  currentView: 'cards' | 'map' | 'gallery';
  onViewChange: (view: 'cards' | 'map' | 'gallery') => void;
  onOpenAddModal: () => void;
  onOpenVisualSearch: () => void;
  onOpenApiModal: () => void;
  totalRoutesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  onOpenAddModal,
  onOpenVisualSearch,
  onOpenApiModal,
  totalRoutesCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-stone-950/90 backdrop-blur-md border-b border-stone-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50 border border-emerald-500/40">
            <Mountain className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-xl sm:text-2xl text-stone-100 tracking-tight">
                Horský Deník
              </h1>
              <span className="hidden sm:inline-block bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                Osobní archiv
              </span>
            </div>
            <p className="text-xs text-stone-400 font-medium">
              Evidence turistických tras, výstupů & GPX záznamů
            </p>
          </div>
        </div>

        {/* Center View Selector Tabs */}
        <div className="flex items-center bg-stone-900/90 p-1 rounded-xl border border-stone-800 shadow-inner">
          <button
            type="button"
            onClick={() => onViewChange('cards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'cards'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Přehled tras</span>
          </button>
          <button
            type="button"
            onClick={() => onViewChange('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'map'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Mapa tras</span>
          </button>
          <button
            type="button"
            onClick={() => onViewChange('gallery')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentView === 'gallery'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Fotogalerie</span>
          </button>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* AI Visual Search */}
          <button
            type="button"
            onClick={onOpenVisualSearch}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-amber-300 hover:text-amber-200 text-xs font-semibold rounded-xl border border-amber-500/30 hover:border-amber-500/60 shadow transition-all cursor-pointer"
            title="Najít trasu podle nahrané fotky"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Hledat fotkou</span>
          </button>

          {/* API & GitHub & Backup */}
          <button
            type="button"
            onClick={onOpenApiModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white text-xs font-semibold rounded-xl border border-stone-800 hover:border-stone-700 transition-all cursor-pointer"
            title="API přístup, GitHub zálohy a export"
          >
            <Key className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">API & GitHub</span>
          </button>

          {/* Add Route Button */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Přidat trasu</span>
          </button>
        </div>
      </div>
    </header>
  );
};
