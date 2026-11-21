from fastapi import APIRouter, HTTPException
from ..schemas.routes import RouteRequest, RouteResponse, EvacuationRouteRequest, EvacuationRouteResponse
from ..services.routing_service import routing_service

router = APIRouter(prefix="/api", tags=["Routes"])

@router.post("/routes", response_model=RouteResponse)
def compute_candidate_route(req: RouteRequest):
    # Check AOI bounds roughly
    # AOI is around 76.2 to 76.7 lon, 9.2 to 9.7 lat
    if not (76.0 <= req.origin.longitude <= 77.0 and 9.0 <= req.origin.latitude <= 10.0):
        return RouteResponse(
            status="no_route_found",
            distance_km=None,
            geometry=None,
            method="NetworkX shortest path over OSM road graph",
            warnings=[
                "Origin coordinates are outside the operational event Area of Interest.",
                "Candidate route only. Road conditions and passability require ground verification."
            ]
        )

    if not (76.0 <= req.destination.longitude <= 77.0 and 9.0 <= req.destination.latitude <= 10.0):
        return RouteResponse(
            status="no_route_found",
            distance_km=None,
            geometry=None,
            method="NetworkX shortest path over OSM road graph",
            warnings=[
                "Destination coordinates are outside the operational event Area of Interest.",
                "Candidate route only. Road conditions and passability require ground verification."
            ]
        )

    res = routing_service.find_route(
        origin_lon=req.origin.longitude,
        origin_lat=req.origin.latitude,
        dest_lon=req.destination.longitude,
        dest_lat=req.destination.latitude
    )
    return res

@router.post("/routes/evacuation", response_model=EvacuationRouteResponse)
def compute_evacuation_route(req: EvacuationRouteRequest):
    """
    Computes safe evacuation route to nearest active emergency relief shelter.
    Avoids satellite-mapped flood inundated road segments where road graph is available.
    Returns direct bearing and honest warnings where road network graph is unmapped.
    """
    result = routing_service.find_evacuation_route(
        origin_lon=req.origin.longitude,
        origin_lat=req.origin.latitude,
        region_slug=req.region_slug,
        preferred_shelter_id=req.preferred_shelter_id,
        travel_mode=req.travel_mode or "driving"
    )
    return result
