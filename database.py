import os
import json
import hashlib
from threading import Lock
import config

DATA_DIR = os.path.dirname(config.DB_PATH) or "."
os.makedirs(DATA_DIR, exist_ok=True)

_users_file = os.path.join(DATA_DIR, "users.json")
_messages_file = os.path.join(DATA_DIR, "messages.json")
_content_file = os.path.join(DATA_DIR, "content.json")

_lock = Lock()


def _read(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _write(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


# ===== Init =====
def init_db():
    with _lock:
        if not os.path.exists(_users_file):
            _write(_users_file, {})
        if not os.path.exists(_messages_file):
            _write(_messages_file, [])
        if not os.path.exists(_content_file):
            _write(_content_file, {})


# ===== Auth =====
def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return f"{salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, dk_hex = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
        return dk.hex() == dk_hex
    except ValueError:
        return False


def create_admin(username: str, password: str):
    with _lock:
        users = _read(_users_file)
        if username not in users:
            users[username] = hash_password(password)
            _write(_users_file, users)


def verify_admin(username: str, password: str) -> bool:
    users = _read(_users_file)
    stored = users.get(username)
    if not stored:
        return False
    return verify_password(password, stored)


def get_admin_username() -> str | None:
    users = _read(_users_file)
    return next(iter(users.keys()), None) if users else None


def update_password(username: str, new_password: str):
    with _lock:
        users = _read(_users_file)
        if username in users:
            users[username] = hash_password(new_password)
            _write(_users_file, users)


def update_username(old_username: str, new_username: str):
    with _lock:
        users = _read(_users_file)
        if old_username in users:
            users[new_username] = users.pop(old_username)
            _write(_users_file, users)


# ===== Messages =====
def save_message(name: str, email: str, message: str):
    with _lock:
        msgs = _read(_messages_file)
        import time
        msgs.append({
            "id": int(time.time() * 1000000),
            "name": name,
            "email": email,
            "message": message,
            "created_at": _now(),
            "is_read": False,
        })
        _write(_messages_file, msgs)


def get_messages(limit: int = 50, offset: int = 0):
    msgs = _read(_messages_file)
    msgs.sort(key=lambda m: m.get("created_at", ""), reverse=True)
    return msgs[offset:offset + limit]


def get_unread_count() -> int:
    msgs = _read(_messages_file)
    return sum(1 for m in msgs if not m.get("is_read"))


def mark_read(msg_id: int):
    with _lock:
        msgs = _read(_messages_file)
        for m in msgs:
            if m["id"] == msg_id:
                m["is_read"] = True
        _write(_messages_file, msgs)


def delete_message(msg_id: int):
    with _lock:
        msgs = _read(_messages_file)
        msgs = [m for m in msgs if m["id"] != msg_id]
        _write(_messages_file, msgs)


# ===== Content =====
def get_content(section_key: str) -> dict | None:
    data = _read(_content_file)
    return data.get(section_key)


def save_content(section_key: str, data: dict):
    with _lock:
        all_data = _read(_content_file)
        all_data[section_key] = data
        _write(_content_file, all_data)


def get_all_content() -> dict:
    return _read(_content_file)


def _now():
    import datetime
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
