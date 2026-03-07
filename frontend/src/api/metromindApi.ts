const API_BASE = "http://127.0.0.1:8000";

export async function getCityInfo() {
  const res = await fetch(`${API_BASE}/city-info`);
  return res.json();
}

export async function getPollution() {
  const res = await fetch(`${API_BASE}/pollution`);
  return res.json();
}

export async function getWeather() {
  const res = await fetch(`${API_BASE}/weather`);
  return res.json();
}

export async function startSimulation(block_u?: number, block_v?: number) {
  const res = await fetch(`${API_BASE}/simulation/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      block_u,
      block_v
    })
  });

  return res.json();
}

export async function getSimulationTick() {
  const res = await fetch(`${API_BASE}/simulation/tick`);
  return res.json();
}