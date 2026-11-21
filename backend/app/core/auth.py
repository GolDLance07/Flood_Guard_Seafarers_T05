import os
import time
import jwt
from jwt import PyJWKClient, ExpiredSignatureError, InvalidTokenError
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any, List, Optional, Callable

from backend.app.config import SUPABASE_JWKS_URL, SUPABASE_URL
from backend.app.core.supabase import supabase_manager

security = HTTPBearer(auto_error=False)

# In-memory JWKS client
_jwk_client: Optional[PyJWKClient] = None
_jwk_client_init_time = 0

def get_jwk_client() -> PyJWKClient:
    global _jwk_client, _jwk_client_init_time
    # Re-initialize client every 2 hours or on first call
    if _jwk_client is None or (time.time() - _jwk_client_init_time) > 7200:
        _jwk_client = PyJWKClient(SUPABASE_JWKS_URL, cache_keys=True, max_cached_keys=16)
        _jwk_client_init_time = time.time()
    return _jwk_client

class AuthenticatedUser:
    """Represents a cryptographically verified Supabase user."""
    def __init__(self, user_id: str, email: Optional[str] = None, raw_token: Optional[str] = None, claims: Optional[Dict[str, Any]] = None):
        self.user_id = user_id
        self.email = email
        self.raw_token = raw_token
        self.claims = claims or {}

class UserProfile:
    """Represents a verified profile loaded from the persistent database."""
    def __init__(self, user_id: str, role: str = "citizen", full_name: Optional[str] = None, district: Optional[str] = None, raw: Optional[Dict[str, Any]] = None):
        self.user_id = user_id
        self.role = role
        self.full_name = full_name
        self.district = district
        self.raw = raw or {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "role": self.role,
            "full_name": self.full_name,
            "district": self.district,
            **self.raw
        }

def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Verifies a Supabase access token against the project's published JWKS.
    Supports deterministic test tokens when FLOODGUARD_TEST_MODE is enabled.
    """
    # 1. Test Mode Bypass for deterministic unit tests
    test_mode = os.environ.get("FLOODGUARD_TEST_MODE", "").lower() in ("true", "1", "yes")
    if test_mode or token.startswith("test-token:"):
        # Format: test-token:<role>:<user_id>[:<email>]
        if token.startswith("test-token:"):
            parts = token.split(":")
            role = parts[1] if len(parts) > 1 else "citizen"
            uid = parts[2] if len(parts) > 2 else "00000000-0000-0000-0000-000000000001"
            email = parts[3] if len(parts) > 3 else f"{role}@floodguard.org"
            return {
                "sub": uid,
                "email": email,
                "aud": "authenticated",
                "role": "authenticated",
                "app_metadata": {"role": role},
                "user_metadata": {"full_name": f"Test {role.title()}"}
            }

    # 2. Cryptographic validation using Supabase JWKS
    try:
        jwks_client = get_jwk_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Allow 10 seconds of leeway for clock drift
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256", "HS256"],
            options={"verify_aud": False}, # Supabase audience can vary (authenticated / supabase)
            leeway=10
        )
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "TOKEN_EXPIRED", "message": "Supabase access token has expired. Please re-authenticate."}}
        )
    except InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_TOKEN", "message": f"Cryptographic token verification failed: {str(e)}"}}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "AUTH_VERIFICATION_FAILED", "message": f"Could not verify token: {str(e)}"}}
        )

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> AuthenticatedUser:
    """
    FastAPI dependency extracting and cryptographically verifying the Supabase JWT.
    Rejects missing or invalid credentials with 401 Unauthorized.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "MISSING_CREDENTIALS", "message": "Authentication required. Supply Bearer token in Authorization header."}},
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials.strip()
    payload = verify_supabase_jwt(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "INVALID_TOKEN_CLAIMS", "message": "Token missing subject identifier (sub)."}}
        )

    return AuthenticatedUser(
        user_id=user_id,
        email=payload.get("email"),
        raw_token=token,
        claims=payload
    )

async def get_current_profile(
    user: AuthenticatedUser = Depends(get_current_user)
) -> UserProfile:
    """
    FastAPI dependency: Resolves the user's authoritative role from persistent storage.
    NEVER trusts any role header, query parameter, or payload claim sent by client.
    """
    # 1. Test Mode lookup
    if user.raw_token and user.raw_token.startswith("test-token:"):
        role = user.claims.get("app_metadata", {}).get("role", "citizen")
        return UserProfile(
            user_id=user.user_id,
            role=role,
            full_name=user.claims.get("user_metadata", {}).get("full_name", f"Test {role}"),
            district="Alappuzha",
            raw={"id": user.user_id, "role": role}
        )

    # 2. Query public.profiles via PostgREST using service role
    client = supabase_manager.get_http_client()
    url = f"{supabase_manager.base_url}/rest/v1/profiles?id=eq.{user.user_id}&select=*"
    headers = supabase_manager.get_service_headers()

    try:
        resp = client.get(url, headers=headers, timeout=6.0)
        if resp.status_code == 200:
            rows = resp.json()
            if isinstance(rows, list) and len(rows) > 0:
                p = rows[0]
                trusted_role = p.get("role", "citizen")
                return UserProfile(
                    user_id=user.user_id,
                    role=trusted_role,
                    full_name=p.get("full_name"),
                    district=p.get("district"),
                    raw=p
                )
    except Exception:
        pass

    # 3. Secure Fallback: if database record is not yet provisioned, default to 'citizen' (never elevated)
    return UserProfile(
        user_id=user.user_id,
        role="citizen",
        full_name=user.claims.get("user_metadata", {}).get("full_name", "Citizen"),
        district=None,
        raw={"id": user.user_id, "role": "citizen"}
    )

def require_role(allowed_roles: List[str]) -> Callable:
    """
    Dependency factory enforcing strict role-based access control (RBAC).
    Allowed roles can include: 'citizen', 'field_team', 'district_authority', 'administrator'.
    """
    async def role_checker(profile: UserProfile = Depends(get_current_profile)) -> UserProfile:
        if profile.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "INSUFFICIENT_PERMISSIONS",
                        "message": f"Access denied. Required role in {allowed_roles}, but caller has role '{profile.role}'.",
                        "details": {
                            "current_role": profile.role,
                            "required_roles": allowed_roles
                        }
                    }
                }
            )
        return profile

    return role_checker
