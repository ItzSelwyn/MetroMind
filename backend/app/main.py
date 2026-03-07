from fastapi import FastAPI
from app.api import weather, pollution, city, traffic

app = FastAPI(title="MetroMind API")

app.include_router(weather.router)
app.include_router(pollution.router)
app.include_router(city.router)
app.include_router(traffic.router)

@app.get("/")
def root():
    return {"message": "MetroMind backend running"}