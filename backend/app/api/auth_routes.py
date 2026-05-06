"""
Authentication Routes
Simple JWT-based authentication for demo/testing
"""

import jwt
from datetime import datetime, timedelta
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])

# Secret key for JWT (in production, use environment variable)
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"

# Demo credentials
DEMO_CREDENTIALS = {
    "demo@iobbank.com": "demo@123456",
    "test@iobbank.com": "test@123456",
    "admin@iobbank.com": "admin@123456",
}


class LoginRequest(BaseModel):
    """Login request model"""
    email: str
    password: str


class SignupRequest(BaseModel):
    """Signup request model"""
    email: str
    password: str
    name: Optional[str] = None


class AuthResponse(BaseModel):
    """Auth response model"""
    success: bool
    token: Optional[str] = None
    user: Optional[Dict] = None
    message: str


def create_jwt_token(email: str, expires_in_hours: int = 24) -> str:
    """Create JWT token"""
    payload = {
        "email": email,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=expires_in_hours),
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token


def verify_jwt_token(token: str) -> Optional[Dict]:
    """Verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest) -> AuthResponse:
    """
    Login with email and password
    
    Demo credentials:
    - Email: demo@iobbank.com
    - Password: demo@123456
    """
    # Check if user exists in demo credentials
    if request.email not in DEMO_CREDENTIALS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    # Check password
    if DEMO_CREDENTIALS[request.email] != request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    
    # Generate token
    token = create_jwt_token(request.email)
    
    return AuthResponse(
        success=True,
        token=token,
        user={
            "email": request.email,
            "name": request.email.split("@")[0],
            "role": "user",
        },
        message="Login successful",
    )


@router.post("/signup", response_model=AuthResponse)
async def signup(request: SignupRequest) -> AuthResponse:
    """
    Sign up new user (demo mode - just creates token)
    """
    # Check if user already exists
    if request.email in DEMO_CREDENTIALS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already exists",
        )
    
    # Add user to demo credentials
    DEMO_CREDENTIALS[request.email] = request.password
    
    # Generate token
    token = create_jwt_token(request.email)
    
    return AuthResponse(
        success=True,
        token=token,
        user={
            "email": request.email,
            "name": request.name or request.email.split("@")[0],
            "role": "user",
        },
        message="Signup successful",
    )


@router.post("/verify-token", response_model=AuthResponse)
async def verify_token(token: str) -> AuthResponse:
    """
    Verify JWT token
    """
    payload = verify_jwt_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    
    return AuthResponse(
        success=True,
        user={
            "email": payload.get("email"),
            "name": payload.get("email", "").split("@")[0],
            "role": "user",
        },
        message="Token is valid",
    )


@router.get("/health")
async def auth_health():
    """Health check for auth service"""
    return {
        "status": "operational",
        "service": "authentication",
        "demo_credentials": list(DEMO_CREDENTIALS.keys()),
    }
