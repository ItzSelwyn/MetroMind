import sys
import os

# Add backend directory to Python path
sys.path.append(os.path.abspath("backend"))

import osmnx as ox
from pathlib import Path

from app.config.city_config import CITY_CONFIG

city_name = CITY_CONFIG["name"]

print(f"Downloading road network for {city_name}...")

# Download road network
G = ox.graph_from_place(f"{city_name}, India", network_type="drive")

print("Download complete!")
    
# Ensure data folder exists
Path("data").mkdir(exist_ok=True)

file_path = f"data/{city_name.lower()}_roads.graphml"

ox.save_graphml(G, file_path)

print(f"Road network saved to {file_path}")