from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).parent
DB_PATH = ROOT / "encuesta.db"

CYCLE_HEADERS = [
    "id", "name", "period", "status", "questions_json", "indicators_json",
    "created_at", "started_at", "closed_at", "snapshot_json",
]
RESPONSE_HEADERS = ["id", "cycle_id", "submitted_at", "receipt_code", "answers_json"]
AUDIT_HEADERS = ["id", "created_at", "actor", "action", "detail"]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class LocalStore:
    """Respaldo para desarrollo local. En producción use GoogleSheetsStore."""

    def __init__(self, path: Path = DB_PATH):
        self.path = path
        self._init()

    @contextmanager
    def conn(self):
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def _init(self):
        with self.conn() as db:
            db.executescript(
                """
                CREATE TABLE IF NOT EXISTS cycles (
                  id TEXT PRIMARY KEY, name TEXT NOT NULL, period TEXT NOT NULL,
                  status TEXT NOT NULL, questions_json TEXT NOT NULL,
                  indicators_json TEXT NOT NULL, created_at TEXT NOT NULL,
                  started_at TEXT, closed_at TEXT, snapshot_json TEXT
                );
                CREATE TABLE IF NOT EXISTS responses (
                  id TEXT PRIMARY KEY, cycle_id TEXT NOT NULL,
                  submitted_at TEXT NOT NULL, receipt_code TEXT NOT NULL,
                  answers_json TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS audit (
                  id TEXT PRIMARY KEY, created_at TEXT NOT NULL,
                  actor TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL
                );
                """
            )

    def list_cycles(self) -> list[dict[str, Any]]:
        with self.conn() as db:
            rows = db.execute(
                """SELECT c.*, COUNT(r.id) response_count
                   FROM cycles c LEFT JOIN responses r ON r.cycle_id=c.id
                   GROUP BY c.id ORDER BY c.created_at DESC"""
            ).fetchall()
        return [dict(row) for row in rows]

    def get_cycle(self, cycle_id: str) -> dict[str, Any] | None:
        with self.conn() as db:
            row = db.execute("SELECT * FROM cycles WHERE id=?", (cycle_id,)).fetchone()
        return dict(row) if row else None

    def active_cycle(self) -> dict[str, Any] | None:
        with self.conn() as db:
            row = db.execute(
                "SELECT * FROM cycles WHERE status='Activo' ORDER BY started_at DESC LIMIT 1"
            ).fetchone()
        return dict(row) if row else None

    def create_cycle(self, name: str, period: str, questions: list, indicators: list) -> str:
        cycle_id = str(uuid.uuid4())
        with self.conn() as db:
            db.execute(
                "INSERT INTO cycles VALUES (?,?,?,?,?,?,?,?,?,?)",
                (cycle_id, name, period, "Borrador", json.dumps(questions, ensure_ascii=False),
                 json.dumps(indicators, ensure_ascii=False), now_iso(), "", "", ""),
            )
        self.audit("admin", "crear_ciclo", f"{name} ({period})")
        return cycle_id

    def save_config(self, cycle_id: str, questions: list, indicators: list):
        cycle = self.get_cycle(cycle_id)
        if not cycle or cycle["status"] != "Borrador":
            raise ValueError("Solo puede editarse un ciclo en borrador.")
        with self.conn() as db:
            count = db.execute("SELECT COUNT(*) FROM responses WHERE cycle_id=?", (cycle_id,)).fetchone()[0]
            if count:
                raise ValueError("Un ciclo con respuestas no puede modificarse.")
            db.execute(
                "UPDATE cycles SET questions_json=?, indicators_json=? WHERE id=?",
                (json.dumps(questions, ensure_ascii=False), json.dumps(indicators, ensure_ascii=False), cycle_id),
            )
        self.audit("admin", "guardar_configuracion", cycle_id)

    def activate_cycle(self, cycle_id: str):
        with self.conn() as db:
            active = db.execute("SELECT id FROM cycles WHERE status='Activo'").fetchone()
            if active:
                raise ValueError("Primero debe finalizar el ciclo activo.")
            db.execute(
                "UPDATE cycles SET status='Activo', started_at=? WHERE id=? AND status='Borrador'",
                (now_iso(), cycle_id),
            )
        self.audit("admin", "activar_ciclo", cycle_id)

    def finalize_cycle(self, cycle_id: str, snapshot: dict):
        with self.conn() as db:
            db.execute(
                """UPDATE cycles SET status='Finalizado', closed_at=?, snapshot_json=?
                   WHERE id=? AND status='Activo'""",
                (now_iso(), json.dumps(snapshot, ensure_ascii=False), cycle_id),
            )
        self.audit("admin", "finalizar_ciclo", cycle_id)

    def delete_draft(self, cycle_id: str):
        with self.conn() as db:
            cycle = db.execute("SELECT status FROM cycles WHERE id=?", (cycle_id,)).fetchone()
            count = db.execute("SELECT COUNT(*) FROM responses WHERE cycle_id=?", (cycle_id,)).fetchone()[0]
            if not cycle or cycle[0] != "Borrador" or count:
                raise ValueError("Solo pueden eliminarse borradores sin respuestas.")
            db.execute("DELETE FROM cycles WHERE id=?", (cycle_id,))
        self.audit("admin", "eliminar_borrador", cycle_id)

    def add_response(self, cycle_id: str, answers: dict) -> str:
        cycle = self.get_cycle(cycle_id)
        if not cycle or cycle["status"] != "Activo":
            raise ValueError("La encuesta ya no se encuentra activa.")
        receipt = f"SSMO-{cycle['period']}-{uuid.uuid4().hex[:8].upper()}"
        with self.conn() as db:
            db.execute(
                "INSERT INTO responses VALUES (?,?,?,?,?)",
                (str(uuid.uuid4()), cycle_id, now_iso(), receipt,
                 json.dumps(answers, ensure_ascii=False)),
            )
        return receipt

    def responses(self, cycle_id: str) -> list[dict[str, Any]]:
        with self.conn() as db:
            rows = db.execute(
                "SELECT * FROM responses WHERE cycle_id=? ORDER BY submitted_at", (cycle_id,)
            ).fetchall()
        return [dict(row) for row in rows]

    def audit(self, actor: str, action: str, detail: str):
        with self.conn() as db:
            db.execute(
                "INSERT INTO audit VALUES (?,?,?,?,?)",
                (str(uuid.uuid4()), now_iso(), actor, action, detail),
            )


