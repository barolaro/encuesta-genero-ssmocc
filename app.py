from __future__ import annotations

import hashlib
import hmac
import json
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

from indicator_engine import DEFAULT_INDICATORS, calculate
from storage import get_store


ROOT = Path(__file__).parent
DEFAULT_QUESTIONS = json.loads((ROOT / "data" / "questions.json").read_text(encoding="utf-8"))

st.set_page_config(
    page_title="Encuesta Comunidad Funcionaria | SSMOCC",
    page_icon="📊",
    layout="wide",
)

st.markdown(
    """
    <style>
    :root { --azul:#075b88; --celeste:#1686ae; --rojo:#e42e3d; }
    [data-testid="stAppViewContainer"] {background:#f3f7f9}
    .ssmoc-head {padding:1rem 1.2rem;border-radius:12px;background:linear-gradient(125deg,#075783,#0b789f);color:white;margin-bottom:1rem}
    .ssmoc-head small{letter-spacing:.12em;font-weight:700}.ssmoc-head h1{margin:.3rem 0 .25rem}
    .privacy{padding:.8rem 1rem;border-left:4px solid #1686ae;background:#eaf5f8;border-radius:4px}
    .receipt{padding:1.4rem;border:1px dashed #6c98aa;background:white;text-align:center;font-size:1.25rem;font-weight:700;color:#075b88}
    .status-Positivo{color:#1f7a54}.status-Intermedio{color:#a96b09}.status-Negativo{color:#bd2430}
    @media print {.stSidebar,[data-testid="stToolbar"],.no-print{display:none!important}}
    </style>
    """,
    unsafe_allow_html=True,
)


@st.cache_resource
def store_resource():
    return get_store(st.secrets)


store, storage_label = store_resource()


def ensure_initial_cycle():
    if store.list_cycles():
        return
    cycle_id = store.create_cycle(
        "Encuesta Comunidad Funcionaria 2026",
        "2026",
        DEFAULT_QUESTIONS,
        DEFAULT_INDICATORS,
    )
    store.activate_cycle(cycle_id)


ensure_initial_cycle()


def option_labels(question: dict) -> list[str]:
    return [str(x.get("etiqueta", "")).removeprefix("Respuestas ").strip() for x in question.get("opciones", [])]


def admin_credentials() -> tuple[str, str]:
    try:
        return str(st.secrets["admin"]["username"]), str(st.secrets["admin"]["password"])
    except Exception:
        return "admin", ""


def is_admin() -> bool:
    return bool(st.session_state.get("admin_authenticated"))


def login():
    st.markdown('<div class="ssmoc-head"><small>ACCESO PROTEGIDO</small><h1>Administración</h1><p>Departamento de Género y Derechos Humanos · SSMOCC</p></div>', unsafe_allow_html=True)
    with st.form("login"):
        username = st.text_input("Usuario")
        password = st.text_input("Contraseña", type="password")
        submitted = st.form_submit_button("Ingresar", type="primary", use_container_width=True)
    if submitted:
        configured_user, configured_password = admin_credentials()
        if not configured_password:
            st.error("Falta configurar la contraseña en los secretos de Streamlit.")
        elif hmac.compare_digest(username, configured_user) and hmac.compare_digest(password, configured_password):
            st.session_state.admin_authenticated = True
            st.rerun()
        else:
            st.error("Usuario o contraseña incorrectos.")


