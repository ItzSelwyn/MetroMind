from fastapi import APIRouter

router = APIRouter()

@router.get("/weather")
def get_weather():
    return {"temp": 30, "wind": "NE"}