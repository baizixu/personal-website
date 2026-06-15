import os
from fastapi import FastAPI, HTTPException, Request, Form, Depends, Body
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import config
import database
from security import (
    SecurityHeadersMiddleware,
    rate_limiter,
    get_client_ip,
    sanitize_html,
    is_valid_email,
    token_store,
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")

security = HTTPBearer(auto_error=False)


def require_auth(credentials: HTTPAuthorizationCredentials | None = Depends(security)):
    if not credentials or not token_store.verify(credentials.credentials):
        raise HTTPException(status_code=401, detail="未授权或登录已过期")
    return True


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    database.create_admin(config.ADMIN_USERNAME, config.ADMIN_PASSWORD)
    yield


app = FastAPI(title="Personal Website", lifespan=lifespan)

# Security headers on all responses
app.add_middleware(SecurityHeadersMiddleware)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# ===== Rate limit helper =====
def check_rate(request: Request, key_prefix: str, limit: int, window: int):
    ip = get_client_ip(request)
    key = f"{key_prefix}:{ip}"
    if not rate_limiter.check(key, limit, window):
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")


# ===== Frontend Pages =====
@app.get("/")
async def index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


@app.get("/admin")
async def admin_page():
    return FileResponse(os.path.join(STATIC_DIR, "admin.html"))


# ===== Auth API =====
@app.post("/api/admin/login")
async def login(request: Request, username: str = Form(max_length=64), password: str = Form(max_length=128)):
    check_rate(request, "login", config.LOGIN_RATE_LIMIT, config.LOGIN_RATE_WINDOW)

    username = sanitize_html(username)
    if not database.verify_admin(username, password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    token = token_store.create()
    return {"ok": True, "token": token}


@app.post("/api/admin/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials:
        token_store.remove(credentials.credentials)
    return {"ok": True}


@app.get("/api/admin/check")
async def check_auth(_: bool = Depends(require_auth)):
    return {"ok": True}


# ===== Messages API =====
@app.post("/api/messages")
async def submit_message(
    request: Request,
    name: str = Form(max_length=64),
    email: str = Form(max_length=128),
    message: str = Form(max_length=4096),
):
    check_rate(request, "message", config.MESSAGE_RATE_LIMIT, config.MESSAGE_RATE_WINDOW)

    name = sanitize_html(name)
    email = sanitize_html(email)
    message = sanitize_html(message)

    if not name or not message:
        raise HTTPException(status_code=400, detail="姓名和留言不能为空")
    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="邮箱格式不正确")

    database.save_message(name, email, message)
    return {"ok": True}


@app.get("/api/admin/messages")
async def list_messages(request: Request, _: bool = Depends(require_auth)):
    check_rate(request, "api", config.API_RATE_LIMIT, config.API_RATE_WINDOW)
    return database.get_messages()


@app.get("/api/admin/messages/unread")
async def unread_count(request: Request, _: bool = Depends(require_auth)):
    check_rate(request, "api", config.API_RATE_LIMIT, config.API_RATE_WINDOW)
    return {"count": database.get_unread_count()}


@app.post("/api/admin/messages/{msg_id}/read")
async def read_message(msg_id: int, request: Request, _: bool = Depends(require_auth)):
    database.mark_read(msg_id)
    return {"ok": True}


@app.delete("/api/admin/messages/{msg_id}")
async def del_message(msg_id: int, request: Request, _: bool = Depends(require_auth)):
    database.delete_message(msg_id)
    return {"ok": True}


# ===== Content API =====
@app.get("/api/content/{section_key}")
async def get_content(section_key: str):
    return database.get_content(section_key) or {}


@app.get("/api/content")
async def all_content():
    return database.get_all_content()


@app.put("/api/admin/content/{section_key}")
async def update_content(
    section_key: str,
    request: Request,
    data: dict = Body(...),
    _: bool = Depends(require_auth),
):
    # Sanitize all string values in the content
    sanitized = {}
    for k, v in data.items():
        if isinstance(v, str):
            sanitized[k] = sanitize_html(v)
        elif isinstance(v, list):
            sanitized[k] = [sanitize_html(s) if isinstance(s, str) else s for s in v]
        else:
            sanitized[k] = v
    database.save_content(section_key, sanitized)
    return {"ok": True}


# ===== Account Settings =====
@app.post("/api/admin/change-password")
async def change_password(
    request: Request,
    old_password: str = Form(max_length=128),
    new_password: str = Form(max_length=128),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    check_rate(request, "login", config.LOGIN_RATE_LIMIT, config.LOGIN_RATE_WINDOW)

    if not credentials or not token_store.verify(credentials.credentials):
        raise HTTPException(status_code=401)

    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="新密码至少 6 位")

    admin_user = database.get_admin_username()
    if not admin_user:
        raise HTTPException(status_code=500, detail="系统错误")
    if not database.verify_admin(admin_user, old_password):
        raise HTTPException(status_code=400, detail="原密码错误")

    database.update_password(admin_user, new_password)
    return {"ok": True}


@app.post("/api/admin/change-username")
async def change_username(
    request: Request,
    password: str = Form(max_length=128),
    new_username: str = Form(max_length=64),
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    if not credentials or not token_store.verify(credentials.credentials):
        raise HTTPException(status_code=401)

    new_username = sanitize_html(new_username)
    if not new_username or len(new_username) < 2:
        raise HTTPException(status_code=400, detail="用户名至少 2 位")

    admin_user = database.get_admin_username()
    if not admin_user:
        raise HTTPException(status_code=500, detail="系统错误")
    if not database.verify_admin(admin_user, password):
        raise HTTPException(status_code=400, detail="密码错误")

    database.update_username(admin_user, new_username)
    config.ADMIN_USERNAME = new_username
    return {"ok": True}


# ===== Health =====
@app.get("/api/health")
async def health():
    return {"status": "ok", "unread_messages": database.get_unread_count()}
