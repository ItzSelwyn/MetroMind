import os
import random
import osmnx as ox
import networkx as nx
from collections import defaultdict
from math import sqrt
from shapely.geometry import LineString, Point
from shapely.ops import substring

# ---------------------------------------------------
# Load Road Network
# ---------------------------------------------------

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
GRAPH_PATH = os.path.join(BASE_DIR, "data", "coimbatore_roads.graphml")

print("Loading road network...")
BASE_GRAPH = ox.load_graphml(GRAPH_PATH)
G = BASE_GRAPH.copy()
print("Road network loaded")

nodes = list(G.nodes)
selected_block_route = None

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
blocked_road_feature = None
blocked_road_analysis = None

SIMULATION_RUNNING = False

# ---------------------------------------------------
# Helper Functions
# ---------------------------------------------------

def get_edge_type(u, v):

    return get_edge_type_from_graph(G, u, v)


def get_first_edge_data(graph, u, v):

    data = graph.get_edge_data(u, v)

    if not data:
        return None

    return next(iter(data.values()))


def get_edge_type_from_graph(graph, u, v):

    data = get_first_edge_data(graph, u, v)

    if not data:
        return "residential"

    highway = data.get("highway", "residential")

    if isinstance(highway, list):
        highway = highway[0]

    return highway


def get_edge_length(u, v):

    return get_edge_length_from_graph(G, u, v)


def get_edge_length_from_graph(graph, u, v):

    data = get_first_edge_data(graph, u, v)

    if not data:
        return 50

    return data.get("length", 50)


def get_edge_name_from_graph(graph, u, v):

    data = get_first_edge_data(graph, u, v)

    if not data:
        return None

    name = data.get("name")

    if isinstance(name, list):
        name = name[0]

    return name


def get_edge_label_from_graph(graph, u, v):

    name = get_edge_name_from_graph(graph, u, v)

    if name:
        return str(name)

    highway = get_edge_type_from_graph(graph, u, v).replace("_", " ")

    return f"{highway.title()} road"


def get_edge_capacity_from_graph(graph, u, v):

    return get_capacity(get_edge_type_from_graph(graph, u, v))


def get_edge_travel_minutes_from_graph(graph, u, v):

    length_m = get_edge_length_from_graph(graph, u, v)
    base_speed_kmh = get_base_speed(get_edge_type_from_graph(graph, u, v))

    if base_speed_kmh <= 0:
        return 0.0

    return ((length_m / 1000) / base_speed_kmh) * 60


def get_edge_coordinates(u, v):

    return get_edge_coordinates_from_graph(G, u, v)


def get_edge_coordinates_from_graph(graph, u, v):

    data = get_first_edge_data(graph, u, v)

    if data:
        geometry = data.get("geometry")

        if geometry is not None:
            return [[lon, lat] for lon, lat in geometry.coords]

    start_node = graph.nodes[u]
    end_node = graph.nodes[v]

    return [
        [start_node["x"], start_node["y"]],
        [end_node["x"], end_node["y"]]
    ]


def get_edge_geometry_from_graph(graph, u, v):

    data = get_first_edge_data(graph, u, v)

    if data:
        geometry = data.get("geometry")

        if geometry is not None:
            return geometry

    start_node = graph.nodes[u]
    end_node = graph.nodes[v]

    return LineString([
        (start_node["x"], start_node["y"]),
        (end_node["x"], end_node["y"])
    ])


def euclidean_distance(lat1, lon1, lat2, lon2):

    return sqrt((lon2 - lon1) ** 2 + (lat2 - lat1) ** 2)


def node_distance_to_point(graph, node, lat, lon):

    node_data = graph.nodes[node]

    return euclidean_distance(lat, lon, node_data["y"], node_data["x"])


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


def edge_pairs(route):

    return list(zip(route, route[1:]))


def route_contains_any_blocked_edge(route, blocked_edge_set):

    return any((u, v) in blocked_edge_set for u, v in edge_pairs(route))


