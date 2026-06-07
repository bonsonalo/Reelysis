from contextlib import asynccontextmanager
from app.api.v1.routes import routers
from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware



@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title= "Reelysis", lifespan= lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routers)