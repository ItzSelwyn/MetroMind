from fastapi import FastAPI
from app.api import weather

app = FastAPI(title="MetroMind API")

app.include_router(weather.router)

@app.get("/")
def root():
    return {"message": "MetroMind backend running"}