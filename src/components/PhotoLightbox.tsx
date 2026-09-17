import React, { useEffect } from 'react';
import { RoutePhoto } from '../types';
import { X, ChevronLeft, ChevronRight, Camera } from 'lucide-react';

interface PhotoLightboxProps {
  photos: RoutePhoto[];
  initialIndex?: number;
  onClose: () => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photos,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  const currentPhoto = photos[currentIndex];

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photos.length]);

  if (!currentPhoto) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/95 backdrop-blur-md flex flex-col justify-between p-4 select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-stone-300 text-sm">
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>
            {currentIndex + 1} z {photos.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full bg-stone-800/80 hover:bg-stone-700 text-stone-200 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Image container */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden my-2">
        <img
          src={currentPhoto.url}
          alt={currentPhoto.caption || 'Horská fotografie'}
          referrerPolicy="no-referrer"
          className="max-h-[82vh] max-w-[92vw] object-contain rounded-lg shadow-2xl transition-all"
        />

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-stone-900/80 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-3 rounded-full bg-stone-900/80 hover:bg-emerald-600 text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Caption */}
      <div className="text-center z-10 max-w-2xl mx-auto">
        {currentPhoto.caption && (
          <p className="text-stone-200 text-sm font-medium bg-stone-900/80 px-4 py-2 rounded-lg backdrop-blur-sm inline-block">
            {currentPhoto.caption}
          </p>
        )}
      </div>
    </div>
  );
};
