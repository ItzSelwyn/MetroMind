from fastapi import APIRouter
from app.services.traffic_service import start_simulation, get_simulation_state

router = APIRouter()

@router.post("/simulation/start")
def start(data: dict):

    start_lat = data.get("start_lat")
    start_lon = data.get("start_lon")
    end_lat = data.get("end_lat")
    end_lon = data.get("end_lon")

    return start_simulation(start_lat, start_lon, end_lat, end_lon)


@router.get("/simulation/tick")
def tick():
    return get_simulation_state()