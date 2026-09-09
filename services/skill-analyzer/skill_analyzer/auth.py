import hashlib
import hmac
import time

from fastapi import HTTPException

from skill_analyzer.config import settings


def verify_job_token(token: str, job_id: str) -> None:
    secret = settings.skill_analyzer_secret
    if not secret:
        raise HTTPException(status_code=503, detail="SKILL_ANALYZER_SECRET 未設定")
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="憑證無效")
    token_job, exp_str, sig = parts
    if token_job != job_id:
        raise HTTPException(status_code=401, detail="憑證與任務不符")
    try:
        exp = int(exp_str)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="憑證無效") from exc
    payload = f"{token_job}.{exp_str}".encode()
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=401, detail="憑證無效")
    if exp < int(time.time()):
        raise HTTPException(status_code=401, detail="憑證已過期")


def token_from_request(token: str | None, header_token: str | None) -> str:
    value = header_token or token
    if not value:
        raise HTTPException(status_code=401, detail="缺少憑證")
    return value
