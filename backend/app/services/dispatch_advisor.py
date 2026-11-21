import math
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

from backend.app.services.incident_service import incident_service, haversine_distance_m
from backend.app.services.responder_service import responder_service

# Capability alignments for incident categories
CATEGORY_CAPABILITIES = {
    "flooding": ["water_rescue", "boat_operations", "swiftwater_rescue", "flood_evacuation"],
    "trapped_persons": ["water_rescue", "confined_space", "rope_rescue", "search_and_rescue"],
    "medical_emergency": ["medical_triage", "advanced_first_aid", "ambulance", "paramedic"],
    "infrastructure_damage": ["heavy_clearance", "chainsaw_ops", "route_clearance", "structural_assessment"],
    "road_blocked": ["heavy_clearance", "debris_removal", "earthmoving", "route_clearance"],
    "food_water_shortage": ["logistics_distribution", "food_water_supply", "relief_distribution"],
}

STATUS_SCORES = {
    "AVAILABLE": 25,
    "ENGAGED": 10,
    "EN_ROUTE": 8,
    "OFFLINE": 0,
    "MAINTENANCE": 0,
}

class DispatchAdvisor:
    """
    Intelligent dispatch optimization engine for emergency command centers.
    Scores and ranks candidate responder units based on specialized skills, current operational
    status, geospatial proximity, and unit capacity.
    """

    def get_dispatch_recommendations(
        self,
        incident_id: str,
        max_recommendations: int = 5
    ) -> Dict[str, Any]:
        incident = incident_service.get_incident_detail(incident_id)
        if not incident:
            raise KeyError(f"Incident '{incident_id}' not found.")

        inc_lat = incident.latitude
        inc_lon = incident.longitude
        category = incident.category.lower() if incident.category else "flooding"
        severity = incident.severity.lower() if incident.severity else "medium"

        required_caps = CATEGORY_CAPABILITIES.get(category, ["search_and_rescue", "water_rescue"])
        all_teams = responder_service.list_teams()

        recommendations = []

        for team in all_teams:
            team_id = team["id"]
            team_caps = [c.lower() for c in team.get("capabilities", [])]
            team_status = team.get("status", "AVAILABLE").upper()
            team_lat = team.get("base_latitude") or inc_lat
            team_lon = team.get("base_longitude") or inc_lon

            # 1. Capability Score (0 to 40)
            matched_caps = [c for c in required_caps if c in team_caps]
            if len(required_caps) > 0:
                cap_score = min(40, round((len(matched_caps) / max(1, len(required_caps))) * 40))
            else:
                cap_score = 20

            # 2. Availability Status Score (0 to 25)
            status_score = STATUS_SCORES.get(team_status, 5)

            # 3. Proximity Score (0 to 25)
            dist_m = haversine_distance_m(inc_lat, inc_lon, team_lat, team_lon)
            dist_km = round(dist_m / 1000.0, 1)

            if dist_km <= 5.0:
                dist_score = 25
            elif dist_km <= 15.0:
                dist_score = 18
            elif dist_km <= 30.0:
                dist_score = 10
            elif dist_km <= 60.0:
                dist_score = 4
            else:
                dist_score = 0

            # 4. Capacity & Equipment Score (0 to 10)
            member_count = team.get("member_count", 4)
            cap_size_score = min(10, member_count * 2)

            total_score = min(100, cap_score + status_score + dist_score + cap_size_score)

            # Estimated arrival duration (assuming 30 km/h emergency speed + 5 min dispatch lead)
            est_minutes = max(3, round((dist_km / 30.0) * 60) + 5)

            # Build human rationale
            reasons = []
            if matched_caps:
                reasons.append(f"Equipped for {', '.join(matched_caps[:2])}")
            if team_status == "AVAILABLE":
                reasons.append("Unit currently idle and ready for immediate deployment")
            elif team_status in ("ENGAGED", "EN_ROUTE"):
                reasons.append(f"Unit {team_status.lower()}; may require handoff")
            if dist_km <= 10:
                reasons.append(f"Close staging distance ({dist_km} km, ETA ~{est_minutes} min)")
            else:
                reasons.append(f"Transit distance {dist_km} km")

            rationale = ". ".join(reasons) + "."

            recommendations.append({
                "team_id": team_id,
                "team_name": team.get("name"),
                "team_type": team.get("team_type"),
                "status": team_status,
                "score": total_score,
                "scoring_breakdown": {
                    "capability_score": cap_score,
                    "status_score": status_score,
                    "proximity_score": dist_score,
                    "capacity_score": cap_size_score
                },
                "matched_capabilities": matched_caps,
                "all_capabilities": team.get("capabilities", []),
                "distance_km": dist_km,
                "estimated_eta_minutes": est_minutes,
                "member_count": member_count,
                "rationale": rationale,
                "base_region_id": team.get("region_id")
            })

        # Rank descending by overall score
        recommendations.sort(key=lambda x: x["score"], reverse=True)

        return {
            "status": "success",
            "incident_id": incident_id,
            "incident_title": incident.title,
            "incident_category": category,
            "incident_severity": severity,
            "required_capabilities": required_caps,
            "total_candidates_evaluated": len(all_teams),
            "top_recommendations": recommendations[:max_recommendations]
        }

dispatch_advisor = DispatchAdvisor()