def compute_route_on_graph(graph, start, end):

    try:
        return nx.shortest_path(
            graph,
            start,
            end,
            weight=travel_time
        )
    except:
        return None


def get_nearby_nodes(graph, seed_nodes, steps=2):

    visited = set(seed_nodes)
    frontier = set(seed_nodes)

    for _ in range(steps):
        next_frontier = set()

        for node in frontier:
            if graph.has_node(node):
                next_frontier.update(graph.successors(node))
                next_frontier.update(graph.predecessors(node))

        next_frontier -= visited
        visited.update(next_frontier)
        frontier = next_frontier

        if not frontier:
            break

    return list(visited)


def summarize_route(graph, route):

    labels = []
    total_length_m = 0
    total_minutes = 0

    for u, v in edge_pairs(route):
        total_length_m += get_edge_length_from_graph(graph, u, v)
        total_minutes += get_edge_travel_minutes_from_graph(graph, u, v)

        label = get_edge_label_from_graph(graph, u, v)

        if label not in labels:
            labels.append(label)

    return {
        "road_labels": labels[:4],
        "distance_km": round(total_length_m / 1000, 2),
        "travel_minutes": round(total_minutes, 1)
    }


def geometry_to_coordinates(geometry):

    if geometry.geom_type == "Point":
        return [[geometry.x, geometry.y]]

    return [[lon, lat] for lon, lat in geometry.coords]


def append_coordinate_sequence(target_coordinates, segment_coordinates):

    if not segment_coordinates:
        return

    if not target_coordinates:
        target_coordinates.extend(segment_coordinates)
        return

    if target_coordinates[-1] == segment_coordinates[0]:
        target_coordinates.extend(segment_coordinates[1:])
        return

    target_coordinates.extend(segment_coordinates)


def build_route_feature(graph, route, status="reroute", prefix_coordinates=None, suffix_coordinates=None):

    coordinates = []

    if prefix_coordinates:
        append_coordinate_sequence(coordinates, prefix_coordinates)

    for index, (u, v) in enumerate(edge_pairs(route)):
        edge_coordinates = get_edge_coordinates_from_graph(graph, u, v)

        if index > 0 and not coordinates:
            edge_coordinates = edge_coordinates[1:]

        append_coordinate_sequence(coordinates, edge_coordinates)

    if suffix_coordinates:
        append_coordinate_sequence(coordinates, suffix_coordinates)

    return {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": coordinates
        },
        "properties": {
            "status": status
        }
    }


def build_edge_feature_from_graph(graph, u, v, status):

    return {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": get_edge_coordinates_from_graph(graph, u, v)
        },
        "properties": {
            "u": u,
            "v": v,
            "status": status,
            "road": get_edge_label_from_graph(graph, u, v),
            "road_type": get_edge_type_from_graph(graph, u, v)
        }
    }


def build_group_feature_from_graph(graph, edges, status, road, road_type):

    unique_edges = list(dict.fromkeys(edges))

    if len(unique_edges) == 1:
        u, v = unique_edges[0]
        feature = build_edge_feature_from_graph(graph, u, v, status)
        feature["properties"]["road"] = road
        feature["properties"]["road_type"] = road_type
        return feature

    coordinates = [get_edge_coordinates_from_graph(graph, u, v) for u, v in unique_edges]

    return {
        "type": "Feature",
        "geometry": {
            "type": "MultiLineString",
            "coordinates": coordinates
        },
        "properties": {
            "status": status,
            "road": road,
            "road_type": road_type
        }
    }


def summarize_blocked_corridor(blocked_edges_list):

    unique_labels = []
    total_length_m = 0
    representative_capacity = 0

    for u, v in blocked_edges_list:
        total_length_m += get_edge_length_from_graph(BASE_GRAPH, u, v)
        representative_capacity = max(
            representative_capacity,
            get_edge_capacity_from_graph(BASE_GRAPH, u, v)
        )

        label = get_edge_label_from_graph(BASE_GRAPH, u, v)

        if label not in unique_labels:
            unique_labels.append(label)

    if not unique_labels:
        road_name = "Selected road corridor"
    elif len(unique_labels) == 1:
        road_name = unique_labels[0]
    else:
        road_name = " -> ".join(unique_labels[:3])

        if len(unique_labels) > 3:
            road_name += " -> ..."

    return {
        "road": road_name,
        "road_type": "selected corridor" if len(unique_labels) > 1 else get_edge_type_from_graph(BASE_GRAPH, blocked_edges_list[0][0], blocked_edges_list[0][1]),
        "length_km": round(total_length_m / 1000, 2),
        "capacity": representative_capacity
    }


