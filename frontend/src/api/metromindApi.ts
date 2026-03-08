import type { Feature, LineString, MultiLineString } from "geojson";

const API_BASE = "http://127.0.0.1:8000";

export type BlockedRoadFeature = Feature<LineString | MultiLineString>;

export interface RerouteSummary {
  road_labels: string[];
  distance_km: number;
  travel_minutes: number;
}

export interface ImpactRoadStat {
  road: string;
  road_type: string;
  length_km: number;
  capacity: number;
  map_feature?: BlockedRoadFeature;
}

export interface HotspotRoadStat extends ImpactRoadStat {
  estimated_pressure: number;
  estimated_travel_minutes: number;
}

export interface PrimaryReroute {
  before: RerouteSummary;
  after: RerouteSummary;
  extra_distance_km: number;
  extra_travel_minutes: number;
  reroute_path: BlockedRoadFeature;
}

export interface BlockImpactAnalysis {
  blocked_road: ImpactRoadStat;
  affected_trip_count: number;
  primary_reroute: PrimaryReroute | null;
  top_reused_roads: Array<ImpactRoadStat & { reuse_count: number }>;
  traffic_hotspots: HotspotRoadStat[];
}

export interface SimulationStartResponse {
  started: boolean;
  blocked_road: BlockedRoadFeature | null;
  analysis: BlockImpactAnalysis | null;
}

export interface MapSelectionPoint {
  lat: number;
  lon: number;
}

export interface SimulationTickResponse {
  vehicle_count?: number;
  vehicles: Array<{
    id: number;
    lat: number;
    lon: number;
  }>;
  blocked_road?: BlockedRoadFeature | null;
  analysis?: BlockImpactAnalysis | null;
}

// CITY INFO
export async function getCityInfo() {
  const res = await fetch(`${API_BASE}/city-info`);
  return res.json();
}

// WEATHER
export async function getWeather() {
  const res = await fetch(`${API_BASE}/weather`);
  return res.json();
}

// POLLUTION
export async function getPollution() {
  const res = await fetch(`${API_BASE}/pollution`);
  return res.json();
}

// START SIMULATION
export async function startSimulation(startPoint: MapSelectionPoint, endPoint: MapSelectionPoint) {
  const res = await fetch(`${API_BASE}/simulation/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      start_lat: startPoint.lat,
      start_lon: startPoint.lon,
      end_lat: endPoint.lat,
      end_lon: endPoint.lon
    })
  });

  return res.json() as Promise<SimulationStartResponse>;
}

// SIMULATION TICK
export async function getSimulationTick() {
  const res = await fetch(`${API_BASE}/simulation/tick`);
  return res.json() as Promise<SimulationTickResponse>;
}