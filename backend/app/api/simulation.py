from fastapi import APIRouter
from app.services.traffic_service import start_simulation, get_simulation_state

router = APIRouter()

@router.post("/simulation/start")
def start(data: dict):

    lat = data.get("lat")
    lon = data.get("lon")

    start_simulation(lat, lon)

    return {"status": "simulation started"}


@router.get("/simulation/tick")
def tick():
    return get_simulation_state()