import requests
import os
from dotenv import load_dotenv
from app.config.city_config import CITY_CONFIG

load_dotenv()

API_KEY = os.getenv("OPENWEATHER_API_KEY")

BASE_URL = "https://api.openweathermap.org/data/2.5/air_pollution"

LAT = CITY_CONFIG["coordinates"]["lat"]
LON = CITY_CONFIG["coordinates"]["lon"]

def get_aqi_label(aqi):
    levels = {
        1: "Good",
        2: "Fair",
        3: "Moderate",
        4: "Poor",
        5: "Very Poor"
    }
    return levels.get(aqi, "Unknown")

def get_pollution_data():
    params = {
        "lat": LAT,
        "lon": LON,
        "appid": API_KEY
    }

    response = requests.get(BASE_URL, params=params)
    data = response.json()

    pollution = data["list"][0]

    return {
    "city": "Coimbatore",
    "coordinates": {
        "lat": LAT,
        "lon": LON
    },
    "aqi": pollution["main"]["aqi"],
    "aqi_label": get_aqi_label(pollution["main"]["aqi"]),
    "components": {
        "co": pollution["components"]["co"],
        "no": pollution["components"]["no"],
        "no2": pollution["components"]["no2"],
        "o3": pollution["components"]["o3"],
        "so2": pollution["components"]["so2"],
        "pm2_5": pollution["components"]["pm2_5"],
        "pm10": pollution["components"]["pm10"],
        "nh3": pollution["components"]["nh3"]
    }
}