def public_survey():
    cycle = store.active_cycle()
    st.markdown(
        '<div class="ssmoc-head"><small>ENCUESTA ANÓNIMA</small>'
        f'<h1>{cycle["name"] if cycle else "Encuesta cerrada"}</h1>'
        '<p>Departamento de Género y Derechos Humanos · Servicio de Salud Metropolitano Occidente</p></div>',
        unsafe_allow_html=True,
    )
    if not cycle:
        st.info("No existe un ciclo de encuesta activo.")
        return
    if st.session_state.get("receipt"):
        st.success("Respuesta recibida correctamente.")
        st.markdown(f'<div class="receipt">{st.session_state.receipt}</div>', unsafe_allow_html=True)
        st.caption("Guarde este código como comprobante anónimo. No permite identificar ni recuperar sus respuestas.")
        if st.button("Responder nuevamente"):
            del st.session_state["receipt"]
            st.rerun()
        return
    st.markdown('<div class="privacy"><b>Participación confidencial.</b> No se solicita nombre, RUT ni correo electrónico. Los resultados de grupos con menos de cinco casos se mantienen protegidos.</div>', unsafe_allow_html=True)
    questions = json.loads(cycle["questions_json"])
    answers: dict = {}
    with st.form("survey", clear_on_submit=False):
        for index, question in enumerate(questions, 1):
            code = question["codigo"]
            st.markdown(f"#### {index}. {question['texto']}")
            options = option_labels(question)
            if question["tipo"] == "unica":
                answers[code] = st.radio("Seleccione una alternativa", ["— Seleccione —", *options], key=code, label_visibility="collapsed")
            elif question["tipo"] == "multiple":
                answers[code] = st.multiselect("Seleccione todas las alternativas que correspondan", options, key=code)
            else:
                matrix_answers = {}
                for item in question.get("items", []):
                    matrix_answers[item] = st.radio(
                        item, ["— Seleccione —", *options], horizontal=True, key=f"{code}-{hashlib.md5(item.encode()).hexdigest()}"
                    )
                answers[code] = matrix_answers
            st.divider()
        accepted = st.checkbox("Confirmo que revisé mis respuestas y deseo enviarlas.")
        submitted = st.form_submit_button("Enviar encuesta", type="primary", use_container_width=True)
    if submitted:
        missing = []
        clean_answers = {}
        for question in questions:
            answer = answers.get(question["codigo"])
            if isinstance(answer, dict):
                valid = answer and all(value != "— Seleccione —" for value in answer.values())
            elif isinstance(answer, list):
                valid = bool(answer)
            else:
                valid = bool(answer and answer != "— Seleccione —")
            if not valid:
                missing.append(question["codigo"])
            clean_answers[question["codigo"]] = answer
        if not accepted:
            st.error("Debe confirmar el envío.")
        elif missing:
            st.error("Faltan respuestas: " + ", ".join(missing))
        else:
            try:
                st.session_state.receipt = store.add_response(str(cycle["id"]), clean_answers)
                st.rerun()
            except Exception as exc:
                st.error(str(exc))


def cycle_results(cycle: dict) -> dict:
    indicators = json.loads(cycle["indicators_json"])
    return calculate(indicators, store.responses(str(cycle["id"])))


def render_dashboard(results: dict):
    cols = st.columns(4)
    cols[0].metric("Respuestas", results["response_count"])
    cols[1].metric("Indicadores positivos", results["summary"]["positive"])
    cols[2].metric("En observación", results["summary"]["intermediate"])
    cols[3].metric("Nudos críticos", results["summary"]["negative"])
    frame = pd.DataFrame(results["indicators"])
    if frame.empty:
        st.info("No existen indicadores configurados.")
        return
    shown = frame[["code", "name", "dimension", "value", "base", "status"]].rename(columns={
        "code": "Código", "name": "Indicador", "dimension": "Dimensión",
        "value": "Resultado (%)", "base": "Base", "status": "Estado",
    })
    st.dataframe(shown, use_container_width=True, hide_index=True)
    chart = frame.dropna(subset=["value"])
    if not chart.empty:
        fig = px.bar(chart, x="value", y="name", color="status", orientation="h",
                     color_discrete_map={"Positivo":"#1f7a54","Intermedio":"#d99524","Negativo":"#df3f4b"},
                     labels={"value":"Resultado (%)","name":""})
        fig.update_layout(height=max(450, len(chart) * 28), yaxis={"categoryorder":"total ascending"})
        st.plotly_chart(fig, use_container_width=True)


