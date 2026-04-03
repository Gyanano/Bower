import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.account import router as account_router
from app.api.routes.boards import router as boards_router
from app.api.routes.image_analysis import router as image_analysis_router
from app.api.routes.inspirations import router as inspirations_router
from app.api.routes.settings_ai import router as settings_ai_router
from app.api.routes.settings_preferences import router as settings_preferences_router
from app.db.sqlite import initialize_database
from app.errors import AppError, app_error_handler, request_validation_error_handler


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="Bower API", lifespan=lifespan)
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RequestValidationError, request_validation_error_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"(chrome-extension|moz-extension)://.*",
)


@app.get("/health")
def healthcheck():
    return {"status": "ok"}


@app.websocket("/ws/events")
async def events_socket(websocket: WebSocket):
    await websocket.accept()
    await websocket.send_json({"type": "ready"})
    try:
        while True:
            await websocket.receive()
    except WebSocketDisconnect:
        return
    except RuntimeError:
        await asyncio.sleep(0)


app.include_router(inspirations_router, prefix="/api/v1")
app.include_router(image_analysis_router, prefix="/api/v1")
app.include_router(boards_router, prefix="/api/v1")
app.include_router(settings_ai_router, prefix="/api/v1")
app.include_router(settings_preferences_router, prefix="/api/v1")
app.include_router(account_router, prefix="/api/v1")
