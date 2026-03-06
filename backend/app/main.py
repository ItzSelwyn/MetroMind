from fastapi import FastAPI

app = FastAPI(title="MetroMind API")

@app.get("/")
def root():
    return {"message": "MetroMind backend running"}