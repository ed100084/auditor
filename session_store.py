import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent / "data" / "auditor.db"

_JSON_FIELDS = ("questions", "responses", "findings", "frameworks")


@contextmanager
def _db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    # 啟動時自動建表（idempotent）
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            session_id            TEXT PRIMARY KEY,
            framework_id          TEXT,
            responsibility_level  TEXT,
            questions             TEXT NOT NULL DEFAULT '[]',
            responses             TEXT NOT NULL DEFAULT '[]',
            findings              TEXT,
            frameworks            TEXT NOT NULL DEFAULT '[]',
            custom_framework_text TEXT NOT NULL DEFAULT '',
            scope                 TEXT NOT NULL DEFAULT '',
            context               TEXT NOT NULL DEFAULT '',
            created_at            TEXT NOT NULL,
            updated_at            TEXT NOT NULL,
            user_name             TEXT NOT NULL DEFAULT ''
        )
    """)
    # 遷移：若舊表缺少 user_name 欄位則自動補上
    try:
        conn.execute("ALTER TABLE sessions ADD COLUMN user_name TEXT NOT NULL DEFAULT ''")
    except sqlite3.OperationalError:
        pass  # 欄位已存在
    conn.commit()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _row_to_dict(row) -> dict:
    d = dict(row)
    for field in _JSON_FIELDS:
        if field in d and d[field] is not None:
            d[field] = json.loads(d[field])
        elif field in d:
            d[field] = [] if field != "findings" else None
    return d


def create_session(user_name: str = "") -> str:
    session_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with _db() as conn:
        conn.execute(
            """
            INSERT INTO sessions (
                session_id, framework_id, responsibility_level,
                questions, responses, findings,
                frameworks, custom_framework_text, scope, context,
                created_at, updated_at, user_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (session_id, None, None, "[]", "[]", None, "[]", "", "", "", now, now, user_name),
        )
    return session_id


def get_session(session_id: str) -> Optional[dict]:
    with _db() as conn:
        row = conn.execute(
            "SELECT * FROM sessions WHERE session_id = ?", (session_id,)
        ).fetchone()
    if row is None:
        return None
    return _row_to_dict(row)


def list_sessions(user_name: Optional[str] = None) -> list:
    with _db() as conn:
        if user_name is not None:
            rows = conn.execute(
                "SELECT session_id, scope, created_at, updated_at, user_name "
                "FROM sessions WHERE user_name = ? ORDER BY created_at DESC",
                (user_name,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT session_id, scope, created_at, updated_at, user_name "
                "FROM sessions ORDER BY created_at DESC"
            ).fetchall()
    return [dict(row) for row in rows]


def update_session(session_id: str, data: dict) -> bool:
    current = get_session(session_id)
    if current is None:
        return False
    current.update(data)
    now = datetime.utcnow().isoformat()
    with _db() as conn:
        conn.execute(
            """
            UPDATE sessions SET
                framework_id          = ?,
                responsibility_level  = ?,
                questions             = ?,
                responses             = ?,
                findings              = ?,
                frameworks            = ?,
                custom_framework_text = ?,
                scope                 = ?,
                context               = ?,
                updated_at            = ?
            WHERE session_id = ?
            """,
            (
                current.get("framework_id"),
                current.get("responsibility_level"),
                json.dumps(current.get("questions", [])),
                json.dumps(current.get("responses", [])),
                json.dumps(current["findings"]) if current.get("findings") is not None else None,
                json.dumps(current.get("frameworks", [])),
                current.get("custom_framework_text", ""),
                current.get("scope", ""),
                current.get("context", ""),
                now,
                session_id,
            ),
        )
    return True


def delete_session(session_id: str) -> bool:
    with _db() as conn:
        cursor = conn.execute(
            "DELETE FROM sessions WHERE session_id = ?", (session_id,)
        )
        return cursor.rowcount > 0
