import requests
import os
from dotenv import load_dotenv
from app.config.city_config import CITY_CONFIG

load_dotenv()

API_KEY = os.getenv("OPENWEATHER_API_KEY")

BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

LAT = CITY_CONFIG["coordinates"]["lat"]
LON = CITY_CONFIG["coordinates"]["lon"]


def get_weather_data():
    params = {
        "lat": LAT,
        "lon": LON,
        "appid": API_KEY,
        "units": "metric"
    }

    response = requests.get(BASE_URL, params=params)

    data = response.json()

    return {
    "city": "Coimbatore",
    "coordinates": {
        "lat": LAT,
        "lon": LON
    },
    "weather": {
        "temperature": data["main"]["temp"],
        "humidity": data["main"]["humidity"],
        "condition": data["weather"][0]["main"]
    },
    "wind": {
        "speed": data["wind"]["speed"],
        "direction": data["wind"]["deg"]
    }
}