def aggregate_edge_usage(graph, edge_metric_map, status, metric_name):

    grouped_usage = {}

    for (u, v), metric_value in edge_metric_map.items():
        road = get_edge_label_from_graph(graph, u, v)
        road_type = get_edge_type_from_graph(graph, u, v)
        key = (road, road_type)

        if key not in grouped_usage:
            grouped_usage[key] = {
                "road": road,
                "road_type": road_type,
                "length_km": 0.0,
                "capacity": 0,
                metric_name: 0,
                "edges": []
            }

        grouped_usage[key][metric_name] += metric_value
        grouped_usage[key]["capacity"] = max(grouped_usage[key]["capacity"], get_edge_capacity_from_graph(graph, u, v))

        if (u, v) not in grouped_usage[key]["edges"]:
            grouped_usage[key]["edges"].append((u, v))
            grouped_usage[key]["length_km"] += get_edge_length_from_graph(graph, u, v) / 1000

    aggregated_items = []

    for grouped_item in grouped_usage.values():
        grouped_item["length_km"] = round(grouped_item["length_km"], 2)
        grouped_item["map_feature"] = build_group_feature_from_graph(
            graph,
            grouped_item["edges"],
            status,
            grouped_item["road"],
            grouped_item["road_type"]
        )
        del grouped_item["edges"]
        aggregated_items.append(grouped_item)

    return aggregated_items


