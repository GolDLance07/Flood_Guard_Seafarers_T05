import json
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

routing_service = RoutingService()
