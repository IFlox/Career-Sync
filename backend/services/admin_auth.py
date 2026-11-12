import os
from datetime import datetime, timedelta
from typing import Optional

import jwt
from fastapi import Header, HTTPException, status
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ADMIN_PIN = os.getenv("ADMIN_PIN")
JWT_ALGORITHM = "HS256"


def require_admin_configuration() -> None:
    if not SECRET_KEY or not ADMIN_PIN:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Administrator authentication is not configured.",
        )


def create_admin_token() -> str:
    require_admin_configuration()
    payload = {
        "sub": "tpo_admin",
        "role": "ADMIN",
        "exp": datetime.utcnow() + timedelta(hours=12),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


def verify_tpo_token(
    authorization: Optional[str] = Header(None),
    x_admin_token: Optional[str] = Header(None),
    x_admin_pin: Optional[str] = Header(None),
) -> bool:
    require_admin_configuration()

    token = None
    if authorization:
        scheme, separator, value = authorization.partition(" ")
        if scheme.lower() != "bearer" or not separator or not value.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Malformed administrator authorization header.",
            )
        token = value.strip()
    elif x_admin_token:
        token = x_admin_token

    if token:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
            if payload.get("role") == "ADMIN":
                return True
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired admin session token.",
            )

    if x_admin_pin and x_admin_pin == ADMIN_PIN:
        return True

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized: Valid administrator authentication required.",
    )