def report_html(cycle: dict, results: dict) -> str:
    rows = "".join(
        f"<tr><td>{x['code']}</td><td>{x['name']}</td><td>{'Protegido' if x['value'] is None else str(x['value'])+'%'}</td><td>{x['status']}</td></tr>"
        for x in results["indicators"]
    )
    return f"""<!doctype html><html lang="es"><meta charset="utf-8"><style>
    body{{font-family:Arial;color:#18384a;max-width:950px;margin:auto;padding:45px}}h1{{color:#075b88}}
    .cover{{background:#076a99;color:white;padding:65px 50px;margin-bottom:35px}}.kpis{{display:flex;gap:15px}}
    .kpis div{{flex:1;padding:18px;background:#eef5f8}}table{{width:100%;border-collapse:collapse;margin-top:25px}}
    td,th{{padding:9px;border-bottom:1px solid #dce5e9;text-align:left}}.signatures{{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:80px}}
    .signatures div{{border-top:1px solid #789;padding-top:12px;text-align:center}}@media print{{button{{display:none}}}}
    </style><body><section class="cover"><small>INFORME EJECUTIVO {cycle['period']}</small>
    <h1>Diagnóstico de transversalización de género</h1><p>Servicio de Salud Metropolitano Occidente</p></section>
    <h2>Resumen ejecutivo</h2><p>La medición registra {results['response_count']} respuestas anónimas.</p>
    <div class="kpis"><div><b>{results['summary']['positive']}</b><br>Fortalezas</div>
    <div><b>{results['summary']['intermediate']}</b><br>En observación</div>
    <div><b>{results['summary']['negative']}</b><br>Nudos críticos</div></div>
    <h2>Resultados por indicador</h2><table><tr><th>Código</th><th>Indicador</th><th>Resultado</th><th>Estado</th></tr>{rows}</table>
    <h2>Responsables del informe</h2><div class="signatures">
    <div><b>María José Rivas González</b><br>Jefa<br>Departamento de Género y Derechos Humanos</div>
    <div><b>Angélica Álvarez Alarcón</b><br>Tecnóloga Médica<br>Departamento de Género y Derechos Humanos</div>
    <div><b>Angela Aguilera Flores</b><br>Matrona<br>Departamento de Género y Derechos Humanos</div>
    </div></body></html>"""


def config_editor(cycle: dict):
    questions = json.loads(cycle["questions_json"])
    indicators = json.loads(cycle["indicators_json"])
    q_rows = [{
        "codigo": x["codigo"], "texto": x["texto"], "tipo": x["tipo"],
        "opciones": " | ".join(option_labels(x)), "items": " | ".join(x.get("items", [])),
    } for x in questions]
    i_rows = [{k: x.get(k, "") for k in ["code","name","dimension","question","kind","item","inverse"]} for x in indicators]
    st.subheader("Preguntas")
    q_edit = st.data_editor(pd.DataFrame(q_rows), num_rows="dynamic", use_container_width=True, key=f"q-{cycle['id']}")
    st.subheader("Indicadores")
    i_edit = st.data_editor(pd.DataFrame(i_rows), num_rows="dynamic", use_container_width=True, key=f"i-{cycle['id']}")
    if st.button("Guardar configuración", type="primary"):
        new_questions = []
        for row in q_edit.fillna("").to_dict("records"):
            new_questions.append({
                "codigo": str(row["codigo"]).strip(), "texto": str(row["texto"]).strip(),
                "tipo": str(row["tipo"]).strip(), "opciones": [{"etiqueta": x.strip()} for x in str(row["opciones"]).split("|") if x.strip()],
                "items": [x.strip() for x in str(row["items"]).split("|") if x.strip()],
            })
        new_indicators = []
        for row in i_edit.fillna("").to_dict("records"):
            item = {k: row[k] for k in ["code","name","dimension","question","kind"] if str(row.get(k, "")).strip()}
            if str(row.get("item", "")).strip():
                item["item"] = int(float(row["item"]))
            item["inverse"] = bool(row.get("inverse", False))
            new_indicators.append(item)
        store.save_config(str(cycle["id"]), new_questions, new_indicators)
        st.success("Configuración guardada.")
        st.cache_resource.clear()
        st.rerun()


