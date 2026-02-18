from fastapi import APIRouter, HTTPException

from app.services.session_log_service import session_log

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "healthy"}


@router.get("/session/{session_id}/history")
async def get_session_history(session_id: str):
    """Return the stored analysis results for a session (newest first, max 50)."""
    results = session_log.get_session(session_id)
    if results is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "count": len(results), "results": results}