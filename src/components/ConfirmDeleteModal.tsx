import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  routeTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  routeTitle,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-stone-900 border border-stone-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400 shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-stone-100 leading-snug">
              Opravdu chcete smazat tuto trasu?
            </h3>
            <p className="text-xs text-stone-400 mt-1 line-clamp-2">
              Trasa <strong className="text-stone-200">„{routeTitle}“</strong> bude trvale odstraněna z vašeho deníku i databázového souboru.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-stone-400 hover:text-stone-200 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Zrušit
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-lg shadow-rose-950 flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Ano, smazat trasu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
