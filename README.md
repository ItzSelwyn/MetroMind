# MetroMind

MetroMind is a full-stack smart-city traffic simulation dashboard for Coimbatore.

It combines:
- A React + Mapbox frontend for interactive road selection and visualization
- A FastAPI backend for weather, pollution, traffic simulation, and closure impact analysis
- A local road graph dataset (`coimbatore_roads.graphml`) for route computation

## What It Does

- Renders a live city map with vehicle simulation points
- Lets users choose **Start** and **End** points of a road corridor to block
- Simulates vehicle movement under the new network constraints
- Generates closure impact analysis:
	- Primary reroute path
	- Most reused roads
	- Pressure hotspots

## Tech Stack

- Frontend: React 19, TypeScript, Vite, Mapbox GL
- Backend: FastAPI, NetworkX, OSMnx, GeoPandas, NumPy, Pandas
- External APIs: OpenWeather (weather + air pollution)

## Project Structure

```text
MetroMind/
	backend/
		app/
			api/
			services/
			models/
			config/
			main.py
		requirements.txt
	frontend/
		src/
			components/
			pages/
			api/
		package.json
	data/
		coimbatore_roads.graphml
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

## Missing Files You Must Create

The repo depends on environment files that are not committed.

### 1) Backend env file

Create: `backend/.env`

```env
OPENWEATHER_API_KEY=your_openweather_api_key
```

### 2) Frontend env file

Create: `frontend/.env`

```env
VITE_MAPBOX_TOKEN=your_mapbox_access_token
```

### 3) Required dataset file

Must exist:

`data/coimbatore_roads.graphml`

If this file is missing, traffic simulation and route blocking will fail.

## Installation

### Backend setup

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend setup

```powershell
cd frontend
npm install
```

## Run the Project

Use two terminals.

### Terminal 1: Backend

```powershell
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

Backend default URL: `http://127.0.0.1:8000`

### Terminal 2: Frontend

```powershell
cd frontend
npm run dev
```

Frontend default URL: `http://localhost:5173`

## API Endpoints

- `GET /` - health message
- `GET /city-info` - city config (name, coordinates, zoom, bounds)
- `GET /weather` - weather data from OpenWeather
- `GET /pollution` - air pollution data from OpenWeather
- `POST /simulation/start` - starts simulation after corridor selection
	- body:
		- `start_lat`
		- `start_lon`
		- `end_lat`
		- `end_lon`
- `GET /simulation/tick` - returns current vehicles + analysis

## Current UX Flow

1. Click `Start` in Simulation Control, then click map to set start point
2. Click `End`, then click map to set end point
3. Click `Submit` to block the selected corridor and start simulation
4. Open analysis popup to inspect reroutes and hotspots
5. Click analysis items to highlight roads/routes on the map

## Troubleshooting

### Frontend does not load map

- Ensure `frontend/.env` has valid `VITE_MAPBOX_TOKEN`
- Restart `npm run dev` after editing `.env`

### Weather/Pollution requests fail

- Ensure `backend/.env` has valid `OPENWEATHER_API_KEY`
- Restart backend after editing `.env`

### Simulation fails or empty routes

- Check `data/coimbatore_roads.graphml` exists
- Confirm backend starts without import/data errors

### CORS issues

Backend currently allows:
- `http://localhost:5173`
- `http://127.0.0.1:5173`

If your frontend runs on another origin, update CORS in `backend/app/main.py`.

## Notes

- This project currently targets Coimbatore via `backend/app/config/city_config.py`.
- Analysis quality depends on the road graph quality and selected corridor.