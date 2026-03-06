from fastapi import FastAPI
from app.api import weather
from app.api import pollution

app = FastAPI(title="MetroMind API")

app.include_router(weather.router)
app.include_router(pollution.router)

@app.get("/")
def root():
    return {"message": "MetroMind backend running"}