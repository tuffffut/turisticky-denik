import React, { useState, useRef } from 'react';
import { HikingRoute, Difficulty, RouteType, VisitAgainStatus, WeatherCondition, Season, RoutePhoto } from '../types';
import { parseGpxString } from '../utils/gpxParser';
import {
  X,
  Upload,
  FileText,
  Mountain,
  MapPin,
  Calendar,
  Star,
  RotateCcw,
  Sparkles,
  Users,
  Sun,
  Camera,
  Video,
  Check,
  AlertCircle,
  Clock,
  TrendingUp,
  Wand2,
  Loader2,
} from 'lucide-react';

interface AddRouteModalProps {
  onClose: () => void;
  onSave: (route: Partial<HikingRoute>) => Promise<void>;
  editRoute?: HikingRoute | null;
}

export const AddRouteModal: React.FC<AddRouteModalProps> = ({
  onClose,
  onSave,
  editRoute,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gpxMessage, setGpxMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [title, setTitle] = useState(editRoute?.title || '');
  const [description, setDescription] = useState(editRoute?.description || '');
  const [date, setDate] = useState(editRoute?.date || new Date().toISOString().split('T')[0]);
  const [region, setRegion] = useState(editRoute?.region || 'Královéhradecký kraj');
  const [country, setCountry] = useState(editRoute?.country || 'Česká republika');
  const [mountainRange, setMountainRange] = useState(editRoute?.mountainRange || 'Krkonoše');
  const [distanceKm, setDistanceKm] = useState(editRoute?.distanceKm?.toString() || '15.0');
  const [elevationGainM, setElevationGainM] = useState(editRoute?.elevationGainM?.toString() || '750');
  const [elevationLossM, setElevationLossM] = useState(editRoute?.elevationLossM?.toString() || '750');
  const [highestPointM, setHighestPointM] = useState(editRoute?.highestPointM?.toString() || '1200');
  const [lowestPointM, setLowestPointM] = useState(editRoute?.lowestPointM?.toString() || '600');
  const [durationHours, setDurationHours] = useState(
    editRoute ? (Math.floor(editRoute.durationMinutes / 60)).toString() : '4'
  );
  const [durationMinutes, setDurationMinutes] = useState(
    editRoute ? (editRoute.durationMinutes % 60).toString() : '30'
  );
  const [rating, setRating] = useState<number>(editRoute?.rating || 5);
  const [difficulty, setDifficulty] = useState<Difficulty>(editRoute?.difficulty || 'moderate');
  const [routeType, setRouteType] = useState<RouteType>(editRoute?.routeType || 'hiking');
  const [wantToVisitAgain, setWantToVisitAgain] = useState<VisitAgainStatus>(editRoute?.wantToVisitAgain || 'yes');

  // Highlights, tags, companions
  const [highlightInput, setHighlightInput] = useState('');
  const [highlights, setHighlights] = useState<string[]>(editRoute?.highlights || []);

  const [companionInput, setCompanionInput] = useState('');
  const [companions, setCompanions] = useState<string[]>(editRoute?.companions || []);

  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(editRoute?.tags || []);

  // Weather & season
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>(editRoute?.weather?.condition || 'sunny');
  const [temperature, setTemperature] = useState(editRoute?.weather?.tempC?.toString() || '18');
  const [weatherNote, setWeatherNote] = useState(editRoute?.weather?.note || '');
  const [season, setSeason] = useState<Season>(editRoute?.season || 'summer');

  // Photos & GPX data
  const [photos, setPhotos] = useState<RoutePhoto[]>(editRoute?.photos || []);
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [photoCaptionInput, setPhotoCaptionInput] = useState('');
  const [videos, setVideos] = useState(editRoute?.videos || []);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [gpxData, setGpxData] = useState<any>(editRoute?.gpxData || null);
  const [gpxFileName, setGpxFileName] = useState(editRoute?.gpxFileName || '');
  const [notesPrivate, setNotesPrivate] = useState(editRoute?.notesPrivate || '');

  // AI Story Assistant states
  const [rawAiNotes, setRawAiNotes] = useState('');
  const [isPolishingStory, setIsPolishingStory] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  const handlePolishStoryWithAi = async () => {
    if (!rawAiNotes.trim() && !description.trim()) {
      setAiError('Zadejte prosím alespoň několik hesel nebo surové poznámky.');
      return;
    }
    setIsPolishingStory(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/polish-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          rawNotes: rawAiNotes.trim() || description.trim(),
          distanceKm: parseFloat(distanceKm) || undefined,
          elevationGainM: parseInt(elevationGainM, 10) || undefined,
          mountainRange,
          highlights,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI zápis se nepodařilo vygenerovat');
      }
      if (data.polishedStory) {
        setDescription(data.polishedStory);
      }
      if (data.suggestedTitle && (!title || title.toLowerCase().includes('turistika') || title.toLowerCase().includes('track'))) {
        setTitle(data.suggestedTitle);
      }
      if (Array.isArray(data.suggestedHighlights) && data.suggestedHighlights.length > 0) {
        const newHighlights = Array.from(new Set([...highlights, ...data.suggestedHighlights]));
        setHighlights(newHighlights);
      }
      setShowAiAssistant(false);
      setRawAiNotes('');
    } catch (err: any) {
      setAiError(err.message || 'Chyba při komunikaci s AI.');
    } finally {
      setIsPolishingStory(false);
    }
  };

  // GPX Parser trigger
  const handleGpxFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseGpxString(text);

        if (!title && parsed.title) {
          setTitle(parsed.title);
        }
        setDistanceKm(parsed.distanceKm.toString());
        setElevationGainM(parsed.elevationGainM.toString());
        setElevationLossM(parsed.elevationLossM.toString());
        setHighestPointM(parsed.highestPointM.toString());
        setLowestPointM(parsed.lowestPointM.toString());

        const h = Math.floor(parsed.durationMinutes / 60);
        const m = parsed.durationMinutes % 60;
        setDurationHours(h.toString());
        setDurationMinutes(m.toString());

        setGpxData(parsed.gpxData);
        setGpxFileName(file.name);

        setGpxMessage({
          type: 'success',
          text: `GPX data úspěšně vytěžena: ${parsed.distanceKm} km, +${parsed.elevationGainM} m, vrchol ${parsed.highestPointM} m n.m.`,
        });
      } catch (err: any) {
        setGpxMessage({
          type: 'error',
          text: err.message || 'Chyba při čtení GPX souboru',
        });
      }
    };
    reader.readAsText(file);
  };

  // Photo file picker (multi-upload to base64)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        setPhotos((prev) => [
          ...prev,
          {
            id: 'p-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            url: base64Url,
            caption: file.name.replace(/\.[^/.]+$/, ''),
            isCover: prev.length === 0,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Add photo via URL
  const handleAddPhotoByUrl = () => {
    if (!photoUrlInput.trim()) return;
    setPhotos((prev) => [
      ...prev,
      {
        id: 'p-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        url: photoUrlInput.trim(),
        caption: photoCaptionInput.trim() || undefined,
        isCover: prev.length === 0,
      },
    ]);
    setPhotoUrlInput('');
    setPhotoCaptionInput('');
  };

  const handleAddHighlight = () => {
    if (!highlightInput.trim()) return;
    setHighlights([...highlights, highlightInput.trim()]);
    setHighlightInput('');
  };

  const handleAddCompanion = () => {
    if (!companionInput.trim()) return;
    setCompanions([...companions, companionInput.trim()]);
    setCompanionInput('');
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    setTags([...tags, tagInput.trim()]);
    setTagInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const totalMinutes = parseInt(durationHours || '0', 10) * 60 + parseInt(durationMinutes || '0', 10);
      const visitedYear = parseInt(date.split('-')[0], 10) || new Date().getFullYear();

      const routePayload: Partial<HikingRoute> = {
        title: title.trim(),
        description: description.trim(),
        date,
        visitedYear,
        region: region.trim(),
        country: country.trim(),
        mountainRange: mountainRange.trim(),
        distanceKm: parseFloat(distanceKm) || 0,
        elevationGainM: parseInt(elevationGainM, 10) || 0,
        elevationLossM: parseInt(elevationLossM, 10) || 0,
        highestPointM: parseInt(highestPointM, 10) || 0,
        lowestPointM: parseInt(lowestPointM, 10) || 0,
        durationMinutes: totalMinutes || 120,
        rating,
        difficulty,
        routeType,
        wantToVisitAgain,
        highlights,
        companions,
        tags,
        notesPrivate,
        weather: {
          condition: weatherCondition,
          tempC: temperature ? parseInt(temperature, 10) : undefined,
          note: weatherNote.trim() || undefined,
        },
        season,
        photos,
        videos,
        gpxData: gpxData || undefined,
        gpxFileName: gpxFileName || undefined,
      };

      await onSave(routePayload);
      onClose();
    } catch (err) {
      console.error('Failed to save route:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/50">
          <div className="flex items-center gap-2.5">
            <Mountain className="w-6 h-6 text-emerald-400" />
            <h2 className="font-display font-bold text-xl text-white">
              {editRoute ? 'Upravit turistickou trasu' : 'Nová turistická trasa'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* GPX Auto-Import Area */}
          <div className="bg-stone-950/60 border-2 border-dashed border-emerald-500/40 hover:border-emerald-500 rounded-xl p-5 text-center transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              accept=".gpx,application/gpx+xml"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleGpxFile(e.target.files[0]);
              }}
            />
            <Upload className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
            <h4 className="font-semibold text-stone-100 text-sm mb-1">
              {gpxFileName ? `Připojen GPX: ${gpxFileName}` : 'Připojit trasu pomocí GPX souboru'}
            </h4>
            <p className="text-xs text-stone-400 max-w-md mx-auto mb-3">
              Nahrajte svůj .GPX soubor z Garminu, Mapy.cz, Stravy nebo mobilu. Automaticky z něj spočítáme kilometry, převýšení nahoru i dolů, výškový profil a zakreslíme trasu na mapu!
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>{gpxFileName ? 'Vybrat jiný GPX soubor' : 'Vybrat GPX soubor z počítače'}</span>
            </button>

            {gpxMessage && (
              <div
                className={`mt-3 p-2.5 rounded-lg text-xs flex items-center justify-center gap-2 ${
                  gpxMessage.type === 'success'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                    : 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                }`}
              >
                {gpxMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{gpxMessage.text}</span>
              </div>
            )}
          </div>

          {/* Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Název trasy *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="např. Přechod hřebene Krkonoš: Ze Špindlu na Sněžku"
                className="w-full px-3.5 py-2.5 bg-stone-950/80 border border-stone-800 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Datum návštěvy *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-950/80 border border-stone-800 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Pohoří */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Pohoří / Hory
              </label>
              <input
                type="text"
                value={mountainRange}
                onChange={(e) => setMountainRange(e.target.value)}
                placeholder="např. Krkonoše, Šumava, Vysoké Tatry, Alpy"
                className="w-full px-3.5 py-2.5 bg-stone-950/80 border border-stone-800 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Region / Kraj */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Kraj / Oblast
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="např. Královéhradecký kraj, Plzeňský kraj"
                className="w-full px-3.5 py-2.5 bg-stone-950/80 border border-stone-800 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Stát */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Země / Stát
              </label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Česká republika, Slovensko, Rakousko..."
                className="w-full px-3.5 py-2.5 bg-stone-950/80 border border-stone-800 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Stats: km, ascent, descent, peak */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-950/50 p-4 rounded-xl border border-stone-800/80">
            <div>
              <label className="block text-[11px] font-semibold text-emerald-400 mb-1">
                Vzdálenost (km)
              </label>
              <input
                type="number"
                step="0.1"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-100 text-sm focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-amber-400 mb-1">
                Nastoupáno (+m)
              </label>
              <input
                type="number"
                value={elevationGainM}
                onChange={(e) => setElevationGainM(e.target.value)}
                className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-100 text-sm focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-300 mb-1">
                Klesání (-m)
              </label>
              <input
                type="number"
                value={elevationLossM}
                onChange={(e) => setElevationLossM(e.target.value)}
                className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-100 text-sm focus:border-stone-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-rose-400 mb-1">
                Nejvyšší bod (m n.m.)
              </label>
              <input
                type="number"
                value={highestPointM}
                onChange={(e) => setHighestPointM(e.target.value)}
                className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-stone-100 text-sm focus:border-rose-500"
              />
            </div>
          </div>
          <p className="text-[11px] text-stone-400 -mt-2">
            💡 Převýšení je po nahrání GPX automaticky vyhlazeno od GPS šumu (nebo převzato z Garmin/Mapy.cz metadat). Všechny hodnoty můžete dle potřeby přímo upravit.
          </p>

          {/* Duration, Rating, Difficulty, Visit Again */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Čas chůze
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  className="w-1/2 px-2.5 py-2 bg-stone-950/80 border border-stone-800 rounded-lg text-sm text-center"
                />
                <span className="text-xs text-stone-400">h</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-1/2 px-2.5 py-2 bg-stone-950/80 border border-stone-800 rounded-lg text-sm text-center"
                />
                <span className="text-xs text-stone-400">m</span>
              </div>
            </div>

            {/* Rating Stars */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Hodnocení ({rating}/5)
              </label>
              <div className="flex items-center gap-1 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="cursor-pointer focus:outline-none"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Náročnost
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full px-3 py-2 bg-stone-950/80 border border-stone-800 rounded-xl text-stone-100 text-sm focus:border-emerald-500"
              >
                <option value="easy">Nenáročná</option>
                <option value="moderate">Střední</option>
                <option value="hard">Náročná</option>
                <option value="extreme">Vysokohorská / Ferrata</option>
              </select>
            </div>

            {/* Navštívit znovu */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Navštívit znovu?
              </label>
              <select
                value={wantToVisitAgain}
                onChange={(e) => setWantToVisitAgain(e.target.value as VisitAgainStatus)}
                className="w-full px-3 py-2 bg-stone-950/80 border border-stone-800 rounded-xl text-stone-100 text-sm focus:border-amber-500"
              >
                <option value="yes">Určitě ano (Chci znovu)</option>
                <option value="maybe">Možná někdy</option>
                <option value="no">Už stačilo / jednou stačilo</option>
              </select>
            </div>
          </div>

          {/* Description & AI Story Assistant */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-stone-300">
                Popis trasy a osobní zážitky
              </label>

              <button
                type="button"
                onClick={() => setShowAiAssistant(!showAiAssistant)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-medium shadow-sm transition-all cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                <span>{showAiAssistant ? 'Skrýt AI asistenta' : 'Napsat zápis pomocí AI'}</span>
              </button>
            </div>

            {/* AI Assistant Box */}
            {showAiAssistant && (
              <div className="bg-gradient-to-br from-emerald-950/40 via-stone-900 to-stone-950 p-4 rounded-xl border border-emerald-500/30 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      AI Asistent pro kultivovaný zápis
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Stačí zadat pár hesel, rychlých myšlenek nebo útržků a AI z nich vytvoří autentický a čtivý příběh do deníku.
                    </p>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={rawAiNotes}
                  onChange={(e) => setRawAiNotes(e.target.value)}
                  placeholder="např.: start v 8 ráno v mlze, stoupání lesem, nahoře se vyjasnilo, výhled na hřebeny, borůvkový koláč na chatě, parádní den s kamarády..."
                  className="w-full px-3 py-2 bg-stone-950 border border-emerald-800/60 rounded-lg text-stone-200 text-xs focus:outline-none focus:border-emerald-400 placeholder:text-stone-500"
                />

                {aiError && (
                  <p className="text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {aiError}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={isPolishingStory}
                    onClick={handlePolishStoryWithAi}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md transition-colors cursor-pointer"
                  >
                    {isPolishingStory ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>AI tvoří zápis...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                        <span>Přetvořit na čtivý zápis</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jak se šlo, jaká byla cesta, kde jste zastavili na jídlo, výhledy, stav značení, doporučení..."
              className="w-full px-3.5 py-2.5 bg-stone-950/80 border border-stone-800 rounded-xl text-stone-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Highlights & Companions Chips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Highlights */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Zajímavosti a body zájmu
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={highlightInput}
                  onChange={(e) => setHighlightInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddHighlight();
                    }
                  }}
                  placeholder="např. Obří vodopád, Chata pod Rysmi..."
                  className="flex-1 px-3 py-1.5 bg-stone-950/80 border border-stone-800 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddHighlight}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg cursor-pointer"
                >
                  Přidat
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {highlights.map((hl, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-stone-800 text-stone-200 px-2 py-1 rounded-md text-xs"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{hl}</span>
                    <button
                      type="button"
                      onClick={() => setHighlights(highlights.filter((_, i) => i !== idx))}
                      className="text-stone-400 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Companions */}
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Společníci / S kým jsem tam byl
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={companionInput}
                  onChange={(e) => setCompanionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCompanion();
                    }
                  }}
                  placeholder="např. Tomáš, Eliška, Pes Blesk..."
                  className="flex-1 px-3 py-1.5 bg-stone-950/80 border border-stone-800 rounded-lg text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddCompanion}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg cursor-pointer"
                >
                  Přidat
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {companions.map((comp, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-stone-800 text-stone-200 px-2 py-1 rounded-md text-xs"
                  >
                    <Users className="w-3 h-3 text-emerald-400" />
                    <span>{comp}</span>
                    <button
                      type="button"
                      onClick={() => setCompanions(companions.filter((_, i) => i !== idx))}
                      className="text-stone-400 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Weather & Season */}
          <div className="bg-stone-950/40 p-4 rounded-xl border border-stone-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Počasí</label>
              <select
                value={weatherCondition}
                onChange={(e) => setWeatherCondition(e.target.value as WeatherCondition)}
                className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-xs"
              >
                <option value="sunny">Slunečno / Jasno</option>
                <option value="partly_cloudy">Polojasno</option>
                <option value="cloudy">Zataženo / Mlhavo</option>
                <option value="rain">Déšť / Přeháňky</option>
                <option value="snow">Sníh / Mráz</option>
                <option value="storm">Horská bouřka</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Teplota (°C)</label>
              <input
                type="number"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                placeholder="např. 18"
                className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">Roční období</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value as Season)}
                className="w-full px-3 py-2 bg-stone-900 border border-stone-800 rounded-lg text-xs"
              >
                <option value="spring">Jaro</option>
                <option value="summer">Léto</option>
                <option value="autumn">Podzim</option>
                <option value="winter">Zima</option>
              </select>
            </div>
          </div>

          {/* Photos Management */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-emerald-400" />
                <span>Fotografie z trasy ({photos.length})</span>
              </label>

              <button
                type="button"
                onClick={() => photoFileInputRef.current?.click()}
                className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg cursor-pointer flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nahrát fotky ze souboru</span>
              </button>
              <input
                type="file"
                ref={photoFileInputRef}
                multiple
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            {/* Add photo by URL */}
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="url"
                value={photoUrlInput}
                onChange={(e) => setPhotoUrlInput(e.target.value)}
                placeholder="Nebo zadejte URL odkazu na fotku (https://...)"
                className="flex-1 px-3 py-1.5 bg-stone-950/80 border border-stone-800 rounded-lg text-xs"
              />
              <input
                type="text"
                value={photoCaptionInput}
                onChange={(e) => setPhotoCaptionInput(e.target.value)}
                placeholder="Popisek fotky"
                className="sm:w-1/3 px-3 py-1.5 bg-stone-950/80 border border-stone-800 rounded-lg text-xs"
              />
              <button
                type="button"
                onClick={handleAddPhotoByUrl}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg cursor-pointer"
              >
                Přidat URL
              </button>
            </div>

            {/* Photo Previews */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-stone-950/50 rounded-xl border border-stone-800">
                {photos.map((p, idx) => (
                  <div key={p.id} className="relative group rounded-lg overflow-hidden border border-stone-800 h-24 bg-stone-900">
                    <img
                      src={p.url}
                      alt={p.caption || 'Foto'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    {p.isCover && (
                      <span className="absolute top-1 left-1 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Titulní
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      {!p.isCover && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhotos(photos.map((ph, i) => ({ ...ph, isCover: i === idx })));
                          }}
                          title="Nastavit jako hlavní"
                          className="p-1 bg-stone-800 hover:bg-emerald-600 rounded text-white text-[10px]"
                        >
                          Titulní
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setPhotos(photos.filter((_, i) => i !== idx))}
                        className="p-1 bg-rose-800 hover:bg-rose-700 rounded text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos */}
          <div>
            <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5 mb-1.5">
              <Video className="w-4 h-4 text-emerald-400" />
              <span>Odkaz na video (YouTube / Vimeo)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 px-3 py-1.5 bg-stone-950/80 border border-stone-800 rounded-lg text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (!videoUrlInput.trim()) return;
                  setVideos([
                    ...videos,
                    {
                      id: 'v-' + Date.now(),
                      url: videoUrlInput.trim(),
                      title: 'Video z výletu',
                      platform: 'youtube',
                    },
                  ]);
                  setVideoUrlInput('');
                }}
                className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded-lg cursor-pointer"
              >
                Přidat video
              </button>
            </div>
            {videos.length > 0 && (
              <div className="mt-2 space-y-1">
                {videos.map((v, i) => (
                  <div key={v.id} className="flex items-center justify-between text-xs bg-stone-950/60 px-3 py-1.5 rounded-lg border border-stone-800">
                    <span className="truncate text-stone-300">{v.url}</span>
                    <button
                      type="button"
                      onClick={() => setVideos(videos.filter((_, idx) => idx !== i))}
                      className="text-stone-400 hover:text-rose-400 ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-stone-300 hover:text-white bg-stone-800/80 hover:bg-stone-700 text-sm font-medium transition-colors cursor-pointer"
            >
              Zrušit
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-emerald-950 transition-colors cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>Ukládám trasu...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editRoute ? 'Uložit změny' : 'Přidat trasu do deníku'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
