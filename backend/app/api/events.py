from fastapi import APIRouter, HTTPException
from ..services.data_loader import data_loader

router = APIRouter(prefix="/api/events", tags=["Events"])

@router.get("")
def get_events():
    event = data_loader.get_event_metadata("kerala-2018-demo")
    return {
        "events": [event] if event else []
    }

@router.get("/{event_id}")
def get_event_detail(event_id: str):
    event = data_loader.get_event_metadata(event_id)
    if not event:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "EVENT_NOT_FOUND",
                    "message": f"Event '{event_id}' was not found.",
                    "details": {}
                }
            }
        )
    return event
