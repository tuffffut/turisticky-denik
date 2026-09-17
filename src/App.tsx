import React, { useState, useEffect, useMemo } from 'react';
import { HikingRoute, RouteFilterState, initialFilterState } from './types';
import { INITIAL_ROUTES as initialRoutes } from './data/initialRoutes';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { FilterBar } from './components/FilterBar';
import { RouteCard } from './components/RouteCard';
import { RouteMap } from './components/RouteMap';
import { GalleryView } from './components/GalleryView';
import { RouteDetailModal } from './components/RouteDetailModal';
import { AddRouteModal } from './components/AddRouteModal';
import { VisualSearchModal } from './components/VisualSearchModal';
import { ApiAndBackupModal } from './components/ApiAndBackupModal';
import { SecurityLockOverlay } from './components/SecurityLockOverlay';
import {
  Compass,
  Plus,
  Sparkles,
  Mountain,
  Trees,
  FilterX,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function App() {
  const [routes, setRoutes] = useState<HikingRoute[]>(initialRoutes);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'cards' | 'map' | 'gallery'>('cards');
  const [filters, setFilters] = useState<RouteFilterState>(initialFilterState);

  // Security / PIN state
  const [isLocked, setIsLocked] = useState(false);
  const [savedPin, setSavedPin] = useState<string>('');

  // Modals state
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<HikingRoute | null>(null);
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Check PIN security on startup
  useEffect(() => {
    const checkSecurity = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlKey = urlParams.get('key') || urlParams.get('token') || urlParams.get('pin');
        const localPin = localStorage.getItem('hd_user_pin') || '';
        const isSessionUnlocked = sessionStorage.getItem('hd_unlocked') === 'true';

        // Check backend config
        const res = await fetch('/api/config');
        if (res.ok) {
          const config = await res.json();
          if (config.isPinLockEnabled) {
            // If URL provides valid key / token, unlock directly
            if (urlKey) {
              const verifyRes = await fetch('/api/config/pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify', pin: urlKey }),
              });
              if (verifyRes.ok) {
                setIsLocked(false);
                sessionStorage.setItem('hd_unlocked', 'true');
                localStorage.setItem('hd_user_pin', urlKey);
                showToast('🔑 Automaticky odemčeno bezpečnostním klíčem');
                return;
              }
            }

            // Check if already unlocked in this session or local device
            if (isSessionUnlocked) {
              setIsLocked(false);
              return;
            }

            if (localPin) {
              const verifyRes = await fetch('/api/config/pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify', pin: localPin }),
              });
              if (verifyRes.ok) {
                setIsLocked(false);
                sessionStorage.setItem('hd_unlocked', 'true');
                return;
              }
            }

            // Otherwise lock
            setIsLocked(true);
            setSavedPin(localPin);
          }
        }
      } catch (err) {
        console.warn('Could not verify PIN security:', err);
      }
    };
    checkSecurity();
  }, []);

  // Handle setting new PIN
  const handleSetNewPin = async (newPin: string) => {
    try {
      await fetch('/api/config/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', newPin }),
      });
      localStorage.setItem('hd_user_pin', newPin);
      sessionStorage.setItem('hd_unlocked', 'true');
      setSavedPin(newPin);
      setIsLocked(false);
      showToast('🔒 Bezpečnostní PIN byl uložen a aktivován.');
    } catch (err) {
      console.error('Error saving PIN:', err);
    }
  };

  const handleUnlockWithPin = async () => {
    sessionStorage.setItem('hd_unlocked', 'true');
    setIsLocked(false);
    showToast('🔓 Deník byl úspěšně odemčen.');
  };

  // Fetch routes on mount
  const fetchRoutes = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/routes');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.routes || []);
        if (Array.isArray(list)) {
          setRoutes(list);

          // Check if URL has ?edit=routeId or ?open=routeId from Telegram notification
          try {
            const params = new URLSearchParams(window.location.search);
            const editId = params.get('edit');
            const openId = params.get('open');
            if (editId) {
              const target = list.find((r) => r.id === editId);
              if (target) {
                setEditingRoute(target);
                setIsAddModalOpen(true);
                showToast(`Otevřena túra: ${target.title}`);
              }
            } else if (openId) {
              const target = list.find((r) => r.id === openId);
              if (target) {
                setSelectedRouteId(target.id);
              }
            }
          } catch (e) {
            console.error('Error reading URL search params:', e);
          }
        }
      }
    } catch (err) {
      console.warn('Using local fallback routes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  // Filter & Sort routes
  const filteredRoutes = useMemo(() => {
    return routes
      .filter((route) => {
        // Search query
        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          const matchTitle = route.title.toLowerCase().includes(q);
          const matchDesc = route.description.toLowerCase().includes(q);
          const matchRegion = route.region.toLowerCase().includes(q);
          const matchRange = route.mountainRange?.toLowerCase().includes(q);
          const matchHighlights = route.highlights?.some((h) => h.toLowerCase().includes(q));
          const matchCompanions = route.companions?.some((c) => c.toLowerCase().includes(q));
          const matchTags = route.tags?.some((t) => t.toLowerCase().includes(q));
          if (!matchTitle && !matchDesc && !matchRegion && !matchRange && !matchHighlights && !matchCompanions && !matchTags) {
            return false;
          }
        }

        // Region / Mountain range
        if (filters.region !== 'all') {
          if (route.region !== filters.region && route.mountainRange !== filters.region) {
            return false;
          }
        }

        // Year
        if (filters.year !== 'all') {
          const rYear = (route.visitedYear || new Date(route.date).getFullYear()).toString();
          if (rYear !== filters.year) {
            return false;
          }
        }

        // Rating
        if (filters.minRating > 0 && route.rating < filters.minRating) {
          return false;
        }

        // Want to visit again
        if (filters.wantToVisitAgain !== 'all' && route.wantToVisitAgain !== filters.wantToVisitAgain) {
          return false;
        }

        // Difficulty
        if (filters.difficulty !== 'all' && route.difficulty !== filters.difficulty) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'date_asc':
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          case 'rating_desc':
            return b.rating - a.rating;
          case 'distance_desc':
            return (b.distanceKm || 0) - (a.distanceKm || 0);
          case 'elevation_desc':
            return (b.elevationGainM || 0) - (a.elevationGainM || 0);
          case 'date_desc':
          default:
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
      });
  }, [routes, filters]);

  // Selected route object
  const selectedRoute = useMemo(() => {
    return routes.find((r) => r.id === selectedRouteId) || null;
  }, [routes, selectedRouteId]);

  // Handlers
  const handleSaveRoute = async (routeData: Partial<HikingRoute>) => {
    try {
      if (editingRoute) {
        // Update existing
        const res = await fetch(`/api/routes/${editingRoute.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(routeData),
        });
        const data = await res.json();
        const updated = data.route || data;
        setRoutes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        showToast(`Trasa "${updated.title}" byla upravena.`);
      } else {
        // Create new
        const res = await fetch('/api/routes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(routeData),
        });
        const data = await res.json();
        const created = data.route || data;
        setRoutes((prev) => [created, ...prev]);
        showToast(`Nová trasa "${created.title}" byla uložena do deníku.`);
      }
      setEditingRoute(null);
    } catch (err) {
      console.error('Failed to save route:', err);
      showToast('Chyba při ukládání trasy.');
    }
  };

  const handleDeleteRoute = async (id: string) => {
    try {
      const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Nepodařilo se smazat trasu ze serveru.');
      }
      setRoutes((prev) => prev.filter((r) => r.id !== id));
      if (selectedRouteId === id) setSelectedRouteId(null);
      showToast('Trasa byla trvale odstraněna z deníku.');
    } catch (err: any) {
      console.error('Failed to delete route:', err);
      showToast(err.message || 'Chyba při mazání trasy.');
    }
  };

  const handleToggleVisitAgain = async (id: string, current: string) => {
    const nextVal = current === 'yes' ? 'maybe' : 'yes';
    try {
      await fetch(`/api/routes/${id}/visit-again`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextVal }),
      });
      setRoutes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, wantToVisitAgain: nextVal as any } : r))
      );
      showToast(nextVal === 'yes' ? 'Označeno k opětovné návštěvě!' : 'Značka k návštěvě odebrána.');
    } catch (err) {
      console.error('Failed to toggle visit again:', err);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenAddModal={() => {
          setEditingRoute(null);
          setIsAddModalOpen(true);
        }}
        onOpenVisualSearch={() => setIsVisualSearchOpen(true)}
        onOpenApiModal={() => setIsApiModalOpen(true)}
        totalRoutesCount={routes.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Stats Overview */}
        <StatsOverview routes={routes} />

        {/* Global Filter Bar (visible in cards & map views) */}
        {currentView !== 'gallery' && (
          <FilterBar
            filters={filters}
            onFilterChange={setFilters}
            onResetFilters={() => setFilters(initialFilterState)}
            routes={routes}
            totalFilteredCount={filteredRoutes.length}
          />
        )}

        {/* VIEW 1: ROUTE CARDS GRID */}
        {currentView === 'cards' && (
          <div>
            {filteredRoutes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRoutes.map((route) => (
                  <RouteCard
                    key={route.id}
                    route={route}
                    onSelect={(id) => setSelectedRouteId(id)}
                    onToggleVisitAgain={handleToggleVisitAgain}
                    onDelete={handleDeleteRoute}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-stone-900/40 rounded-2xl border border-stone-800/80 p-8 max-w-lg mx-auto">
                <FilterX className="w-12 h-12 mx-auto text-stone-600 mb-3" />
                <h3 className="text-lg font-bold text-stone-200">
                  Žádné trasy neodpovídají zadaným filtrům
                </h3>
                <p className="text-xs text-stone-400 mt-1 mb-4">
                  Zkuste upravit nebo vymazat filtry pro zobrazení všech zaznamenaných horských tras.
                </p>
                <button
                  type="button"
                  onClick={() => setFilters(initialFilterState)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Resetovat všechny filtry
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: INTERACTIVE MAP OF ALL FILTERED ROUTES */}
        {currentView === 'map' && (
          <div className="space-y-6">
            <div className="bg-stone-900/60 p-4 rounded-2xl border border-stone-800 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-stone-100 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-emerald-400" />
                  <span>Mapa turistických tras</span>
                </h2>
                <p className="text-xs text-stone-400">
                  Zobrazeno {filteredRoutes.length} tras podle aktuálního filtru. Kliknutím na trasu nebo bod otevřete detail.
                </p>
              </div>

              <div className="text-xs text-stone-400 hidden sm:block">
                Přepínejte mezi Topomapou, Satelitem a Ulicemi v pravém horním rohu mapy.
              </div>
            </div>

            <RouteMap
              routes={filteredRoutes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(id) => setSelectedRouteId(id)}
              height="620px"
            />

            {/* Quick Strip of Filtered Route Mini-Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
              {filteredRoutes.map((route) => (
                <div
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                    selectedRouteId === route.id
                      ? 'bg-emerald-950/40 border-emerald-500 shadow-md'
                      : 'bg-stone-900/70 hover:bg-stone-850 border-stone-800'
                  }`}
                >
                  {route.photos[0] && (
                    <img
                      src={route.photos[0].url}
                      alt={route.title}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-stone-100 truncate">
                      {route.title}
                    </h4>
                    <div className="flex items-center gap-1.5 text-[11px] text-stone-400 mt-0.5">
                      <span className="text-emerald-400 font-medium">{route.distanceKm} km</span>
                      <span>•</span>
                      <span className="text-amber-400">+{route.elevationGainM} m</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: PHOTO GALLERY */}
        {currentView === 'gallery' && (
          <GalleryView
            routes={routes}
            onSelectRoute={(id) => setSelectedRouteId(id)}
          />
        )}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 border border-emerald-500 text-emerald-300 text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MODALS */}
      {/* Route Detail Modal */}
      {selectedRoute && (
        <RouteDetailModal
          route={selectedRoute}
          onClose={() => setSelectedRouteId(null)}
          onEdit={(r) => {
            setEditingRoute(r);
            setSelectedRouteId(null);
            setIsAddModalOpen(true);
          }}
          onDelete={handleDeleteRoute}
          onToggleVisitAgain={handleToggleVisitAgain}
        />
      )}

      {/* Add / Edit Route Modal */}
      {isAddModalOpen && (
        <AddRouteModal
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingRoute(null);
          }}
          onSave={handleSaveRoute}
          editRoute={editingRoute}
        />
      )}

      {/* Visual Search Modal */}
      {isVisualSearchOpen && (
        <VisualSearchModal
          onClose={() => setIsVisualSearchOpen(false)}
          onSelectRoute={(id) => {
            setSelectedRouteId(id);
            setIsVisualSearchOpen(false);
          }}
          routes={routes}
        />
      )}

      {/* API, GitHub & Backup Modal */}
      {isApiModalOpen && (
        <ApiAndBackupModal
          onClose={() => setIsApiModalOpen(false)}
          routes={routes}
          onImportSuccess={() => {
            fetchRoutes();
            showToast('Záloha byla úspěšně načtena do deníku!');
          }}
        />
      )}

      {/* Security Lock Screen */}
      {isLocked && (
        <SecurityLockOverlay
          savedPin={savedPin}
          onUnlock={handleUnlockWithPin}
          onSetNewPin={handleSetNewPin}
        />
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-900 bg-stone-950/80 py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Mountain className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-stone-400">Horský Deník</span>
            <span>— Vaše osobní horská kronika</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Podpora formátu GPX</span>
            <span>•</span>
            <span>AI vizuální vyhledávání</span>
            <span>•</span>
            <span>REST API pro záznamy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
