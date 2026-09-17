import React, { useState } from 'react';
import { HikingRoute, RoutePhoto } from '../types';
import { PhotoLightbox } from './PhotoLightbox';
import { MapPin, Calendar, Mountain, ArrowUpRight, Camera } from 'lucide-react';

interface GalleryViewProps {
  routes: HikingRoute[];
  onSelectRoute: (routeId: string) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({ routes, onSelectRoute }) => {
  // Aggregate all photos with their route context
  const allPhotosWithContext = routes.flatMap((route) =>
    route.photos.map((photo) => ({
      photo,
      routeId: route.id,
      routeTitle: route.title,
      routeDate: route.date,
      region: route.region,
      mountainRange: route.mountainRange,
    }))
  );

  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  if (allPhotosWithContext.length === 0) {
    return (
      <div className="text-center py-20 bg-stone-900/60 rounded-2xl border border-stone-800 p-8">
        <Camera className="w-12 h-12 mx-auto text-stone-600 mb-3" />
        <h3 className="text-lg font-bold text-stone-200">Zatím žádné fotografie</h3>
        <p className="text-sm text-stone-400 mt-1">
          Přidejte k trasám fotky a vytvořte si nádhernou horskou galerii!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-display text-white">
            Horská fotogalerie
          </h2>
          <p className="text-xs text-stone-400">
            Celkem {allPhotosWithContext.length} fotografií ze zdolaných vrcholů a hlubokých lesů
          </p>
        </div>
      </div>

      {/* Masonry / Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allPhotosWithContext.map((item, idx) => (
          <div
            key={item.photo.id || idx}
            className="group relative rounded-2xl overflow-hidden bg-stone-900 border border-stone-800/90 shadow-md hover:shadow-2xl transition-all duration-300"
          >
            {/* Image */}
            <div
              onClick={() => setSelectedPhotoIndex(idx)}
              className="h-64 w-full overflow-hidden cursor-pointer bg-stone-950"
            >
              <img
                src={item.photo.url}
                alt={item.photo.caption || item.routeTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent pointer-events-none" />

            {/* Top Badge: Region */}
            <div className="absolute top-2.5 left-2.5 pointer-events-none">
              <span className="inline-flex items-center gap-1 bg-stone-950/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-medium text-stone-200 border border-stone-700/50">
                <MapPin className="w-2.5 h-2.5 text-emerald-400" />
                <span>{item.mountainRange || item.region}</span>
              </span>
            </div>

            {/* Bottom Content Info */}
            <div className="absolute bottom-0 inset-x-0 p-3 z-10">
              {item.photo.caption && (
                <p className="text-xs font-semibold text-stone-100 line-clamp-1 mb-1">
                  {item.photo.caption}
                </p>
              )}

              <div className="flex items-center justify-between text-[11px] text-stone-400">
                <button
                  type="button"
                  onClick={() => onSelectRoute(item.routeId)}
                  className="hover:text-emerald-300 transition-colors flex items-center gap-1 truncate max-w-[180px] font-medium cursor-pointer"
                >
                  <span>{item.routeTitle}</span>
                  <ArrowUpRight className="w-3 h-3 shrink-0" />
                </button>

                <span>{new Date(item.routeDate).toLocaleDateString('cs-CZ')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Lightbox */}
      {selectedPhotoIndex !== null && (
        <PhotoLightbox
          photos={allPhotosWithContext.map((c) => c.photo)}
          initialIndex={selectedPhotoIndex}
          onClose={() => setSelectedPhotoIndex(null)}
        />
      )}
    </div>
  );
};
