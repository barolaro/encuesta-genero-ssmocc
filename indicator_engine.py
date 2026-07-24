from __future__ import annotations

import json
from collections import defaultdict
from typing import Any


AGREE = {"Totalmente de acuerdo", "Parcialmente de acuerdo"}
DISAGREE = {"Totalmente en desacuerdo", "Parcialmente en desacuerdo"}


def clean(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    return value.removeprefix("Respuestas ").strip()


def matrix_item(answers: dict, code: str, index: int) -> str:
    value = answers.get(code, {})
    if not isinstance(value, dict):
        return ""
    values = list(value.values())
    return clean(values[index]) if index < len(values) else ""


def score_indicator(spec: dict, answers: dict) -> float | None:
    kind = spec["kind"]
    code = spec["question"]
    if kind == "single":
        value = clean(answers.get(code))
        return None if not value else float(any(x in value for x in spec["favorable"]))
    if kind == "matrix":
        value = matrix_item(answers, code, spec["item"])
        return None if not value else float(value in set(spec.get("favorable", list(AGREE))))
    if kind == "matrix_average":
        values = [matrix_item(answers, code, i) for i in spec["items"]]
        if not all(values):
            return None
        favorable = set(spec.get("favorable", list(AGREE)))
        return sum(value in favorable for value in values) / len(values)
    if kind == "stereotypes":
        value = answers.get(code, {})
        if not isinstance(value, dict) or not value:
            return None
        values = [clean(x) for x in value.values()]
        return sum(x in DISAGREE for x in values) / len(values)
    if kind == "multi_used":
        value = answers.get(code)
        if not isinstance(value, list):
            return None
        return float(any("No conozco" not in x and "No he utilizado" not in x for x in value))
    if kind == "preventive":
        value = answers.get(code, {})
        if not isinstance(value, dict):
            return None
        applicable = [clean(x) for x in value.values() if clean(x) != "No aplica"]
        return None if not applicable else sum(x == "Sí" for x in applicable) / len(applicable)
    if kind == "healthy":
        values = [
            clean(answers.get("P31w")) == "Sí",
            clean(answers.get("P32w")) == "Sí",
            clean(answers.get("P33w")) in {"Sí", "No consumo"},
            clean(answers.get("P34w")) == "No",
        ]
        return sum(values) / 4
    return None


def classify(value: float | None, inverse: bool = False) -> str:
    if value is None:
        return "Sin datos"
    if inverse:
        return "Positivo" if value < 30 else "Intermedio" if value <= 50 else "Negativo"
    return "Positivo" if value > 70 else "Intermedio" if value >= 50 else "Negativo"


def calculate(indicators: list[dict], response_rows: list[dict], minimum: int = 5) -> dict:
    responses = []
    for row in response_rows:
        try:
            responses.append(json.loads(row["answers_json"]))
        except Exception:
            continue
    results = []
    for spec in indicators:
        scores = [score_indicator(spec, response) for response in responses]
        valid = [x for x in scores if x is not None]
        value = round(sum(valid) / len(valid) * 100, 1) if len(valid) >= minimum else None
        results.append({
            **spec,
            "value": value,
            "base": len(valid),
            "status": classify(value, bool(spec.get("inverse"))),
        })
    dimensions: dict[str, list[float]] = defaultdict(list)
    for result in results:
        if result["value"] is not None:
            dimensions[result["dimension"]].append(
                100 - result["value"] if result.get("inverse") else result["value"]
            )
    dimension_results = [
        {"dimension": key, "score": round(sum(values) / len(values), 1), "count": len(values)}
        for key, values in dimensions.items()
    ]
    return {
        "response_count": len(responses),
        "minimum": minimum,
        "indicators": results,
        "dimensions": dimension_results,
        "summary": {
            "positive": sum(x["status"] == "Positivo" for x in results),
            "intermediate": sum(x["status"] == "Intermedio" for x in results),
            "negative": sum(x["status"] == "Negativo" for x in results),
            "pending": sum(x["status"] == "Sin datos" for x in results),
        },
    }


DEFAULT_INDICATORS = [
    {"code":"ES01","name":"Rechazo de estereotipos de género","dimension":"Cultura organizacional","question":"P17w","kind":"stereotypes"},
    {"code":"DC2","name":"Igualdad de oportunidades de desarrollo","dimension":"Gestión de personas","question":"P18w","kind":"matrix_average","items":[0,1]},
    {"code":"RSC4","name":"Selección y contratación inclusiva","dimension":"Gestión de personas","question":"P18w","kind":"matrix","item":2},
    {"code":"CAP2","name":"Acceso igualitario a capacitación","dimension":"Gestión de personas","question":"P18w","kind":"matrix","item":3},
    {"code":"REM2","name":"Equidad percibida en remuneraciones","dimension":"Gestión de personas","question":"P18w","kind":"matrix","item":4},
    {"code":"AL1","name":"Ambiente laboral seguro y respetuoso","dimension":"Ambiente laboral","question":"P19w","kind":"matrix","item":0},
    {"code":"AL3","name":"Difusión de mecanismos de denuncia","dimension":"Ambiente laboral","question":"P19w","kind":"matrix","item":1},
    {"code":"AL2","name":"Confianza en mecanismos de denuncia","dimension":"Ambiente laboral","question":"P19w","kind":"matrix","item":2},
    {"code":"VIF1","name":"Confianza en apoyo institucional ante VIF","dimension":"Violencia intrafamiliar","question":"P19w","kind":"matrix","item":3},
    {"code":"CC5","name":"Corresponsabilidad en el hogar","dimension":"Conciliación y corresponsabilidad","question":"P14w","kind":"single","favorable":["Todas las personas adultas"]},
    {"code":"CC1","name":"Aplicabilidad de medidas de conciliación","dimension":"Conciliación y corresponsabilidad","question":"P28w","kind":"matrix","item":0},
    {"code":"CC2","name":"Liderazgo que facilita la conciliación","dimension":"Conciliación y corresponsabilidad","question":"P28w","kind":"matrix","item":1},
    {"code":"CC3","name":"Desconexión laboral","dimension":"Conciliación y corresponsabilidad","question":"P28w","kind":"matrix","item":2},
    {"code":"CC4","name":"Promoción de la corresponsabilidad","dimension":"Conciliación y corresponsabilidad","question":"P28w","kind":"matrix","item":3},
    {"code":"USO","name":"Uso de medidas de conciliación","dimension":"Conciliación y corresponsabilidad","question":"P29w","kind":"multi_used"},
    {"code":"SFM1","name":"Chequeos preventivos de salud","dimension":"Salud integral","question":"P30w","kind":"preventive"},
    {"code":"SFM2","name":"Hábitos saludables","dimension":"Salud integral","question":"P31w","kind":"healthy"},
    {"code":"SFM3","name":"Malestar anímico reciente","dimension":"Salud integral","question":"P35w","kind":"single","favorable":["Sí"],"inverse":True},
    {"code":"INF1","name":"Infraestructura adecuada","dimension":"Infraestructura inclusiva","question":"P38w","kind":"matrix","item":0},
    {"code":"INF2","name":"Infraestructura que previene violencias","dimension":"Infraestructura inclusiva","question":"P38w","kind":"matrix","item":1},
    {"code":"EPP1","name":"Vestuario y EPP inclusivos","dimension":"Infraestructura inclusiva","question":"P38w","kind":"matrix","item":2},
    {"code":"CO1","name":"Valor estratégico de la igualdad","dimension":"Cultura organizacional","question":"P39w","kind":"matrix","item":0},
    {"code":"CO2","name":"Liderazgo inclusivo","dimension":"Cultura organizacional","question":"P39w","kind":"matrix","item":1},
    {"code":"CO3","name":"Compromiso con la igualdad","dimension":"Cultura organizacional","question":"P39w","kind":"matrix","item":2},
    {"code":"CO4","name":"Disposición al cambio","dimension":"Cultura organizacional","question":"P39w","kind":"matrix","item":3},
    {"code":"CO5","name":"Recomendación institucional","dimension":"Cultura organizacional","question":"P39w","kind":"matrix","item":4},
]

