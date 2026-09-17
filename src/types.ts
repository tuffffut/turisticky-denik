export type Difficulty = 'easy' | 'moderate' | 'hard' | 'extreme';
export type RouteType = 'hiking' | 'trail_run' | 'scramble_ferrata' | 'bike' | 'winter';
export type VisitAgainStatus = 'yes' | 'maybe' | 'no';
export type WeatherCondition = 'sunny' | 'partly_cloudy' | 'cloudy' | 'rain' | 'fog' | 'snow' | 'storm';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface RoutePhoto {
  id: string;
  url: string;
  caption?: string;
  takenAt?: string;
  isCover?: boolean;
  location?: [number, number];
}

export interface RouteVideo {
  id: string;
  url: string;
  title?: string;
  platform?: 'youtube' | 'vimeo' | 'direct';
}

export interface ElevationPoint {
  distKm: number;
  eleM: number;
}

export interface Waypoint {
  lat: number;
  lng: number;
  name: string;
  desc?: string;
  ele?: number;
}

export interface GpxData {
  coordinates: Array<[number, number, number?]>; // [lat, lng, elevation]
  waypoints?: Waypoint[];
  elevationProfile?: ElevationPoint[];
  gpxXml?: string;
}

export interface LocationPoint {
  lat: number;
  lng: number;
  name?: string;
}

export interface HikingRoute {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  visitedYear: number;
  region: string;
  country: string;
  mountainRange?: string;
  distanceKm: number;
  elevationGainM: number;
  elevationLossM: number;
  highestPointM: number;
  lowestPointM: number;
  durationMinutes: number;
  rating: number; // 1-5
  difficulty: Difficulty;
  routeType: RouteType;
  wantToVisitAgain: VisitAgainStatus;
  highlights: string[];
  companions: string[];
  weather: {
    condition: WeatherCondition;
    tempC?: number;
    note?: string;
  };
  season: Season;
  photos: RoutePhoto[];
  videos: RouteVideo[];
  gpxData?: GpxData;
  startLocation: LocationPoint;
  endLocation: LocationPoint;
  tags: string[];
  notesPrivate?: string;
  gpxFileName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RouteFilterState {
  searchQuery: string;
  region: string;
  country: string;
  year: string;
  minRating: number;
  wantToVisitAgain: string;
  difficulty: string;
  routeType: string;
  sortBy: 'date_desc' | 'date_asc' | 'rating_desc' | 'distance_desc' | 'elevation_desc';
}

export const initialFilterState: RouteFilterState = {
  searchQuery: '',
  region: 'all',
  country: 'all',
  year: 'all',
  minRating: 0,
  wantToVisitAgain: 'all',
  difficulty: 'all',
  routeType: 'all',
  sortBy: 'date_desc',
};

export interface VisualSearchAnalysis {
  analyzed: boolean;
  detectedLandmarks: string[];
  detectedTerrain: string[];
  detectedSeason?: string;
  description: string;
  matchedRouteIds: string[];
  matchExplanations: Array<{
    routeId: string;
    similarityScore: number;
    reason: string;
  }>;
}
