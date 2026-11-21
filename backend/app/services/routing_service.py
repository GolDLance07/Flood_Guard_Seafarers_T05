import json
import math
import numpy as np
import networkx as nx
from scipy.spatial import cKDTree
from typing import Optional, Tuple, List, Dict, Any
from ..config import PROCESSED_DATA_DIR

class RoutingService:
    def __init__(self):
        self.graph: Optional[nx.Graph] = None
        self.dry_graph: Optional[nx.Graph] = None
        self.node_coords: Optional[np.ndarray] = None
        self.kdtree: Optional[cKDTree] = None
        self.nodes_list: List[Tuple[float, float]] = []
        self._load_graph()

    def _load_graph(self):
        graph_file = PROCESSED_DATA_DIR / "routing_graph.json"
        if not graph_file.exists():
            return

        with open(graph_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.graph = nx.Graph()
        self.dry_graph = nx.Graph()
        nodes_raw = data.get("nodes", [])
        self.nodes_list = [tuple(n) for n in nodes_raw]

        for e in data.get("edges", []):
            u = tuple(e["u"])
            v = tuple(e["v"])
            dist = e.get("dist", 0.0)
            flooded = e.get("flooded", False)
            weight = dist * (100.0 if flooded else 1.0)
            self.graph.add_edge(u, v, distance=dist, weight=weight, flooded=flooded)
            if not flooded:
                self.dry_graph.add_edge(u, v, distance=dist, weight=dist, flooded=False)

        if self.nodes_list:
            self.node_coords = np.array(self.nodes_list)
            self.kdtree = cKDTree(self.node_coords)

    def snap_to_nearest_node(self, lon: float, lat: float, max_distance_deg: float = 0.08) -> Optional[Tuple[float, float]]:
        if self.kdtree is None or len(self.nodes_list) == 0:
            return None
        dist, idx = self.kdtree.query([lon, lat])
        if dist > max_distance_deg:
            return None
        return self.nodes_list[idx]

    def find_route(self, origin_lon: float, origin_lat: float, dest_lon: float, dest_lat: float) -> Dict[str, Any]:
        warning_msg = "Candidate route only. Road conditions and passability require ground verification."

        if self.graph is None or self.dry_graph is None or self.kdtree is None:
            return {
                "status": "service_unavailable",
                "distance_km": None,
                "geometry": None,
                "method": "NetworkX shortest path over OSM road graph",
                "warnings": ["Road network graph is currently unavailable.", warning_msg]
            }

        start_node = self.snap_to_nearest_node(origin_lon, origin_lat)
        end_node = self.snap_to_nearest_node(dest_lon, dest_lat)

        if start_node is None or end_node is None:
            return {
                "status": "no_route_found",
                "distance_km": None,
                "geometry": None,
                "method": "NetworkX shortest path over OSM road graph",
                "warnings": [
                    "Origin or destination could not be snapped to the road network within the AOI boundary.",
                    warning_msg
                ]
            }

        # Step 1: Attempt to find a path in the dry graph (flooded edges strictly excluded)
        try:
            dry_path = nx.shortest_path(self.dry_graph, source=start_node, target=end_node, weight="distance")
            
            total_dist_km = 0.0
            coords = []
            for i in range(len(dry_path)):
                coords.append([dry_path[i][0], dry_path[i][1]])
                if i < len(dry_path) - 1:
                    edge_data = self.dry_graph.get_edge_data(dry_path[i], dry_path[i+1])
                    if edge_data:
                        total_dist_km += edge_data.get("distance", 0.0)

            return {
                "status": "candidate_route",
                "distance_km": round(total_dist_km, 2),
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords
                },
                "method": "NetworkX shortest path over OSM road graph with mapped flood-intersecting edges strictly excluded",
                "warnings": [
                    warning_msg,
                    "Route avoids all mapped inundation segments based on August 21 2018 satellite radar observations."
                ]
            }
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            # No path exists when excluding flood edges
            return {
                "status": "no_route_found",
                "distance_km": None,
                "geometry": None,
                "method": "NetworkX shortest path over OSM road graph with mapped flood-intersecting edges strictly excluded",
                "warnings": [
                    "No route was found in the available road graph after mapped flood-exposed edges were excluded.",
                    warning_msg
                ]
            }

    def find_evacuation_route(
        self,
        origin_lon: float,
        origin_lat: float,
        region_slug: Optional[str] = None,
        preferred_shelter_id: Optional[str] = None,
        travel_mode: str = "driving"
    ) -> Dict[str, Any]:
        """
        Calculates safe evacuation route to nearest active shelter.
        Strictly excludes flooded road segments where road graph is available.
        Provides direct geodesic route with explicit warnings where road graphs are unmapped.
        """
        from backend.app.services.citizen_service import citizen_service

        safety_disclaimer = (
            "Candidate evacuation route only. Road conditions, water depths, bridge structural integrity, "
            "and local debris require on-scene ground verification. Obey on-scene emergency responders "
            "and district collectorate instructions at all times."
        )

        shelters_data = citizen_service.get_shelters_for_region(region_slug)
        shelters = shelters_data.get("shelters", [])

        if not shelters:
            return {
                "status": "no_shelters_available",
                "target_shelter": None,
                "distance_km": None,
                "estimated_duration_minutes": None,
                "travel_mode": travel_mode,
                "geometry": None,
                "routing_method": "NO_REGISTERED_SHELTERS",
                "is_flood_avoiding": False,
                "safety_disclaimer": safety_disclaimer,
                "warnings": [
                    shelters_data.get("notice") or f"No registered or operational emergency relief shelters found for region '{region_slug}'.",
                    "Contact the local district emergency control room for emergency evacuation assembly points."
                ]
            }

        # Select target shelter
        target = None
        if preferred_shelter_id:
            for s in shelters:
                if s.get("id") == preferred_shelter_id or s.get("shelter_id") == preferred_shelter_id:
                    target = s
                    break

        if not target:
            # Pick closest active shelter by haversine distance
            def dist_calc(s):
                s_lat = float(s.get("latitude", 0))
                s_lon = float(s.get("longitude", 0))
                R = 6371.0
                phi1, phi2 = math.radians(origin_lat), math.radians(s_lat)
                dphi = math.radians(s_lat - origin_lat)
                dlambda = math.radians(s_lon - origin_lon)
                a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
                return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

            target = min(shelters, key=dist_calc)

        dest_lat = float(target.get("latitude", 0))
        dest_lon = float(target.get("longitude", 0))

        target_info = {
            "id": target.get("id") or target.get("shelter_id", "shelter-unknown"),
            "name": target.get("name", "Emergency Relief Facility"),
            "address": target.get("address") or target.get("location_name"),
            "latitude": dest_lat,
            "longitude": dest_lon,
            "capacity": target.get("capacity"),
            "current_occupancy": target.get("current_occupancy", 0),
            "operational_status": target.get("operational_status", "ACTIVE"),
            "contact_phone": target.get("contact_phone") or target.get("contact_officer")
        }

        # Check if coordinates fall within road network AOI (Kerala: lon ~ 76.0-77.0, lat ~ 9.0-10.0)
        in_aoi = (
            76.0 <= origin_lon <= 77.0 and 9.0 <= origin_lat <= 10.0 and
            76.0 <= dest_lon <= 77.0 and 9.0 <= dest_lat <= 10.0
        )

        speed_kmh = 25.0 if travel_mode == "driving" else 4.0

        if in_aoi and self.dry_graph is not None:
            # Try road graph
            route_res = self.find_route(origin_lon, origin_lat, dest_lon, dest_lat)
            if route_res["status"] == "candidate_route" and route_res.get("distance_km"):
                dist = route_res["distance_km"]
                eta_mins = max(1, round((dist / speed_kmh) * 60))
                return {
                    "status": "candidate_route",
                    "target_shelter": target_info,
                    "distance_km": dist,
                    "estimated_duration_minutes": eta_mins,
                    "travel_mode": travel_mode,
                    "geometry": route_res.get("geometry"),
                    "routing_method": "OSM road network with satellite flood-inundated edges strictly excluded",
                    "is_flood_avoiding": True,
                    "safety_disclaimer": safety_disclaimer,
                    "warnings": route_res.get("warnings", []) + [
                        "Ground validation required before traversing candidate route."
                    ]
                }

        # Fallback / Outside AOI: Direct Geodesic Bearing
        R = 6371.0
        phi1, phi2 = math.radians(origin_lat), math.radians(dest_lat)
        dphi = math.radians(dest_lat - origin_lat)
        dlambda = math.radians(dest_lon - origin_lon)
        a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
        geodesic_dist = round(2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)
        est_road_dist = round(geodesic_dist * 1.3, 2)
        eta_mins = max(1, round((est_road_dist / speed_kmh) * 60))

        return {
            "status": "direct_bearing",
            "target_shelter": target_info,
            "distance_km": est_road_dist,
            "estimated_duration_minutes": eta_mins,
            "travel_mode": travel_mode,
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [round(origin_lon, 5), round(origin_lat, 5)],
                    [round(dest_lon, 5), round(dest_lat, 5)]
                ]
            },
            "routing_method": "Geodesic bearing to designated shelter (OSM road graph not connected for this jurisdiction)",
            "is_flood_avoiding": False,
            "safety_disclaimer": safety_disclaimer,
            "warnings": [
                "Road network graph is currently not connected for this region. Showing direct bearing to shelter.",
                "Actual road routes may be impassable or obstructed by flood waters.",
                "Candidate path only. Road conditions and bridge safety require local ground verification before transit."
            ]
        }

routing_service = RoutingService()