def analyze_block_impact(blocked_edges_list, route_endpoints=None):

    blocked_edge_set = set(blocked_edges_list)
    seed_nodes = {node for edge in blocked_edges_list for node in edge}

    rng = random.Random(str(sorted(blocked_edges_list)))
    affected_routes = []

    origin_candidates = get_nearby_nodes(BASE_GRAPH, seed_nodes, steps=2)
    destination_candidates = get_nearby_nodes(BASE_GRAPH, seed_nodes, steps=3)

    if len(destination_candidates) < 20:
        additional_nodes = rng.sample(nodes, min(40, len(nodes)))
        destination_candidates = list({*destination_candidates, *additional_nodes})

    rng.shuffle(origin_candidates)
    rng.shuffle(destination_candidates)

    for origin in origin_candidates[:20]:
        for destination in destination_candidates[:50]:
            if origin == destination:
                continue

            baseline_route = compute_route_on_graph(BASE_GRAPH, origin, destination)

            if not baseline_route or not route_contains_any_blocked_edge(baseline_route, blocked_edge_set):
                continue

            rerouted_route = compute_route_on_graph(G, origin, destination)

            if not rerouted_route or rerouted_route == baseline_route:
                continue

            affected_routes.append({
                "origin": origin,
                "destination": destination,
                "baseline_route": baseline_route,
                "rerouted_route": rerouted_route,
                "baseline_summary": summarize_route(BASE_GRAPH, baseline_route),
                "rerouted_summary": summarize_route(G, rerouted_route)
            })

            if len(affected_routes) >= 18:
                break

        if len(affected_routes) >= 18:
            break

    reroute_usage = defaultdict(int)
    hotspot_scores = {}

    for route_info in affected_routes:
        for u, v in edge_pairs(route_info["rerouted_route"]):
            reroute_usage[(u, v)] += 1

    for (u, v), reuse_count in reroute_usage.items():
        capacity = max(get_edge_capacity_from_graph(G, u, v), 1)
        travel_minutes = get_edge_travel_minutes_from_graph(G, u, v)
        hotspot_scores[(u, v)] = (reuse_count / capacity) * max(travel_minutes, 0.1)

    top_reused_roads = sorted(
        aggregate_edge_usage(G, reroute_usage, "reused-road", "reuse_count"),
        key=lambda item: item["reuse_count"],
        reverse=True
    )[:5]

    hotspot_roads = sorted(
        aggregate_edge_usage(G, hotspot_scores, "hotspot-road", "estimated_pressure"),
        key=lambda item: item["estimated_pressure"],
        reverse=True
    )[:5]

    for road in hotspot_roads:
        road["estimated_pressure"] = round(road["estimated_pressure"], 3)
        road["estimated_travel_minutes"] = round(road["length_km"] * 60 / max(get_base_speed(road["road_type"]) if road["road_type"] in BASE_SPEED else 30, 1), 2)

    primary_reroute = None

    if route_endpoints is not None:
        start_node, end_node = route_endpoints
        selected_before_route = compute_route_on_graph(BASE_GRAPH, start_node, end_node)
        selected_after_route = compute_route_on_graph(G, start_node, end_node)

        if selected_before_route and selected_after_route and selected_before_route != selected_after_route:
            before_summary = summarize_route(BASE_GRAPH, selected_before_route)
            after_summary = summarize_route(G, selected_after_route)

            primary_reroute = {
                "before": before_summary,
                "after": after_summary,
                "extra_distance_km": round(after_summary["distance_km"] - before_summary["distance_km"], 2),
                "extra_travel_minutes": round(after_summary["travel_minutes"] - before_summary["travel_minutes"], 1),
                "reroute_path": build_route_feature(G, selected_after_route)
            }

    if primary_reroute is None and affected_routes:
        primary_candidate = min(
            affected_routes,
            key=lambda route_info: route_info["rerouted_summary"]["travel_minutes"]
        )

        before_summary = primary_candidate["baseline_summary"]
        after_summary = primary_candidate["rerouted_summary"]

        primary_reroute = {
            "before": before_summary,
            "after": after_summary,
            "extra_distance_km": round(after_summary["distance_km"] - before_summary["distance_km"], 2),
            "extra_travel_minutes": round(after_summary["travel_minutes"] - before_summary["travel_minutes"], 1),
            "reroute_path": build_route_feature(G, primary_candidate["rerouted_route"])
        }

    return {
        "blocked_road": summarize_blocked_corridor(blocked_edges_list),
        "affected_trip_count": len(affected_routes),
        "primary_reroute": primary_reroute,
        "top_reused_roads": top_reused_roads,
        "traffic_hotspots": hotspot_roads
    }


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


def get_spawn_seed_nodes(u, v):

    candidate_nodes = {u, v}

    for node in (u, v):
        if G.has_node(node):
            candidate_nodes.update(G.neighbors(node))

    first_ring_nodes = list(candidate_nodes)

    for node in first_ring_nodes:
        if G.has_node(node):
            candidate_nodes.update(G.neighbors(node))

    return list(candidate_nodes)


def get_spawn_seed_nodes_for_route(route):

    candidate_nodes = set(route)

    for node in route:
        if G.has_node(node):
            candidate_nodes.update(G.neighbors(node))

    first_ring_nodes = list(candidate_nodes)

    for node in first_ring_nodes:
        if G.has_node(node):
            candidate_nodes.update(G.neighbors(node))

    return list(candidate_nodes)


# ---------------------------------------------------
# Spawn Vehicles
# ---------------------------------------------------

def spawn_vehicles(count=100, near_nodes=None):

    global vehicles, edge_vehicle_count

    vehicles = []
    edge_vehicle_count = defaultdict(int)

    candidate_nodes = near_nodes if near_nodes else nodes

    for i in range(count):

        start = random.choice(candidate_nodes)

        end = random.choice(nodes)

        route = compute_route(start, end)

        if route and len(route) > 1:

            v = Vehicle(i, route)
            v.progress = random.random() * 0.85
            vehicles.append(v)

            first_u = route[0]
            first_v = route[1]
            edge_vehicle_count[(first_u, first_v)] += 1

    print("Spawned vehicles:", len(vehicles))


