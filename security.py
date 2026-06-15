import time
import re
import hashlib
from collections import defaultdict
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
import config


# ===== In-memory rate limiter =====
class RateLimiter:
    def __init__(self):
        self._store: dict[str, list[float]] = defaultdict(list)

    def _clean(self, key: str, window: int):
        now = time.time()
        self._store[key] = [t for t in self._store[key] if now - t < window]

    def check(self, key: str, limit: int, window: int) -> bool:
        """Returns True if allowed, False if rate limited."""
        self._clean(key, window)
        if len(self._store[key]) >= limit:
            return False
        self._store[key].append(time.time())
        return True

    def remaining(self, key: str, limit: int, window: int) -> int:
        self._clean(key, window)
        return max(0, limit - len(self._store[key]))


rate_limiter = RateLimiter()


def get_client_ip(request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ===== Security Headers Middleware =====
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"

        if config.PRODUCTION:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # Content-Security-Policy: allow own scripts/styles, block inline
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        response.headers["Content-Security-Policy"] = csp
        return response


# ===== Input sanitization =====
def sanitize_html(text: str) -> str:
    """Strip HTML tags and dangerous characters."""
    # Remove HTML tags
    text = re.sub(r"<[^>]*>", "", text)
    # Remove potential script/event handlers
    text = re.sub(r"(?i)javascript\s*:", "", text)
    text = re.sub(r"(?i)on\w+\s*=", "", text)
    return text.strip()


def sanitize_filename(text: str) -> str:
    """Remove path traversal and special chars from filenames."""
    return re.sub(r"[^\w.\-]", "_", text)


def is_valid_email(email: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email))


def is_valid_username(username: str) -> bool:
    return bool(re.match(r"^[a-zA-Z0-9_一-鿿]{2,32}$", username))


# ===== Token store with expiry =====
class TokenStore:
    def __init__(self):
        self._tokens: dict[str, float] = {}

    def create(self) -> str:
        import secrets
        token = secrets.token_urlsafe(40)
        self._tokens[token] = time.time()
        return token

    def verify(self, token: str) -> bool:
        if token not in self._tokens:
            return False
        age = time.time() - self._tokens[token]
        if age > config.TOKEN_EXPIRY:
            del self._tokens[token]
            return False
        return True

    def remove(self, token: str):
        self._tokens.pop(token, None)

    def cleanup(self):
        now = time.time()
        expired = [t for t, ts in self._tokens.items() if now - ts > config.TOKEN_EXPIRY]
        for t in expired:
            del self._tokens[t]


token_store = TokenStore()