def administration():
    if not is_admin():
        login()
        return
    with st.sidebar:
        st.markdown("### Administración")
        page = st.radio("Menú", ["Inicio", "Ciclos", "Dashboard", "Informe ejecutivo"])
        st.caption(storage_label)
        if st.button("Cerrar sesión"):
            st.session_state.admin_authenticated = False
            st.rerun()
    st.markdown('<div class="ssmoc-head"><small>ACCESO PROTEGIDO</small><h1>Panel administrativo</h1><p>Departamento de Género y Derechos Humanos · SSMOCC</p></div>', unsafe_allow_html=True)
    cycles = store.list_cycles()
    if page == "Inicio":
        active = store.active_cycle()
        st.info(f"Ciclo activo: {active['name']}" if active else "No existe un ciclo activo.")
        st.dataframe(pd.DataFrame(cycles)[["name","period","status","response_count"]], use_container_width=True, hide_index=True)
        return
    labels = {f"{x['name']} · {x['status']} · {x['response_count']} respuestas": x for x in cycles}
    selected_label = st.selectbox("Ciclo", list(labels))
    cycle = labels[selected_label]
    if page == "Ciclos":
        with st.expander("Crear nuevo ciclo"):
            with st.form("new-cycle"):
                name = st.text_input("Nombre")
                period = st.text_input("Período o año")
                mode = st.radio("Configuración", ["Copiar ciclo seleccionado", "Comenzar desde cero"])
                create = st.form_submit_button("Crear borrador")
            if create:
                questions = json.loads(cycle["questions_json"]) if mode.startswith("Copiar") else []
                indicators = json.loads(cycle["indicators_json"]) if mode.startswith("Copiar") else []
                store.create_cycle(name, period, questions, indicators)
                st.rerun()
        c1, c2 = st.columns(2)
        if cycle["status"] == "Borrador":
            if c1.button("Activar ciclo", type="primary"):
                try:
                    store.activate_cycle(str(cycle["id"])); st.rerun()
                except Exception as exc: st.error(str(exc))
            if c2.button("Eliminar borrador"):
                try:
                    store.delete_draft(str(cycle["id"])); st.rerun()
                except Exception as exc: st.error(str(exc))
            config_editor(cycle)
        elif cycle["status"] == "Activo":
            results = cycle_results(cycle)
            st.warning("La configuración está congelada mientras el ciclo se encuentra activo.")
            if st.button("Finalizar ciclo", type="primary"):
                store.finalize_cycle(str(cycle["id"]), results)
                st.rerun()
        else:
            st.success("Ciclo finalizado y conservado como registro histórico.")
            st.json({"preguntas": len(json.loads(cycle["questions_json"])), "indicadores": len(json.loads(cycle["indicators_json"])), "respuestas": cycle["response_count"]})
    elif page == "Dashboard":
        snapshot = json.loads(cycle.get("snapshot_json") or "null")
        render_dashboard(snapshot or cycle_results(cycle))
    else:
        snapshot = json.loads(cycle.get("snapshot_json") or "null")
        results = snapshot or cycle_results(cycle)
        html = report_html(cycle, results)
        st.components.v1.html(html, height=900, scrolling=True)
        st.download_button("Descargar informe HTML", html, f"informe_ejecutivo_{cycle['period']}.html", "text/html")


mode = st.query_params.get("modo", "encuesta")
if mode == "admin":
    administration()
else:
    with st.sidebar:
        st.markdown("### Encuesta SSMOCC")
        st.caption("Acceso público y anónimo")
        st.link_button("Acceso administrativo", "?modo=admin")
    public_survey()