def build_blocked_road_feature(route):

    start_connector = get_partial_edge_coordinates(route["start_selection"], route["start_node"], from_projected_to_node=True)
    end_connector = get_partial_edge_coordinates(route["end_selection"], route["end_node"], from_projected_to_node=False)

    return build_route_feature(
        BASE_GRAPH,
        route["route"],
        "blocked",
        prefix_coordinates=start_connector,
        suffix_coordinates=end_connector
    )


# ---------------------------------------------------
# Block Road
# ---------------------------------------------------

def block_road(route):

    global blocked_road_feature, blocked_road_analysis, selected_block_route

    blocked_edge_list = edge_pairs(route["route"])

    if not blocked_edge_list:
        return

    selected_block_route = route["route"]
    blocked_road_feature = build_blocked_road_feature(route)

    for u, v in blocked_edge_list:
        remove_blocked_edge_pair(G, BASE_GRAPH, u, v, blocked_edges)

    blocked_road_analysis = analyze_block_impact(
        blocked_edge_list,
        route_endpoints=(route["start_node"], route["end_node"])
    )

    print("Blocked corridor edges:", len(blocked_edge_list))


def get_nearest_node(lat, lon):

    u, v, _ = ox.distance.nearest_edges(BASE_GRAPH, lon, lat)

    u_x = BASE_GRAPH.nodes[u]["x"]
    u_y = BASE_GRAPH.nodes[u]["y"]
    v_x = BASE_GRAPH.nodes[v]["x"]
    v_y = BASE_GRAPH.nodes[v]["y"]

    distance_to_u = sqrt((lon - u_x) ** 2 + (lat - u_y) ** 2)
    distance_to_v = sqrt((lon - v_x) ** 2 + (lat - v_y) ** 2)

    return u if distance_to_u <= distance_to_v else v


def get_nearest_edge_endpoints(lat, lon):

    u, v, _ = ox.distance.nearest_edges(BASE_GRAPH, lon, lat)

    return [u, v]


def get_projected_edge_selection(lat, lon):

    u, v, key = ox.distance.nearest_edges(BASE_GRAPH, lon, lat)
    geometry = get_edge_geometry_from_graph(BASE_GRAPH, u, v)
    projected_distance = geometry.project(Point(lon, lat))
    geometry_length = max(geometry.length, 1e-12)
    projected_point = geometry.interpolate(projected_distance)
    edge_length_m = get_edge_length_from_graph(BASE_GRAPH, u, v)
    fraction = projected_distance / geometry_length

    return {
        "u": u,
        "v": v,
        "key": key,
        "geometry": geometry,
        "projected_distance": projected_distance,
        "geometry_length": geometry_length,
        "projected_coordinates": [projected_point.x, projected_point.y],
        "distance_to_u_m": edge_length_m * fraction,
        "distance_to_v_m": edge_length_m * (1 - fraction)
    }


def get_partial_edge_coordinates(selection, target_node, from_projected_to_node):

    u = selection["u"]
    v = selection["v"]
    geometry = selection["geometry"]
    projected_distance = selection["projected_distance"]
    geometry_length = selection["geometry_length"]

    if target_node == u:
        partial_geometry = substring(geometry, 0, projected_distance)
        coordinates = geometry_to_coordinates(partial_geometry)

        if from_projected_to_node:
            coordinates.reverse()

        return coordinates

    if target_node == v:
        partial_geometry = substring(geometry, projected_distance, geometry_length)
        coordinates = geometry_to_coordinates(partial_geometry)

        if not from_projected_to_node:
            coordinates.reverse()

        return coordinates

    return [selection["projected_coordinates"]]


def remove_blocked_edge_pair(graph, source_graph, u, v, blocked_edge_set):

    for edge_u, edge_v in ((u, v), (v, u)):
        edge_data = graph.get_edge_data(edge_u, edge_v)

        if edge_data:
            for key in list(edge_data.keys()):
                graph.remove_edge(edge_u, edge_v, key)

        if source_graph.has_edge(edge_u, edge_v):
            blocked_edge_set.add((edge_u, edge_v))


