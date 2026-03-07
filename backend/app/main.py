from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import weather, pollution, city, traffic

app = FastAPI()

# Allow frontend to access backend
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(weather.router)
app.include_router(pollution.router)
app.include_router(city.router)
app.include_router(traffic.router)

@app.get("/")
def root():
    return {"message": "MetroMind API running"}