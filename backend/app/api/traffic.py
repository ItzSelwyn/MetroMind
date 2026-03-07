from fastapi import APIRouter
from app.services.traffic_service import start_simulation, get_simulation_state

router = APIRouter()


@router.post("/simulation/start")
def start(data: dict):

    start_simulation(
        data.get("block_u"),
        data.get("block_v")
    )

    return {"status": "simulation started"}


@router.get("/simulation/tick")
def tick():

    return get_simulation_state()