def compute_block_route(start_lat, start_lon, end_lat, end_lon):

    start_selection = get_projected_edge_selection(start_lat, start_lon)
    end_selection = get_projected_edge_selection(end_lat, end_lon)

    start_candidates = [
        (start_selection["u"], start_selection["distance_to_u_m"]),
        (start_selection["v"], start_selection["distance_to_v_m"])
    ]
    end_candidates = [
        (end_selection["u"], end_selection["distance_to_u_m"]),
        (end_selection["v"], end_selection["distance_to_v_m"])
    ]

    best_route = None
    best_score = None
    best_start_node = None
    best_end_node = None

    for start_node, start_offset_m in start_candidates:
        for end_node, end_offset_m in end_candidates:
            if start_node == end_node:
                continue

            candidate_route = compute_route_on_graph(BASE_GRAPH, start_node, end_node)

            if not candidate_route or len(candidate_route) < 2:
                continue

            route_distance = sum(
                get_edge_length_from_graph(BASE_GRAPH, u, v)
                for u, v in edge_pairs(candidate_route)
            )

            score = start_offset_m + route_distance + end_offset_m

            if best_score is None or score < best_score:
                best_score = score
                best_route = candidate_route
                best_start_node = start_node
                best_end_node = end_node

    if not best_route:
        return None

    return {
        "route": best_route,
        "start_selection": start_selection,
        "end_selection": end_selection,
        "start_node": best_start_node,
        "end_node": best_end_node
    }


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

    coordinates = get_edge_coordinates(u, v)

    if len(coordinates) == 1:
        lon, lat = coordinates[0]
        return lat, lon

    segment_lengths = []
    total_length = 0

    for index in range(len(coordinates) - 1):
        lon1, lat1 = coordinates[index]
        lon2, lat2 = coordinates[index + 1]

        segment_length = sqrt((lon2 - lon1) ** 2 + (lat2 - lat1) ** 2)
        segment_lengths.append(segment_length)
        total_length += segment_length

    if total_length == 0:
        lon, lat = coordinates[0]
        return lat, lon

    target_distance = total_length * max(0, min(progress, 1))
    distance_travelled = 0

    for index, segment_length in enumerate(segment_lengths):
        lon1, lat1 = coordinates[index]
        lon2, lat2 = coordinates[index + 1]

        if distance_travelled + segment_length >= target_distance:
            if segment_length == 0:
                return lat1, lon1

            segment_progress = (target_distance - distance_travelled) / segment_length
            lat = lat1 + (lat2 - lat1) * segment_progress
            lon = lon1 + (lon2 - lon1) * segment_progress

            return lat, lon

        distance_travelled += segment_length

    lon, lat = coordinates[-1]
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

def start_simulation(start_lat=None, start_lon=None, end_lat=None, end_lon=None):

    global SIMULATION_RUNNING

    if None not in (start_lat, start_lon, end_lat, end_lon):

        block_route = compute_block_route(start_lat, start_lon, end_lat, end_lon)

        if block_route and len(block_route["route"]) > 1:
            block_road(block_route)
            near_nodes = get_spawn_seed_nodes_for_route(block_route["route"])
        else:
            near_nodes = None

    else:
        near_nodes = None

    if not SIMULATION_RUNNING:
        spawn_vehicles(100, near_nodes)
        SIMULATION_RUNNING = True

    return {
        "started": True,
        "blocked_road": blocked_road_feature,
        "analysis": blocked_road_analysis
    }


# ---------------------------------------------------
# Get Simulation State
# ---------------------------------------------------

def get_simulation_state():

    if not SIMULATION_RUNNING:
        return {
            "vehicles": [],
            "blocked_road": blocked_road_feature,
            "analysis": blocked_road_analysis
        }

    simulation_step()

    vehicles_data = get_vehicle_positions()

    return {
        "vehicle_count": len(vehicles_data),
        "vehicles": vehicles_data,
        "blocked_road": blocked_road_feature,
        "analysis": blocked_road_analysis
    }