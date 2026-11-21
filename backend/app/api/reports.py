from fastapi import APIRouter, HTTPException
from ..services.data_loader import data_loader

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.get("/{report_id}")
def get_report(report_id: str):
    overview = data_loader.get_overview("kerala-2018-demo")
    flood_meta = data_loader.get_flood_metadata("kerala-2018-demo")
    if not overview:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "REPORT_NOT_FOUND",
                    "message": f"Report '{report_id}' was not found.",
                    "details": {}
                }
            }
        )
    return {
        "report_id": report_id,
        "title": "FloodGuard Satellite Inundation & Impact Assessment Report",
        "event": overview.get("aoi", {}).get("name", "Kerala Floods — August 2018"),
        "generated_at": overview.get("generated_at"),
        "kpis": overview.get("kpis"),
        "provenance": overview.get("provenance"),
        "satellite_metadata": flood_meta,
        "limitations": [
            "Radar backscatter sensitivity varies under dense canopies or submerged emergent vegetation.",
            "Candidate routing is an algorithmic decision-support tool, not an official emergency passability certification.",
            "All candidate routes require real-time field confirmation by emergency response ground teams."
        ]
    }
