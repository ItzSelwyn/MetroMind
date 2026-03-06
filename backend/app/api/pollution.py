from fastapi import APIRouter
from app.services.pollution_service import get_pollution_data

router = APIRouter()

@router.get("/pollution")
def pollution():
    return get_pollution_data()