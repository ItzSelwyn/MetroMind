from fastapi import APIRouter
from app.services.weather_service import get_weather_data

router = APIRouter()

@router.get("/weather")
def weather():
    return get_weather_data()