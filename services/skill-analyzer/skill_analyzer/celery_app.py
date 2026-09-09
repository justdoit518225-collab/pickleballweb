from celery import Celery

from skill_analyzer.config import settings

celery_app = Celery(
    "skill_analyzer",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["skill_analyzer.tasks"],
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
