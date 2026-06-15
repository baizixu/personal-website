import sqlite3
import hashlib
import os
import json
from datetime import datetime
import config

DB_PATH = config.DB_PATH


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS admin (
            id INTEGER PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
            is_read INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS content (
            section_key TEXT PRIMARY KEY,
            data TEXT NOT NULL
        );
    """)
    conn.commit()
    conn.close()


def hash_password(password: str) -> str:
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return f"{salt}${dk.hex()}"


def verify_password(password: str, stored: str) -> bool:
    salt, dk_hex = stored.split("$")
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100000)
    return dk.hex() == dk_hex


def create_admin(username: str, password: str):
    conn = get_db()
    conn.execute(
        "INSERT OR IGNORE INTO admin (username, password_hash) VALUES (?, ?)",
        (username, hash_password(password)),
    )
    conn.commit()
    conn.close()


def verify_admin(username: str, password: str) -> bool:
    conn = get_db()
    row = conn.execute("SELECT password_hash FROM admin WHERE username = ?", (username,)).fetchone()
    conn.close()
    if not row:
        return False
    return verify_password(password, row["password_hash"])


def get_admin_username() -> str | None:
    conn = get_db()
    row = conn.execute("SELECT username FROM admin LIMIT 1").fetchone()
    conn.close()
    return row["username"] if row else None


def update_password(username: str, new_password: str):
    conn = get_db()
    conn.execute(
        "UPDATE admin SET password_hash = ? WHERE username = ?",
        (hash_password(new_password), username),
    )
    conn.commit()
    conn.close()


def update_username(old_username: str, new_username: str):
    conn = get_db()
    conn.execute(
        "UPDATE admin SET username = ? WHERE username = ?",
        (new_username, old_username),
    )
    conn.commit()
    conn.close()


def save_message(name: str, email: str, message: str):
    conn = get_db()
    conn.execute(
        "INSERT INTO messages (name, email, message) VALUES (?, ?, ?)",
        (name, email, message),
    )
    conn.commit()
    conn.close()


def get_messages(limit: int = 50, offset: int = 0):
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?",
        (limit, offset),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_unread_count():
    conn = get_db()
    row = conn.execute("SELECT COUNT(*) as c FROM messages WHERE is_read = 0").fetchone()
    conn.close()
    return row["c"]


def mark_read(msg_id: int):
    conn = get_db()
    conn.execute("UPDATE messages SET is_read = 1 WHERE id = ?", (msg_id,))
    conn.commit()
    conn.close()


def delete_message(msg_id: int):
    conn = get_db()
    conn.execute("DELETE FROM messages WHERE id = ?", (msg_id,))
    conn.commit()
    conn.close()


def get_content(section_key: str) -> dict | None:
    conn = get_db()
    row = conn.execute("SELECT data FROM content WHERE section_key = ?", (section_key,)).fetchone()
    conn.close()
    if row:
        return json.loads(row["data"])
    return None


def save_content(section_key: str, data: dict):
    conn = get_db()
    conn.execute(
        "INSERT OR REPLACE INTO content (section_key, data) VALUES (?, ?)",
        (section_key, json.dumps(data, ensure_ascii=False)),
    )
    conn.commit()
    conn.close()


def get_all_content():
    conn = get_db()
    rows = conn.execute("SELECT * FROM content").fetchall()
    conn.close()
    return {r["section_key"]: json.loads(r["data"]) for r in rows}
