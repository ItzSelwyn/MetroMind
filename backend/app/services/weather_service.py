import requests
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENWEATHER_API_KEY")

BASE_URL = "https://api.openweathermap.org/data/2.5/weather"

COIMBATORE_LAT = 11.0168
COIMBATORE_LON = 76.9558


def get_weather_data():
    params = {
        "lat": COIMBATORE_LAT,
        "lon": COIMBATORE_LON,
        "appid": API_KEY,
        "units": "metric"
    }

    response = requests.get(BASE_URL, params=params)

    data = response.json()

    return {
    "city": "Coimbatore",
    "coordinates": {
        "lat": COIMBATORE_LAT,
        "lon": COIMBATORE_LON
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