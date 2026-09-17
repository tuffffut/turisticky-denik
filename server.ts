import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { INITIAL_ROUTES } from './src/data/initialRoutes';
import { parseGpxString } from './src/utils/gpxParser';
import { HikingRoute } from './src/types';

const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'hiking-routes-storage.json');
const CONFIG_FILE = path.join(process.cwd(), 'app-config.json');

// Helper to initialize and read routes
function getStoredRoutes(): HikingRoute[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read routes file, fallback to initial:', err);
  }
  // Initialize with initial routes
  saveStoredRoutes(INITIAL_ROUTES);
  return INITIAL_ROUTES;
}

function saveStoredRoutes(routes: HikingRoute[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(routes, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save routes file:', err);
  }
}

// User Config & API Token
interface AppConfig {
  apiToken: string;
  pinLockHash?: string;
  isPinLockEnabled?: boolean;
}

function getAppConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read config file:', err);
  }
  const defaultConfig: AppConfig = {
    apiToken: 'hd_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36),
    isPinLockEnabled: false,
  };
  saveAppConfig(defaultConfig);
  return defaultConfig;
}

function saveAppConfig(cfg: AppConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save config file:', err);
  }
}

// Lazy Gemini client initialization
let genAiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!genAiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY není nastaven v proměnných prostředí.');
    }
    genAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAiClient;
}

