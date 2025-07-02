from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from app.api import routes, websocket
from app.config import settings

# Create FastAPI app
app = FastAPI(title="Sports Card Analyzer API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create Socket.IO server
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

# Include routes
app.include_router(routes.router, prefix="/api")

# Initialize WebSocket handlers
websocket.init_socketio(sio)

@app.get("/")
async def root():
    return {"message": "Sports Card Analyzer API", "version": "0.1.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:socket_app", host="0.0.0.0", port=8000, reload=True)
