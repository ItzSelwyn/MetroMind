import os
import random
import osmnx as ox
import networkx as nx
from collections import defaultdict
from math import sqrt

# ---------------------------------------------------
# Load Road Network
# ---------------------------------------------------

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
GRAPH_PATH = os.path.join(BASE_DIR, "data", "coimbatore_roads.graphml")

print("Loading road network...")
G = ox.load_graphml(GRAPH_PATH)
print("Road network loaded")

nodes = list(G.nodes)

# ---------------------------------------------------
# Road Capacity Model
# ---------------------------------------------------

ROAD_CAPACITY = {
    "motorway": 80,
    "trunk": 70,
    "primary": 60,
    "secondary": 40,
    "tertiary": 30,
    "residential": 20,
    "service": 10
}

BASE_SPEED = {
    "motorway": 90,
    "trunk": 80,
    "primary": 70,
    "secondary": 50,
    "tertiary": 40,
    "residential": 30,
    "service": 20
}

# ---------------------------------------------------
# Vehicle Class
# ---------------------------------------------------

class Vehicle:

    def __init__(self, vid, route):
        self.id = vid
        self.route = route
        self.edge_index = 0
        self.progress = 0
        self.speed = 10


# ---------------------------------------------------
# Simulation State
# ---------------------------------------------------

vehicles = []
edge_vehicle_count = defaultdict(int)

blocked_edges = set()

SIMULATION_RUNNING = False

# ---------------------------------------------------
# Helper Functions
# ---------------------------------------------------

def get_edge_type(u, v):

    data = G.get_edge_data(u, v)

    if not data:
        return "residential"

    highway = data[0].get("highway", "residential")

    if isinstance(highway, list):
        highway = highway[0]

    return highway


def get_edge_length(u, v):

    data = G.get_edge_data(u, v)

    if not data:
        return 50

    return data[0].get("length", 50)


def get_capacity(highway):

    return ROAD_CAPACITY.get(highway, 20)


def get_base_speed(highway):

    return BASE_SPEED.get(highway, 30)


# ---------------------------------------------------
# Congestion Model
# ---------------------------------------------------

def get_density(u, v):

    highway = get_edge_type(u, v)
    capacity = get_capacity(highway)

    vehicles_on_edge = edge_vehicle_count[(u, v)]

    return vehicles_on_edge / capacity


def compute_speed(u, v):

    highway = get_edge_type(u, v)

    base_speed = get_base_speed(highway)

    density = get_density(u, v)

    speed = base_speed * (1 - density)

    return max(speed, 5)


# ---------------------------------------------------
# Travel Time Weight
# ---------------------------------------------------

def travel_time(u, v, data):

    highway = data.get("highway", "residential")

    if isinstance(highway, list):
        highway = highway[0]

    base_speed = BASE_SPEED.get(highway, 30)

    length = data.get("length", 50)

    return length / base_speed


# ---------------------------------------------------
# Route Finder
# ---------------------------------------------------

def compute_route(start, end):

    try:
        return nx.shortest_path(
            G,
            start,
            end,
            weight=travel_time
        )
    except:
        return None


# ---------------------------------------------------
# Spawn Vehicles
# ---------------------------------------------------

def spawn_vehicles(count=100, near_nodes=None):

    global vehicles

    vehicles = []

    for i in range(count):

        if near_nodes:
            start = random.choice(near_nodes)
        else:
            start = random.choice(nodes)

        end = random.choice(nodes)

        route = compute_route(start, end)

        if route:

            v = Vehicle(i, route)
            vehicles.append(v)

    print("Spawned vehicles:", len(vehicles))


# ---------------------------------------------------
# Block Road
# ---------------------------------------------------

def block_road(u, v):

    if G.has_edge(u, v):

        G.remove_edge(u, v)
        blocked_edges.add((u, v))

        print("Blocked road:", u, v)


# ---------------------------------------------------
# Vehicle Movement
# ---------------------------------------------------

def move_vehicle(vehicle):

    if vehicle.edge_index >= len(vehicle.route) - 1:
        return

    u = vehicle.route[vehicle.edge_index]
    v = vehicle.route[vehicle.edge_index + 1]

    speed = compute_speed(u, v)

    vehicle.progress += speed * 0.00005

    if vehicle.progress >= 1:

        edge_vehicle_count[(u, v)] -= 1

        vehicle.progress = 0
        vehicle.edge_index += 1

        if vehicle.edge_index >= len(vehicle.route) - 1:

            start = vehicle.route[-1]
            end = random.choice(nodes)

            new_route = compute_route(start, end)

            if new_route:
                vehicle.route = new_route
                vehicle.edge_index = 0

        else:

            next_u = vehicle.route[vehicle.edge_index]
            next_v = vehicle.route[vehicle.edge_index + 1]

            edge_vehicle_count[(next_u, next_v)] += 1


# ---------------------------------------------------
# Vehicle Position Interpolation
# ---------------------------------------------------

def interpolate_position(u, v, progress):

    lat1 = G.nodes[u]["y"]
    lon1 = G.nodes[u]["x"]

    lat2 = G.nodes[v]["y"]
    lon2 = G.nodes[v]["x"]

    lat = lat1 + (lat2 - lat1) * progress
    lon = lon1 + (lon2 - lon1) * progress

    return lat, lon


# ---------------------------------------------------
# Simulation Tick
# ---------------------------------------------------

def simulation_step():

    for v in vehicles:
        move_vehicle(v)


# ---------------------------------------------------
# Vehicle Positions Output
# ---------------------------------------------------

def get_vehicle_positions():

    positions = []

    for v in vehicles:

        if v.edge_index >= len(v.route) - 1:
            continue

        u = v.route[v.edge_index]
        v2 = v.route[v.edge_index + 1]

        lat, lon = interpolate_position(u, v2, v.progress)

        positions.append({
            "id": v.id,
            "lat": lat,
            "lon": lon
        })

    return positions


# ---------------------------------------------------
# Start Simulation
# ---------------------------------------------------

def start_simulation(lat=None, lon=None):

    global SIMULATION_RUNNING

    if lat is not None and lon is not None:

        # Find nearest road edge
        u, v, key = ox.distance.nearest_edges(G, lon, lat)

        print("Blocking edge:", u, v)

        block_road(u, v)

        near_nodes = list(G.neighbors(u))

    else:
        near_nodes = None

    if not SIMULATION_RUNNING:
        spawn_vehicles(100)
        SIMULATION_RUNNING = True


# ---------------------------------------------------
# Get Simulation State
# ---------------------------------------------------

def get_simulation_state():

    if not SIMULATION_RUNNING:
        return {"vehicles": []}

    simulation_step()

    vehicles_data = get_vehicle_positions()

    return {
        "vehicle_count": len(vehicles_data),
        "vehicles": vehicles_data
    }