class GoogleSheetsStore:
    """Persistencia durable para Streamlit Community Cloud."""

    def __init__(self, spreadsheet_id: str, service_account: dict):
        import gspread
        self.client = gspread.service_account_from_dict(service_account)
        self.book = self.client.open_by_key(spreadsheet_id)
        self._ensure_sheet("ciclos", CYCLE_HEADERS)
        self._ensure_sheet("respuestas", RESPONSE_HEADERS)
        self._ensure_sheet("auditoria", AUDIT_HEADERS)

    def _ensure_sheet(self, name: str, headers: list[str]):
        try:
            sheet = self.book.worksheet(name)
        except Exception:
            sheet = self.book.add_worksheet(title=name, rows=1000, cols=max(12, len(headers)))
        if not sheet.row_values(1):
            sheet.append_row(headers)

    def _records(self, name: str) -> list[dict[str, Any]]:
        return self.book.worksheet(name).get_all_records()

    def _row(self, name: str, record_id: str) -> int | None:
        values = self.book.worksheet(name).col_values(1)
        try:
            return values.index(record_id) + 1
        except ValueError:
            return None

    def list_cycles(self) -> list[dict[str, Any]]:
        cycles = self._records("ciclos")
        counts: dict[str, int] = {}
        for response in self._records("respuestas"):
            key = str(response["cycle_id"])
            counts[key] = counts.get(key, 0) + 1
        for cycle in cycles:
            cycle["response_count"] = counts.get(str(cycle["id"]), 0)
        return sorted(cycles, key=lambda x: str(x["created_at"]), reverse=True)

    def get_cycle(self, cycle_id: str) -> dict[str, Any] | None:
        return next((x for x in self.list_cycles() if str(x["id"]) == cycle_id), None)

    def active_cycle(self) -> dict[str, Any] | None:
        return next((x for x in self.list_cycles() if x["status"] == "Activo"), None)

    def create_cycle(self, name: str, period: str, questions: list, indicators: list) -> str:
        cycle_id = str(uuid.uuid4())
        row = [cycle_id, name, period, "Borrador", json.dumps(questions, ensure_ascii=False),
               json.dumps(indicators, ensure_ascii=False), now_iso(), "", "", ""]
        self.book.worksheet("ciclos").append_row(row, value_input_option="RAW")
        self.audit("admin", "crear_ciclo", f"{name} ({period})")
        return cycle_id

    def _update_cycle(self, cycle_id: str, changes: dict):
        sheet = self.book.worksheet("ciclos")
        row = self._row("ciclos", cycle_id)
        if not row:
            raise ValueError("Ciclo no encontrado.")
        for key, value in changes.items():
            col = CYCLE_HEADERS.index(key) + 1
            sheet.update_cell(row, col, value)

    def save_config(self, cycle_id: str, questions: list, indicators: list):
        cycle = self.get_cycle(cycle_id)
        if not cycle or cycle["status"] != "Borrador" or int(cycle["response_count"]):
            raise ValueError("Solo puede editarse un borrador sin respuestas.")
        self._update_cycle(cycle_id, {
            "questions_json": json.dumps(questions, ensure_ascii=False),
            "indicators_json": json.dumps(indicators, ensure_ascii=False),
        })
        self.audit("admin", "guardar_configuracion", cycle_id)

    def activate_cycle(self, cycle_id: str):
        if self.active_cycle():
            raise ValueError("Primero debe finalizar el ciclo activo.")
        self._update_cycle(cycle_id, {"status": "Activo", "started_at": now_iso()})
        self.audit("admin", "activar_ciclo", cycle_id)

    def finalize_cycle(self, cycle_id: str, snapshot: dict):
        self._update_cycle(cycle_id, {
            "status": "Finalizado", "closed_at": now_iso(),
            "snapshot_json": json.dumps(snapshot, ensure_ascii=False),
        })
        self.audit("admin", "finalizar_ciclo", cycle_id)

    def delete_draft(self, cycle_id: str):
        cycle = self.get_cycle(cycle_id)
        if not cycle or cycle["status"] != "Borrador" or int(cycle["response_count"]):
            raise ValueError("Solo pueden eliminarse borradores sin respuestas.")
        row = self._row("ciclos", cycle_id)
        self.book.worksheet("ciclos").delete_rows(row)
        self.audit("admin", "eliminar_borrador", cycle_id)

    def add_response(self, cycle_id: str, answers: dict) -> str:
        cycle = self.get_cycle(cycle_id)
        if not cycle or cycle["status"] != "Activo":
            raise ValueError("La encuesta ya no se encuentra activa.")
        receipt = f"SSMO-{cycle['period']}-{uuid.uuid4().hex[:8].upper()}"
        self.book.worksheet("respuestas").append_row(
            [str(uuid.uuid4()), cycle_id, now_iso(), receipt,
             json.dumps(answers, ensure_ascii=False)], value_input_option="RAW"
        )
        return receipt

    def responses(self, cycle_id: str) -> list[dict[str, Any]]:
        return [x for x in self._records("respuestas") if str(x["cycle_id"]) == cycle_id]

    def audit(self, actor: str, action: str, detail: str):
        self.book.worksheet("auditoria").append_row(
            [str(uuid.uuid4()), now_iso(), actor, action, detail], value_input_option="RAW"
        )


def get_store(secrets: Any):
    try:
        spreadsheet_id = secrets["google"]["spreadsheet_id"]
        service_account = dict(secrets["gcp_service_account"])
        return GoogleSheetsStore(spreadsheet_id, service_account), "Google Sheets · persistencia activa"
    except Exception:
        return LocalStore(), "SQLite local · solo para desarrollo"

