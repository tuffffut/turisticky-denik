import { GpxData, Waypoint, ElevationPoint } from '../types';

export interface ParsedGpxResult {
  title?: string;
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  highestPointM: number;
  lowestPointM: number;
  durationMinutes: number;
  startLocation: { lat: number; lng: number; name?: string };
  endLocation: { lat: number; lng: number; name?: string };
  gpxData: GpxData;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function parseGpxString(gpxXml: string): ParsedGpxResult {
  let doc: Document | null = null;
  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    const parser = new DOMParser();
    doc = parser.parseFromString(gpxXml, 'application/xml');
  }

  const rawTrackPoints: Array<{ lat: number; lon: number; ele?: number; time?: Date }> = [];
  let trackTitle = '';

  if (doc) {
    const nameNode = doc.querySelector('metadata > name, trk > name, gpx > name');
    if (nameNode?.textContent) {
      trackTitle = nameNode.textContent.trim();
    }

    const trkpts = doc.querySelectorAll('trkpt, rtept');
    trkpts.forEach((pt) => {
      const lat = parseFloat(pt.getAttribute('lat') || '0');
      const lon = parseFloat(pt.getAttribute('lon') || '0');
      const eleNode = pt.querySelector('ele');
      const ele = eleNode && eleNode.textContent ? parseFloat(eleNode.textContent) : undefined;
      const timeNode = pt.querySelector('time');
      const time = timeNode && timeNode.textContent ? new Date(timeNode.textContent) : undefined;
      if (!isNaN(lat) && !isNaN(lon) && (lat !== 0 || lon !== 0)) {
        rawTrackPoints.push({ lat, lon, ele, time });
      }
    });
  } else {
    // Fallback Regex parser (works both in Node.js server and browser)
    const titleMatch = gpxXml.match(/<name>(.*?)<\/name>/i);
    if (titleMatch) trackTitle = titleMatch[1];

    const trkptRegex = /<(?:trkpt|rtept)[^>]*lat=["']([^"']+)["'][^>]*lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/(?:trkpt|rtept)>/gi;
    let match;
    while ((match = trkptRegex.exec(gpxXml)) !== null) {
      const lat = parseFloat(match[1]);
      const lon = parseFloat(match[2]);
      const inner = match[3];
      const eleMatch = inner.match(/<ele>([^<]+)<\/ele>/i);
      const ele = eleMatch ? parseFloat(eleMatch[1]) : undefined;
      const timeMatch = inner.match(/<time>([^<]+)<\/time>/i);
      const time = timeMatch ? new Date(timeMatch[1]) : undefined;
      if (!isNaN(lat) && !isNaN(lon)) {
        rawTrackPoints.push({ lat, lon, ele, time });
      }
    }
  }

  if (rawTrackPoints.length === 0) {
    throw new Error('V GPX souboru nebyly nalezeny žádné body trasy (trkpt/rtept).');
  }

  // 1. Check for pre-calculated metadata / extensions (Mapy.cz, Garmin, Strava, Suunto)
  let metadataGain: number | undefined;
  let metadataLoss: number | undefined;

  const gainMatch =
    gpxXml.match(/<(?:gpxtpx:|gpxx:)?(?:ele_gain|ascent|totalAscent)>([0-9.]+)/i) ||
    gpxXml.match(/(?:převýšení|nastoupáno|stoupání|ascent|elevation gain)[:\s]+([0-9.]+)\s*m?/i);
  if (gainMatch) {
    const val = parseFloat(gainMatch[1]);
    if (!isNaN(val) && val > 0) metadataGain = val;
  }

  const lossMatch =
    gpxXml.match(/<(?:gpxtpx:|gpxx:)?(?:ele_loss|descent|totalDescent)>([0-9.]+)/i) ||
    gpxXml.match(/(?:klesání|descent|elevation loss)[:\s]+([0-9.]+)\s*m?/i);
  if (lossMatch) {
    const val = parseFloat(lossMatch[1]);
    if (!isNaN(val) && val > 0) metadataLoss = val;
  }

  // 2. Cumulative distance calculation
  const distancesKm: number[] = [0];
  let totalDistanceKm = 0;
  for (let i = 1; i < rawTrackPoints.length; i++) {
    const prev = rawTrackPoints[i - 1];
    const curr = rawTrackPoints[i];
    const dist = haversineDistanceKm(prev.lat, prev.lon, curr.lat, curr.lon);
    totalDistanceKm += dist;
    distancesKm.push(totalDistanceKm);
  }

  // 3. Elevation analysis with noise reduction
  // Discard extreme spikes and apply moving weighted window
  const rawEles = rawTrackPoints.map((p) => p.ele);
  const validIndices: number[] = [];
  for (let i = 0; i < rawEles.length; i++) {
    const e = rawEles[i];
    if (typeof e === 'number' && !isNaN(e) && e > -450 && e < 9000) {
      validIndices.push(i);
    }
  }

  let elevationGainM = 0;
  let elevationLossM = 0;
  let highestPointM = 0;
  let lowestPointM = 0;
  const smoothedEles: Array<number | undefined> = new Array(rawTrackPoints.length);

