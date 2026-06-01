from contextlib import asynccontextmanager
from app.api.v1.routes import routers
from fastapi import FastAPI, APIRouter



@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title= "Reelysis", lifespan= lifespan)

app.include_router(routers)