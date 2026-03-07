from fastapi import APIRouter
from app.services.city_service import get_city_info

router = APIRouter()

@router.get("/city-info")
def city_info():
    return get_city_info()