  if (validIndices.length > 0) {
    // Window size adapted to point density: 5 to 13 points
    const windowPoints = Math.min(13, Math.max(5, Math.floor(validIndices.length / 50) | 1));
    const halfW = Math.floor(windowPoints / 2);

    const smoothedValues: number[] = [];
    for (let k = 0; k < validIndices.length; k++) {
      let weightSum = 0;
      let sum = 0;
      for (let w = -halfW; w <= halfW; w++) {
        const target = k + w;
        if (target >= 0 && target < validIndices.length) {
          const weight = halfW + 1 - Math.abs(w);
          sum += (rawEles[validIndices[target]] as number) * weight;
          weightSum += weight;
        }
      }
      smoothedValues.push(sum / weightSum);
    }

    for (let k = 0; k < validIndices.length; k++) {
      smoothedEles[validIndices[k]] = smoothedValues[k];
    }

    highestPointM = Math.max(...smoothedValues);
    lowestPointM = Math.min(...smoothedValues);

    // Hysteresis threshold filter (industry standard: 3.5m minimum significant climb)
    let lastEle = smoothedValues[0];
    const THRESHOLD = 3.5;

    for (let k = 1; k < smoothedValues.length; k++) {
      const currEle = smoothedValues[k];
      const diff = currEle - lastEle;
      if (diff >= THRESHOLD) {
        elevationGainM += diff;
        lastEle = currEle;
      } else if (diff <= -THRESHOLD) {
        elevationLossM += Math.abs(diff);
        lastEle = currEle;
      }
    }

    const finalDiff = smoothedValues[smoothedValues.length - 1] - lastEle;
    if (finalDiff > 1.0) elevationGainM += finalDiff;
    else if (finalDiff < -1.0) elevationLossM += Math.abs(finalDiff);
  }

  // Prioritize pre-calculated values from metadata if present
  if (metadataGain !== undefined) {
    elevationGainM = metadataGain;
  }
  if (metadataLoss !== undefined) {
    elevationLossM = metadataLoss;
  }

  // 4. Clean Elevation Profile
  const profileSteps: ElevationPoint[] = [];
  for (let i = 0; i < rawTrackPoints.length; i++) {
    const ele = smoothedEles[i] ?? rawTrackPoints[i].ele;
    if (ele !== undefined) {
      profileSteps.push({
        distKm: Math.round(distancesKm[i] * 100) / 100,
        eleM: Math.round(ele),
      });
    }
  }

  // Downsample profile to ~60 points for responsive charts
  let elevationProfile: ElevationPoint[] = [];
  if (profileSteps.length > 60) {
    const step = Math.floor(profileSteps.length / 60);
    elevationProfile = profileSteps.filter((_, idx) => idx % step === 0 || idx === profileSteps.length - 1);
  } else {
    elevationProfile = profileSteps;
  }

  // Duration
  let durationMinutes = 0;
  const firstTime = rawTrackPoints[0]?.time;
  const lastTime = rawTrackPoints[rawTrackPoints.length - 1]?.time;
  if (firstTime && lastTime && !isNaN(firstTime.getTime()) && !isNaN(lastTime.getTime())) {
    const diffMs = Math.abs(lastTime.getTime() - firstTime.getTime());
    durationMinutes = Math.round(diffMs / (1000 * 60));
  } else {
    // Estimator: 4 km/h base + 1h per 400m ascent
    durationMinutes = Math.round((totalDistanceKm / 4.2 + elevationGainM / 400) * 60);
  }

  // Downsample coordinates for Leaflet polyline if large
  const coordinates: Array<[number, number, number?]> = [];
  const sampleRate = rawTrackPoints.length > 2000 ? Math.ceil(rawTrackPoints.length / 1500) : 1;
  for (let i = 0; i < rawTrackPoints.length; i += sampleRate) {
    const p = rawTrackPoints[i];
    coordinates.push([p.lat, p.lon, p.ele]);
  }
  // Make sure last point is included
  const lastP = rawTrackPoints[rawTrackPoints.length - 1];
  if (coordinates[coordinates.length - 1][0] !== lastP.lat || coordinates[coordinates.length - 1][1] !== lastP.lon) {
    coordinates.push([lastP.lat, lastP.lon, lastP.ele]);
  }

  // Parse waypoints
  const waypoints: Waypoint[] = [];
  if (doc) {
    const wpts = doc.querySelectorAll('wpt');
    wpts.forEach((w) => {
      const lat = parseFloat(w.getAttribute('lat') || '0');
      const lng = parseFloat(w.getAttribute('lon') || '0');
      const name = w.querySelector('name')?.textContent?.trim() || 'Bod zájmu';
      const desc = w.querySelector('desc')?.textContent?.trim() || undefined;
      const ele = w.querySelector('ele')?.textContent ? parseFloat(w.querySelector('ele')!.textContent!) : undefined;
      if (!isNaN(lat) && !isNaN(lng)) {
        waypoints.push({ lat, lng, name, desc, ele });
      }
    });
  }

  const startP = rawTrackPoints[0];
  const endP = rawTrackPoints[rawTrackPoints.length - 1];

  return {
    title: trackTitle || undefined,
    distanceKm: Math.round(totalDistanceKm * 10) / 10,
    elevationGainM: Math.round(elevationGainM),
    elevationLossM: Math.round(elevationLossM),
    highestPointM: Math.round(highestPointM),
    lowestPointM: Math.round(lowestPointM),
    durationMinutes: Math.max(15, durationMinutes),
    startLocation: {
      lat: startP.lat,
      lng: startP.lon,
      name: 'Začátek trasy',
    },
    endLocation: {
      lat: endP.lat,
      lng: endP.lon,
      name: 'Konec trasy',
    },
    gpxData: {
      coordinates,
      waypoints,
      elevationProfile,
      gpxXml: gpxXml.length < 500000 ? gpxXml : undefined,
    },
  };
}