async function startServer() {
  const app = express();

  // Allow larger payload for GPX files and base64 photos
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'horsky-denik-api', timestamp: new Date().toISOString() });
  });

  // Get Config & API Token info
  app.get('/api/config', (req, res) => {
    const config = getAppConfig();
    res.json({
      apiToken: config.apiToken,
      isPinLockEnabled: !!config.isPinLockEnabled,
      hasPinSet: !!config.pinLockHash,
    });
  });

  // Verify or set PIN
  app.post('/api/config/pin', (req, res) => {
    const { pin, action, newPin } = req.body;
    const config = getAppConfig();

    if (action === 'set') {
      if (!newPin || typeof newPin !== 'string' || newPin.length < 4) {
        return res.status(400).json({ success: false, error: 'PIN musí mít alespoň 4 znaky' });
      }
      config.pinLockHash = newPin;
      config.isPinLockEnabled = true;
      saveAppConfig(config);
      return res.json({ success: true, message: 'PIN byl úspěšně nastaven a ochrana aktivována' });
    }

    if (action === 'disable') {
      if (config.pinLockHash && config.pinLockHash !== pin) {
        return res.status(401).json({ success: false, error: 'Nesprávný stávající PIN' });
      }
      config.isPinLockEnabled = false;
      saveAppConfig(config);
      return res.json({ success: true, message: 'Ochrana PINem byla vypnuta' });
    }

    if (action === 'verify') {
      if (!config.isPinLockEnabled) {
        return res.json({ success: true, verified: true });
      }
      // Also allow verification via apiToken
      if (pin === config.pinLockHash || pin === config.apiToken) {
        return res.json({ success: true, verified: true });
      }
      return res.status(401).json({ success: false, verified: false, error: 'Nesprávný PIN' });
    }

    res.status(400).json({ success: false, error: 'Neznámá akce' });
  });

  // Regenerate API Token
  app.post('/api/config/token', (req, res) => {
    const config = getAppConfig();
    config.apiToken = 'hd_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    saveAppConfig(config);
    res.json({ success: true, apiToken: config.apiToken });
  });

  // List all routes
  app.get('/api/routes', (req, res) => {
    const routes = getStoredRoutes();
    res.json({ success: true, routes, count: routes.length });
  });

  // Get single route
  app.get('/api/routes/:id', (req, res) => {
    const routes = getStoredRoutes();
    const route = routes.find((r) => r.id === req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, error: 'Trasa nebyla nalezena' });
    }
    res.json({ success: true, route });
  });

  // Add new route (supports browser UI or direct external API with token)
  app.post('/api/routes', (req, res) => {
    const authHeader = req.headers.authorization || (req.headers['x-api-key'] as string);
    const config = getAppConfig();

    // If request comes from an external client that sets Bearer token or x-api-key
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : authHeader.trim();
      if (token !== config.apiToken) {
        return res.status(401).json({ success: false, error: 'Neplatný API token (x-api-key nebo Authorization: Bearer <token>)' });
      }
    }

    const body = req.body;
    if (!body.title) {
      return res.status(400).json({ success: false, error: 'Chybí povinný název trasy (title)' });
    }

    // Auto-parse GPX XML if passed directly by Python script or curl
    let parsedGpx = body.gpxData;
    let autoDistance = body.distanceKm;
    let autoElevGain = body.elevationGainM;
    let autoElevLoss = body.elevationLossM;
    let autoDuration = body.durationMinutes;
    let autoStartLoc = body.startLocation;
    let autoEndLoc = body.endLocation;
    let autoHighestPoint = body.highestPointM;
    let autoLowestPoint = body.lowestPointM;

    if (body.gpxXml && typeof body.gpxXml === 'string') {
      try {
        const parsed = parseGpxString(body.gpxXml);
        if (parsed) {
          parsedGpx = parsed.gpxData;
          if (!autoDistance && parsed.distanceKm) autoDistance = parsed.distanceKm;
          if (!autoElevGain && parsed.elevationGainM) autoElevGain = parsed.elevationGainM;
          if (!autoElevLoss && parsed.elevationLossM) autoElevLoss = parsed.elevationLossM;
          if (!autoDuration && parsed.durationMinutes) autoDuration = parsed.durationMinutes;
          if (!autoStartLoc && parsed.startLocation) autoStartLoc = parsed.startLocation;
          if (!autoEndLoc && parsed.endLocation) autoEndLoc = parsed.endLocation;
          if (!autoHighestPoint && parsed.highestPointM) autoHighestPoint = parsed.highestPointM;
          if (!autoLowestPoint && parsed.lowestPointM) autoLowestPoint = parsed.lowestPointM;
        }
      } catch (gpxErr) {
        console.warn('Could not auto-parse gpxXml in /api/routes:', gpxErr);
      }
    }

    const routes = getStoredRoutes();
    const now = new Date().toISOString();
    const dateStr = body.date || now.split('T')[0];
    const visitedYear = body.visitedYear || parseInt(dateStr.split('-')[0], 10) || new Date().getFullYear();

    const newRoute: HikingRoute = {
      id: body.id || 'route-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: body.title,
      description: body.description || '',
      date: dateStr,
      visitedYear,
      region: body.region || 'Česká republika',
      country: body.country || 'Česká republika',
      mountainRange: body.mountainRange || '',
      distanceKm: typeof autoDistance === 'number' ? autoDistance : parseFloat(autoDistance || '0') || 0,
      elevationGainM: typeof autoElevGain === 'number' ? autoElevGain : parseInt(autoElevGain || '0', 10) || 0,
      elevationLossM: typeof autoElevLoss === 'number' ? autoElevLoss : parseInt(autoElevLoss || '0', 10) || 0,
      highestPointM: typeof autoHighestPoint === 'number' ? autoHighestPoint : parseInt(autoHighestPoint || '0', 10) || 0,
      lowestPointM: typeof autoLowestPoint === 'number' ? autoLowestPoint : parseInt(autoLowestPoint || '0', 10) || 0,
      durationMinutes: typeof autoDuration === 'number' ? autoDuration : parseInt(autoDuration || '0', 10) || 0,
      rating: typeof body.rating === 'number' ? body.rating : parseInt(body.rating || '5', 10) || 5,
      difficulty: body.difficulty || 'moderate',
      routeType: body.routeType || 'hiking',
      wantToVisitAgain: body.wantToVisitAgain || 'yes',
      highlights: Array.isArray(body.highlights) ? body.highlights : (body.highlights ? [body.highlights] : []),
      companions: Array.isArray(body.companions) ? body.companions : (body.companions ? [body.companions] : []),
      weather: body.weather || { condition: 'sunny', tempC: 20 },
      season: body.season || 'summer',
      photos: Array.isArray(body.photos) ? body.photos : [],
      videos: Array.isArray(body.videos) ? body.videos : [],
      startLocation: autoStartLoc || { lat: 50.0, lng: 15.0, name: 'Start' },
      endLocation: autoEndLoc || { lat: 50.0, lng: 15.0, name: 'Cíl' },
      gpxData: parsedGpx,
      tags: Array.isArray(body.tags) ? body.tags : [],
      notesPrivate: body.notesPrivate || '',
      gpxFileName: body.gpxFileName || '',
      createdAt: now,
      updatedAt: now,
    };

    // Prepend new route
    routes.unshift(newRoute);
    saveStoredRoutes(routes);

    res.status(201).json({ success: true, message: 'Trasa byla úspěšně přidána do deníku', route: newRoute });
  });

  // Update route
  app.put('/api/routes/:id', (req, res) => {
    const routes = getStoredRoutes();
    const index = routes.findIndex((r) => r.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Trasa nebyla nalezena' });
    }

    const updatedRoute: HikingRoute = {
      ...routes[index],
      ...req.body,
      id: routes[index].id, // keep immutable ID
      updatedAt: new Date().toISOString(),
    };

    routes[index] = updatedRoute;
    saveStoredRoutes(routes);

    res.json({ success: true, message: 'Trasa byla aktualizována', route: updatedRoute });
  });

  // Delete route
  app.delete('/api/routes/:id', (req, res) => {
    let routes = getStoredRoutes();
    const exists = routes.some((r) => r.id === req.params.id);
    if (!exists) {
      return res.status(404).json({ success: false, error: 'Trasa nebyla nalezena' });
    }
    routes = routes.filter((r) => r.id !== req.params.id);
    saveStoredRoutes(routes);
    res.json({ success: true, message: 'Trasa byla smazána' });
  });

  // Parse GPX text or uploaded XML
  app.post('/api/routes/gpx-parse', (req, res) => {
    try {
      const { gpxXml } = req.body;
      if (!gpxXml || typeof gpxXml !== 'string') {
        return res.status(400).json({ success: false, error: 'Chybí GPX XML data v těle požadavku (gpxXml).' });
      }

      const parsed = parseGpxString(gpxXml);
      res.json({ success: true, parsed });
    } catch (err: any) {
      console.error('Error parsing GPX:', err);
      res.status(400).json({ success: false, error: err.message || 'Nepodařilo se zpracovat GPX soubor' });
    }
  });

  // Visual search by photo using Gemini Vision
  app.post('/api/vision/search', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg' } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ success: false, error: 'Nebyla poskytnuta žádná fotka k analýze.' });
      }

      const routes = getStoredRoutes();
      const routesSummary = routes.map((r) => ({
        id: r.id,
        title: r.title,
        region: r.region,
        mountainRange: r.mountainRange,
        highlights: r.highlights,
        tags: r.tags,
        highestPointM: r.highestPointM,
        difficulty: r.difficulty,
      }));

      const ai = getGeminiClient();

      const prompt = `Jsi expert na horskou turistiku, geografii a outdoor v České republice, na Slovensku a v Alpách.
Analyzuj přiloženou fotografii z turistického výletu.
Tvé úkoly:
1. Podrobně popiš, co je na fotografii vidět (druh terénu, hory, skály, les, jezero, rašeliniště, vodopád, kamenná moře, roční období, případně konkrétní památka či vrchol).
2. Pokud poznáš konkrétní místo (např. Sněžka, Pravčická brána, Černé jezero, Šumava, Praděd, Bílá Opava, Rysy, Tatry, Dachstein, Kokořín...), uveď to.
3. Zhodnoť shodu s následujícími trasami z turistického deníku uživatele:
${JSON.stringify(routesSummary, null, 2)}

Odpověz POUZE ve formátu JSON s následující strukturou:
{
  "detectedLandmarks": ["např. Sněžka", "Obří důl"],
  "detectedTerrain": ["žulové skály", "horská kleč", "hřebenové výhledy"],
  "detectedSeason": "léto",
  "description": "Stručný a výstižný popis toho, co na fotce vidíš (max 2 věty v češtině)",
  "matchedRouteIds": ["id_shodné_nebo_nejbližší_trasy"],
  "matchExplanations": [
    {
      "routeId": "id_trasy",
      "similarityScore": 95,
      "reason": "Vysvětlení, proč fotka odpovídá této trase"
    }
  ]
}`;

      // Clean base64 string if it has data url prefix
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      const parsedJson = JSON.parse(text);

      res.json({
        success: true,
        analysis: {
          analyzed: true,
          detectedLandmarks: parsedJson.detectedLandmarks || [],
          detectedTerrain: parsedJson.detectedTerrain || [],
          detectedSeason: parsedJson.detectedSeason || 'neznámé',
          description: parsedJson.description || 'Fotografie z horské krajiny.',
          matchedRouteIds: parsedJson.matchedRouteIds || [],
          matchExplanations: parsedJson.matchExplanations || [],
        },
      });
    } catch (err: any) {
      console.error('Vision search failed:', err);
      // Return a graceful fallback if API key or image parsing encounters an issue
      res.status(200).json({
        success: false,
        error: err.message || 'Chyba při analýze fotografie',
        fallbackSuggestion: 'Fotka obsahuje horský nebo lesní motiv. Můžeš zkusit vyhledat podle regionu nebo názvu.',
      });
    }
  });

  // AI Story Polisher: Turns rough notes / bullets into an engaging, cultured hiking story
  app.post('/api/ai/polish-story', async (req, res) => {
    try {
      const { title, rawNotes, distanceKm, elevationGainM, mountainRange, highlights } = req.body;
      if (!rawNotes || !rawNotes.trim()) {
        return res.status(400).json({ success: false, error: 'Chybí poznámky k přeformulování' });
      }

      const ai = getGeminiClient();
      const prompt = `Jsi spisovatel a vášnivý horský turista. Tvým úkolem je vzít stručné poznámky a hesla od uživatele z jeho túry a přetvořit je do čtivého, kultivovaného a autentického zápisu do turistického deníku.
Parametry trasy:
- Název trasy: ${title || 'Horská túra'}
- Pohoří/Lokalita: ${mountainRange || 'Hory'}
- Vzdálenost: ${distanceKm || '?'} km
- Nastoupáno: ${elevationGainM || '?'} m
- Hlavní body / co se líbilo: ${Array.isArray(highlights) ? highlights.join(', ') : highlights || ''}

Surové poznámky a myšlenky od uživatele:
"${rawNotes}"

Pokyny:
1. Napiš text v první osobě jednotného nebo množného čísla (podle kontextu poznámek), v přirozené, živé a kultivované češtině.
2. Zachovej všechny autentické myšlenky a fakta uživatele, ale dej jim hezký příběhový spád a atmosféru.
3. Vyhni se přehnanému patosu, klišé nebo umělým frázím typu "příroda nám ukázala svou sílu". Piš jako opravdový turista, který si užil den na horách.
4. Délka: přiměřená (cca 2 až 4 hezké odstavce).
5. Vrať JSON ve formátu:
{
  "polishedStory": "výsledný čtivý text zápisu",
  "suggestedTitle": "případný výstižný název trasy, pokud je původní jen obecný",
  "suggestedHighlights": ["bod 1", "bod 2", "bod 3"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({
        success: true,
        polishedStory: parsed.polishedStory || rawNotes,
        suggestedTitle: parsed.suggestedTitle,
        suggestedHighlights: parsed.suggestedHighlights || [],
      });
    } catch (err: any) {
      console.error('Polish story failed:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Nepodařilo se vygenerovat zápis pomocí AI',
      });
    }
  });

  // Export full backup for GitHub / JSON
  app.get('/api/backup/export', (req, res) => {
    const routes = getStoredRoutes();
    const config = getAppConfig();
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      routesCount: routes.length,
      routes,
      meta: {
        appName: 'Horský Deník',
      },
    };
    res.setHeader('Content-Disposition', 'attachment; filename="horsky-denik-zaloha.json"');
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(backup, null, 2));
  });

  // Import backup
  app.post('/api/backup/import', (req, res) => {
    try {
      const { routes, replaceAll = false } = req.body;
      if (!Array.isArray(routes)) {
        return res.status(400).json({ success: false, error: 'Neplatný formát zálohy: routes musí být pole tras.' });
      }

      let currentRoutes = getStoredRoutes();
      if (replaceAll) {
        currentRoutes = routes;
      } else {
        // Merge without duplicates by ID
        const existingIds = new Set(currentRoutes.map((r) => r.id));
        for (const r of routes) {
          if (!existingIds.has(r.id)) {
            currentRoutes.push(r);
            existingIds.add(r.id);
          }
        }
      }

      saveStoredRoutes(currentRoutes);
      res.json({ success: true, count: currentRoutes.length, message: `Úspěšně naimportováno. Celkem ${currentRoutes.length} tras.` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Chyba při importu zálohy' });
    }
  });

  // Reset to sample data
  app.post('/api/routes/reset-sample', (req, res) => {
    saveStoredRoutes(INITIAL_ROUTES);
    res.json({ success: true, routes: INITIAL_ROUTES, count: INITIAL_ROUTES.length });
  });

  // --- Vite Dev Middleware or Production Static Handling ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Horský Deník server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
