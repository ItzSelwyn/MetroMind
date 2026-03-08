import type { Feature, LineString } from "geojson";

const API_BASE = "http://127.0.0.1:8000";

export type BlockedRoadFeature = Feature<LineString>;

export interface SimulationStartResponse {
  started: boolean;
  blocked_road: BlockedRoadFeature | null;
}

export interface SimulationTickResponse {
  vehicle_count?: number;
  vehicles: Array<{
    id: number;
    lat: number;
    lon: number;
  }>;
  blocked_road?: BlockedRoadFeature | null;
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
export async function startSimulation(lat: number, lon: number) {
  const res = await fetch(`${API_BASE}/simulation/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      lat,
      lon
    })
  });

  return res.json() as Promise<SimulationStartResponse>;
}

// SIMULATION TICK
export async function getSimulationTick() {
  const res = await fetch(`${API_BASE}/simulation/tick`);
  return res.json() as Promise<SimulationTickResponse>;
}