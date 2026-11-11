from typing import List
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request

from app.api.dep import db_dependency, user_authentication_dependency
from app.api.errors import internal_error
from app.core.rate_limit import get_user_key, job_trigger_limit, limiter
from app.schema.report_schema import ReportDetailResponse, ReportListItem, RecommendationResponse
from app.service.report_service import (
    get_recommendations_for_report_service,
    get_report_by_id_service,
    list_reports_service,
    trigger_report_generation_service,
)

router = APIRouter(
    prefix="/api/v1/reports",
    tags=["reports"],
)


@router.get("/", response_model=List[ReportListItem])
async def list_reports(
    db: db_dependency,
    current_user: user_authentication_dependency,
):
    reports = await list_reports_service(current_user["id"], db)
    return reports


@router.post("/generate")
@limiter.limit(job_trigger_limit, key_func=get_user_key)
async def generate_report(
    request: Request,
    db: db_dependency,
    current_user: user_authentication_dependency,
):
    try:
        job = await trigger_report_generation_service(current_user["id"], db)
        return {
            "message": "Report generation triggered",
            "job_id": job.id,
        }
    except Exception:
        raise internal_error("reports.generate_report")


@router.get("/{report_id}", response_model=ReportDetailResponse)
async def get_report(
    report_id: UUID,
    db: db_dependency,
    current_user: user_authentication_dependency,
):
    try:
        report = await get_report_by_id_service(report_id, current_user["id"], db)
        recommendations = await get_recommendations_for_report_service(
            report_id,
            current_user["id"],
            db,
        )
        return ReportDetailResponse(
            id=report.id,
            title=report.title,
            status=report.status,
            summary=report.summary,
            report_markdown=report.report_markdown,
            report_json=report.report_json or {},
            created_at=report.created_at,
            updated_at=report.updated_at,
            recommendations=[
                RecommendationResponse(
                    id=rec.id,
                    title=rec.title,
                    description=rec.description,
                    recommedation_type=rec.recommedation_type,
                    priority=rec.priority,
                    evidence=rec.evidence,
                    status=rec.status,
                )
                for rec in recommendations
            ],
        )
    except HTTPException:
        raise
    except Exception:
        raise internal_error("reports.get_report")
