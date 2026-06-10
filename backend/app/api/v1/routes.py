from fastapi import APIRouter
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.instagram import router as instagram_router
from app.api.v1.endpoints.analysis import router as analysis_router
from app.api.v1.endpoints.competitors import router as competitors_router

routers= APIRouter()

router_list= [auth_router, instagram_router, analysis_router, competitors_router]

for router in router_list:
    routers.include_router(router)
