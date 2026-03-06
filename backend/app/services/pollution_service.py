import requests
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENWEATHER_API_KEY")

BASE_URL = "https://api.openweathermap.org/data/2.5/air_pollution"

COIMBATORE_LAT = 11.0168
COIMBATORE_LON = 76.9558


def get_pollution_data():
    params = {
        "lat": COIMBATORE_LAT,
        "lon": COIMBATORE_LON,
        "appid": API_KEY
    }

    response = requests.get(BASE_URL, params=params)
    data = response.json()

    pollution = data["list"][0]

    return {
        "city": "Coimbatore",
        "coordinates": {
            "lat": COIMBATORE_LAT,
            "lon": COIMBATORE_LON
        },
        "aqi": pollution["main"]["aqi"],
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