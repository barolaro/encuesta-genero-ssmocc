from __future__ import annotations

import hashlib
import hmac
import html
import json
from collections import defaultdict
from pathlib import Path

import pandas as pd
import plotly.express as px
import streamlit as st

from indicator_engine import DEFAULT_INDICATORS, calculate
from storage import get_store


ROOT = Path(__file__).parent
DEFAULT_QUESTIONS = json.loads((ROOT / "data" / "questions.json").read_text(encoding="utf-8"))
LOGO_URL = "https://encuesta-genero-ssmocc.retamal-ingeniero.chatgpt.site/ssmocc-logo.png"

st.set_page_config(
    page_title="Encuesta Comunidad Funcionaria | SSMOCC",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
<style>
:root{--navy:#083b5c;--blue:#075f91;--cyan:#118db7;--red:#e52c3d;--ink:#102d42;--muted:#60788a;--line:#d5e1e8;--bg:#f2f6f8;--green:#19815d;--amber:#c47a0c}
html,body,[class*="css"]{font-family:Arial,Helvetica,sans-serif;color:var(--ink)}
[data-testid="stAppViewContainer"]{background:radial-gradient(circle at 100% 0,#e3f0f5 0,transparent 34%),var(--bg)}
[data-testid="stHeader"]{background:transparent}
.block-container{max-width:1220px;padding-top:1.5rem;padding-bottom:4rem}
.brandbar{display:flex;align-items:center;justify-content:space-between;padding:0 0 16px;border-bottom:1px solid #cfdae0;margin-bottom:28px}
.brandbar img{width:255px;height:82px;object-fit:contain;object-position:left center}
.brandname{font-weight:700;color:#102d42;font-size:17px}.brandsub{color:#1685ad;font-size:12px;font-weight:700;letter-spacing:.04em;margin-top:5px}
.hero{border-radius:17px;background:linear-gradient(125deg,#064e79,#0879a7);color:#fff;padding:55px 58px;box-shadow:0 20px 50px rgba(8,59,92,.16);position:relative;overflow:hidden}
.hero:after{content:"";position:absolute;width:360px;height:360px;border:70px solid rgba(255,255,255,.08);border-radius:50%;right:-145px;bottom:-220px}
.eyebrow{font-size:11px;letter-spacing:.18em;font-weight:800;text-transform:uppercase;color:#bfe9f4}
.hero h1{font-size:46px;line-height:1.03;margin:13px 0 18px;max-width:780px}.hero p{font-size:18px;line-height:1.55;max-width:760px}
.access-card,.panel,.question-card,.kpi,.report-sheet{background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 8px 24px rgba(17,51,72,.06)}
.access-card{padding:28px;height:100%}.access-card h3{margin:10px 0;color:var(--ink)}.access-card p{color:var(--muted);min-height:48px}
.icon{width:45px;height:45px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#e8f5f8;color:var(--blue);font-size:22px}
.section-head{background:linear-gradient(115deg,#064e79,#0879a7);color:white;padding:30px 36px;border-radius:13px;margin-bottom:18px}
.section-head h1{margin:7px 0 5px;font-size:34px}.section-head p{margin:0;color:#d4edf5}
.privacy{padding:15px 18px;border-left:4px solid var(--cyan);background:#e8f4f8;border-radius:5px;margin:18px 0;color:#24536a}
.progress-label{display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin:18px 0 7px}.progress{height:8px;background:#dce8ed;border-radius:10px;overflow:hidden}.progress span{display:block;height:100%;background:linear-gradient(90deg,var(--blue),var(--cyan));border-radius:10px}
.question-card{padding:24px 26px;margin:12px 0 18px;border-top:3px solid var(--cyan)}.qnum{color:var(--blue);font-size:11px;font-weight:800;letter-spacing:.13em}.qtext{font-size:18px;font-weight:700;line-height:1.35;margin:7px 0 14px}
.receipt{background:#fff;border:1px solid var(--line);border-radius:14px;padding:45px;text-align:center;max-width:750px;margin:50px auto;box-shadow:0 18px 45px rgba(8,59,92,.12)}
.check{width:60px;height:60px;border-radius:50%;background:var(--green);color:white;font-size:34px;line-height:60px;margin:auto}.code{border:1px dashed #7fa7b8;background:#f4f9fb;color:var(--blue);font-family:monospace;font-size:20px;font-weight:800;padding:20px;margin:25px 0}
.admin-title{display:flex;justify-content:space-between;align-items:flex-end;margin:8px 0 20px}.admin-title h1{margin:0;font-size:38px}.online{background:#edf8f3;color:#137653;border:1px solid #aedbc8;border-radius:30px;padding:8px 13px;font-size:12px;font-weight:700}
.kpi{padding:20px 20px 17px;border-top:3px solid var(--red)}.kpi small{font-size:10px;color:var(--muted);letter-spacing:.12em}.kpi strong{display:block;font-size:31px;margin:9px 0 7px}.kpi span{font-size:11px;color:var(--muted)}
.panel{padding:23px;margin-top:18px}.panel h3{margin:3px 0 15px}.cycle-card{padding:16px;border:1px solid var(--line);border-radius:8px;margin:9px 0;background:#f8fafb}.cycle-card.active{background:#e9f4f8;border-color:#4aa7c7;box-shadow:0 0 0 3px #d2eaf3}
.pill{display:inline-block;border-radius:20px;padding:4px 9px;font-size:10px;font-weight:700}.p-green{background:#e8f6ef;color:#147552}.p-amber{background:#fff3de;color:#9a5c00}.p-red{background:#fde9eb;color:#b32232}
.report-sheet{overflow:hidden;margin-top:18px}.report-cover{min-height:560px;padding:38px 55px;background:linear-gradient(120deg,#075989,#087caf);color:#fff;position:relative}.report-cover img{width:190px;background:white;border-radius:6px;padding:7px}.report-cover h1{font-size:58px;line-height:1.02;max-width:760px;margin:70px 0 20px}.report-body{padding:40px 55px}.report-body h2{color:var(--blue);border-bottom:2px solid var(--blue);padding-bottom:8px}.indicator-page{page-break-before:always;border-top:5px solid var(--blue);margin-top:35px;padding-top:25px}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:25px;margin-top:75px}.signature{text-align:center;border-top:1px solid #8398a5;padding-top:12px;font-size:12px}
[data-testid="stSidebar"]{background:#0a2e48;color:white}[data-testid="stSidebar"] label,[data-testid="stSidebar"] p{color:#e8f4f8!important}
div.stButton>button,div.stDownloadButton>button,.stLinkButton a{border-radius:7px;font-weight:700;min-height:42px}
div.stButton>button[kind="primary"],div.stDownloadButton>button[kind="primary"]{background:#0875ad;border-color:#0875ad}
@media(max-width:760px){.block-container{padding:1rem}.brandbar img{width:180px}.brandname{font-size:13px}.hero{padding:35px 25px}.hero h1{font-size:35px}.section-head{padding:25px 22px}.admin-title h1{font-size:30px}.report-cover h1{font-size:42px}.report-cover,.report-body{padding:30px 25px}.signatures{grid-template-columns:1fr}}
@media print{[data-testid="stSidebar"],[data-testid="stHeader"],.no-print{display:none!important}.block-container{max-width:none;padding:0}.report-sheet{border:0;box-shadow:none}.indicator-page{break-before:page}}
</style>
""",
    unsafe_allow_html=True,
)


@st.cache_resource
def store_resource():
    return get_store(st.secrets)


store, storage_label = store_resource()


def ensure_initial_cycle():
    if not store.list_cycles():
        cid = store.create_cycle("Encuesta Comunidad Funcionaria 2026", "2026", DEFAULT_QUESTIONS, DEFAULT_INDICATORS)
        store.activate_cycle(cid)


ensure_initial_cycle()


def brandbar():
    st.markdown(
        f'<div class="brandbar"><img src="{LOGO_URL}" alt="SSMOCC">'
        '<div><div class="brandname">Encuesta Comunidad Funcionaria</div>'
        '<div class="brandsub">SERVICIO DE SALUD METROPOLITANO OCCIDENTE</div></div></div>',
        unsafe_allow_html=True,
    )


def go(view: str):
    st.query_params["vista"] = view
    st.rerun()


def option_labels(question):
    return [str(x.get("etiqueta", "")).removeprefix("Respuestas ").strip() for x in question.get("opciones", [])]


def admin_credentials():
    try:
        return str(st.secrets["admin"]["username"]), str(st.secrets["admin"]["password"])
    except Exception:
        return "admin", ""


def landing():
    brandbar()
    st.markdown(
        """<section class="hero"><div class="eyebrow">Medición institucional 2026</div>
        <h1>Transversalización de género y conciliación</h1>
        <p>Plataforma institucional para responder la encuesta de forma anónima, visualizar indicadores en línea y mantener la trazabilidad histórica de cada ciclo.</p></section>""",
        unsafe_allow_html=True,
    )
    st.write("")
    c1, c2 = st.columns(2, gap="large")
    with c1:
        st.markdown('<div class="access-card"><div class="icon">✓</div><h3>Responder encuesta</h3><p>Acceso público, confidencial y sin identificación personal.</p></div>', unsafe_allow_html=True)
        if st.button("Comenzar encuesta", type="primary", use_container_width=True):
            go("encuesta")
    with c2:
        st.markdown('<div class="access-card"><div class="icon">▦</div><h3>Administración</h3><p>Gestión de ciclos, indicadores, dashboard e informe ejecutivo.</p></div>', unsafe_allow_html=True)
        if st.button("Ingresar al panel", use_container_width=True):
            go("admin")


def group_questions(questions):
    titles = [
        "Antecedentes generales", "Cultura organizacional", "Gestión de personas",
        "Ambiente laboral y vida libre de violencia", "Conciliación y corresponsabilidad",
        "Salud integral", "Infraestructura y cierre",
    ]
    size = max(1, (len(questions) + len(titles) - 1) // len(titles))
    return [(titles[i], questions[i * size:(i + 1) * size]) for i in range(len(titles)) if questions[i * size:(i + 1) * size]]


def public_survey():
    cycle = store.active_cycle()
    brandbar()
    if not cycle:
        st.info("La encuesta no se encuentra disponible en este momento.")
        if st.button("Volver al inicio"):
            go("inicio")
        return
    if st.session_state.get("receipt"):
        st.markdown(
            f'<div class="receipt"><div class="check">✓</div><div class="eyebrow" style="color:#075f91;margin-top:20px">RESPUESTA RECIBIDA</div>'
            '<h1>Gracias por participar</h1><p>Su respuesta fue registrada de manera anónima. No se almacenó su nombre, RUT ni correo electrónico.</p>'
            f'<div class="code"><small>COMPROBANTE ANÓNIMO</small><br>{html.escape(st.session_state.receipt)}</div>'
            '<small>Guarde este código únicamente como confirmación de envío.</small></div>',
            unsafe_allow_html=True,
        )
        if st.button("Volver al inicio", use_container_width=True):
            del st.session_state["receipt"]
            go("inicio")
        return

    questions = json.loads(cycle["questions_json"])
    sections = group_questions(questions)
    step = min(int(st.session_state.get("survey_step", 0)), len(sections) - 1)
    title, current = sections[step]
    pct = round((step / len(sections)) * 100)
    st.markdown(
        f'<div class="section-head"><div class="eyebrow">ENCUESTA ANÓNIMA · {html.escape(str(cycle["period"]))}</div>'
        f'<h1>{html.escape(cycle["name"])}</h1><p>{step + 1:02d}. {html.escape(title)}</p></div>',
        unsafe_allow_html=True,
    )
    st.markdown('<div class="privacy"><b>Participación confidencial.</b> No se solicita nombre, RUT ni correo electrónico. Los resultados con una base inferior a cinco casos se protegen.</div>', unsafe_allow_html=True)
    st.markdown(f'<div class="progress-label"><span>Sección {step + 1} de {len(sections)}</span><b>{pct}% completado</b></div><div class="progress"><span style="width:{pct}%"></span></div>', unsafe_allow_html=True)

    section_answers = {}
    with st.form(f"section-{step}"):
        for local_index, question in enumerate(current, 1):
            code = question["codigo"]
            global_index = questions.index(question) + 1
            st.markdown(f'<div class="question-card"><div class="qnum">PREGUNTA {global_index:02d} · {html.escape(code)}</div><div class="qtext">{html.escape(question["texto"])}</div>', unsafe_allow_html=True)
            options = option_labels(question)
            if question["tipo"] == "unica":
                section_answers[code] = st.radio("Seleccione una alternativa", ["— Seleccione —", *options], key=f"ans-{code}", label_visibility="collapsed")
            elif question["tipo"] == "multiple":
                section_answers[code] = st.multiselect("Seleccione todas las alternativas que correspondan", options, key=f"ans-{code}", label_visibility="collapsed")
            else:
                matrix = {}
                for item in question.get("items", []):
                    matrix[item] = st.radio(item, ["— Seleccione —", *options], horizontal=True, key=f"ans-{code}-{hashlib.md5(item.encode()).hexdigest()}")
                section_answers[code] = matrix
            st.markdown("</div>", unsafe_allow_html=True)
        prev, nxt = st.columns([1, 2])
        back = prev.form_submit_button("← Anterior", use_container_width=True, disabled=step == 0)
        next_label = "Revisar y enviar →" if step == len(sections) - 1 else "Continuar →"
        forward = nxt.form_submit_button(next_label, type="primary", use_container_width=True)

    if back:
        st.session_state.survey_step = max(0, step - 1)
        st.rerun()
    if forward:
        missing = []
        for q in current:
            value = section_answers.get(q["codigo"])
            valid = all(v != "— Seleccione —" for v in value.values()) if isinstance(value, dict) else bool(value and value != "— Seleccione —")
            if not valid:
                missing.append(q["codigo"])
        if missing:
            st.error("Complete las preguntas pendientes: " + ", ".join(missing))
        else:
            saved = st.session_state.setdefault("survey_answers", {})
            saved.update(section_answers)
            if step < len(sections) - 1:
                st.session_state.survey_step = step + 1
                st.rerun()
            else:
                st.session_state.show_review = True

    if st.session_state.get("show_review"):
        st.markdown('<div class="panel"><div class="eyebrow" style="color:#075f91">ENVÍO FINAL</div><h3>Revise y confirme</h3><p>Al enviar, sus respuestas quedarán registradas de forma anónima y no podrán modificarse.</p></div>', unsafe_allow_html=True)
        accepted = st.checkbox("Confirmo que revisé mis respuestas y deseo enviarlas.")
        if st.button("Enviar encuesta", type="primary", use_container_width=True):
            if not accepted:
                st.error("Debe confirmar el envío.")
            else:
                try:
                    st.session_state.receipt = store.add_response(str(cycle["id"]), st.session_state["survey_answers"])
                    for key in ["survey_answers", "survey_step", "show_review"]:
                        st.session_state.pop(key, None)
                    st.rerun()
                except Exception as exc:
                    st.error(f"No fue posible guardar la respuesta: {exc}")


def cycle_results(cycle):
    return calculate(json.loads(cycle["indicators_json"]), store.responses(str(cycle["id"])))


def status_badge(status):
    cls = {"Positivo": "p-green", "Intermedio": "p-amber", "Negativo": "p-red"}.get(status, "p-amber")
    return f'<span class="pill {cls}">{html.escape(status)}</span>'


def render_dashboard(results):
    s = results["summary"]
    values = [
        ("RESPUESTAS", results["response_count"], "Encuestas registradas"),
        ("INDICADORES POSITIVOS", s["positive"], "Resultado superior a 70%"),
        ("EN OBSERVACIÓN", s["intermediate"], "Resultado entre 50% y 70%"),
        ("NUDOS CRÍTICOS", s["negative"], "Resultado inferior a 50%"),
    ]
    cols = st.columns(4)
    for col, (label, value, note) in zip(cols, values):
        col.markdown(f'<div class="kpi"><small>{label}</small><strong>{value}</strong><span>{note}</span></div>', unsafe_allow_html=True)
    frame = pd.DataFrame(results["indicators"])
    if frame.empty:
        st.info("No existen indicadores configurados.")
        return
    left, right = st.columns([1.7, 1], gap="large")
    with left:
        st.markdown('<div class="panel"><div class="eyebrow" style="color:#075f91">INDICADORES DE ENCUESTA</div><h3>Resultados calculados</h3>', unsafe_allow_html=True)
        selected = st.selectbox("Abrir indicador", frame.apply(lambda x: f"{x['code']} · {x['name']}", axis=1).tolist())
        row = frame[frame.apply(lambda x: f"{x['code']} · {x['name']}" == selected, axis=1)].iloc[0]
        table = frame[["code", "name", "dimension", "value", "base", "status"]].rename(columns={"code":"Código","name":"Indicador","dimension":"Dimensión","value":"Resultado (%)","base":"Base","status":"Estado"})
        st.dataframe(table, use_container_width=True, hide_index=True, height=430)
        st.markdown("</div>", unsafe_allow_html=True)
    with right:
        dim = frame.dropna(subset=["value"]).groupby("dimension", as_index=False)["value"].mean().sort_values("value")
        st.markdown('<div class="panel"><div class="eyebrow" style="color:#075f91">VISTA TRANSVERSAL</div><h3>Avance por dimensión</h3>', unsafe_allow_html=True)
        if not dim.empty:
            fig = px.bar(dim, x="value", y="dimension", orientation="h", color_discrete_sequence=["#138eb8"], labels={"value":"Resultado (%)","dimension":""})
            fig.update_layout(height=430, margin=dict(l=5,r=10,t=10,b=25), plot_bgcolor="white", paper_bgcolor="white", showlegend=False)
            st.plotly_chart(fig, use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)
    st.markdown(f'<div class="panel"><div class="eyebrow" style="color:#075f91">DETALLE DEL INDICADOR</div><h3>{html.escape(row["code"])} · {html.escape(row["name"])}</h3><p><b>Dimensión:</b> {html.escape(row["dimension"])}</p><p><b>Resultado:</b> {"Protegido por base mínima" if row["value"] is None else str(row["value"])+"%"} &nbsp; {status_badge(row["status"])}</p><p>Este indicador sintetiza las respuestas asociadas a la dimensión señalada. Su lectura debe considerar la base de {row["base"]} respuestas válidas y, cuando corresponda, complementarse con análisis cualitativo y comparación metodológicamente equivalente.</p></div>', unsafe_allow_html=True)


def report_html(cycle, results):
    indicators = results["indicators"]
    valid = [x for x in indicators if x["value"] is not None]
    strengths = sorted(valid, key=lambda x: x["value"], reverse=True)[:3]
    gaps = sorted(valid, key=lambda x: x["value"])[:3]
    pages = ""
    for item in indicators:
        result = "Protegido por base mínima" if item["value"] is None else f'{item["value"]}%'
        pages += (
            f'<section class="indicator-page"><div class="eyebrow" style="color:#075f91">FICHA DE INDICADOR · {html.escape(item["code"])}</div>'
            f'<h2>{html.escape(item["name"])}</h2><p><b>Dimensión:</b> {html.escape(item["dimension"])}</p>'
            f'<div class="kpi"><small>RESULTADO GENERAL</small><strong>{result}</strong><span>Base: {item["base"]} respuestas válidas · Estado: {html.escape(item["status"])}</span></div>'
            '<h3>Interpretación</h3><p>El resultado representa la proporción favorable observada en las preguntas vinculadas a este indicador. '
            'Debe interpretarse junto con el tamaño de la base y el contexto institucional. Las bases inferiores a cinco casos se mantienen protegidas.</p>'
            '<h3>Orientación para la gestión</h3><p>Se recomienda revisar las prácticas asociadas, documentar acciones de mejora y mantener seguimiento en el próximo ciclo. '
            'La comparación histórica solo debe realizarse cuando la definición, pregunta y método de cálculo sean equivalentes.</p></section>'
        )
    strength_text = "".join(f"<li><b>{html.escape(x['code'])}</b> · {html.escape(x['name'])}: {x['value']}%</li>" for x in strengths) or "<li>Sin base suficiente.</li>"
    gap_text = "".join(f"<li><b>{html.escape(x['code'])}</b> · {html.escape(x['name'])}: {x['value']}%</li>" for x in gaps) or "<li>Sin base suficiente.</li>"
    return f"""<!doctype html><html lang="es"><head><meta charset="utf-8"><style>{CSS_REPORT}</style></head><body>
    <article class="report-sheet"><section class="report-cover"><img src="{LOGO_URL}"><div class="eyebrow" style="margin-top:45px">INFORME EJECUTIVO · {html.escape(str(cycle["period"]))}</div>
    <h1>Diagnóstico de transversalización de género</h1><p>Sistema de Gestión de Igualdad de Género y Conciliación de la Vida Laboral, Familiar y Personal</p>
    <p style="position:absolute;bottom:35px;border-top:1px solid #75b7d0;padding-top:15px;width:85%">NCh3262:2021 · Resultados de la medición institucional</p></section>
    <section class="report-body"><h2>Resumen ejecutivo</h2><p>La medición registra <b>{results["response_count"]} respuestas anónimas</b>. Se identifican {results["summary"]["positive"]} fortalezas, {results["summary"]["intermediate"]} indicadores en observación y {results["summary"]["negative"]} nudos críticos.</p>
    <h2>Principales fortalezas</h2><ul>{strength_text}</ul><h2>Brechas prioritarias</h2><ul>{gap_text}</ul>
    <h2>Criterio de lectura</h2><p>Los resultados describen el ciclo seleccionado. Las variaciones entre ciclos son comparables solo cuando se conserva la definición del indicador, sus preguntas y el método de cálculo.</p>
    {pages}<section class="indicator-page"><h2>Responsables del informe</h2><div class="signatures">
    <div class="signature"><b>María José Rivas González</b><br>Jefa<br>Departamento de Género y Derechos Humanos</div>
    <div class="signature"><b>Angélica Álvarez Alarcón</b><br>Tecnóloga Médica<br>Departamento de Género y Derechos Humanos</div>
    <div class="signature"><b>Angela Aguilera Flores</b><br>Matrona<br>Departamento de Género y Derechos Humanos</div></div></section></section></article></body></html>"""


CSS_REPORT = """
body{font-family:Arial;color:#18384a;margin:0;background:#f2f6f8}.report-sheet{max-width:1080px;margin:auto;background:white}
.report-cover{min-height:650px;padding:45px 65px;background:linear-gradient(120deg,#075989,#087caf);color:white;position:relative;box-sizing:border-box}
.report-cover img{width:190px;background:white;border-radius:6px;padding:7px}.report-cover h1{font-size:58px;line-height:1.02;max-width:760px;margin:70px 0 20px}
.report-body{padding:45px 65px}.report-body h2{color:#075f91;border-bottom:2px solid #075f91;padding-bottom:8px}.eyebrow{font-size:11px;letter-spacing:.18em;font-weight:800}
.kpi{padding:20px;border:1px solid #d5e1e8;border-top:4px solid #e52c3d;margin:20px 0}.kpi small{font-size:10px;color:#60788a}.kpi strong{display:block;font-size:34px;margin:7px 0}
.indicator-page{page-break-before:always;border-top:5px solid #075f91;margin-top:50px;padding-top:30px;min-height:620px}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:25px;margin-top:100px}.signature{text-align:center;border-top:1px solid #8398a5;padding-top:12px;font-size:12px}
@media print{body{background:white}.report-sheet{max-width:none}.indicator-page{break-before:page}}
"""


def config_editor(cycle):
    questions = json.loads(cycle["questions_json"])
    indicators = json.loads(cycle["indicators_json"])
    q_rows = [{"codigo":x["codigo"],"texto":x["texto"],"tipo":x["tipo"],"opciones":" | ".join(option_labels(x)),"items":" | ".join(x.get("items",[]))} for x in questions]
    i_rows = [{k:x.get(k,"") for k in ["code","name","dimension","question","kind","item","inverse"]} for x in indicators]
    st.subheader("Editor de preguntas")
    q_edit = st.data_editor(pd.DataFrame(q_rows), num_rows="dynamic", use_container_width=True, key=f"q-{cycle['id']}")
    st.subheader("Editor de indicadores")
    i_edit = st.data_editor(pd.DataFrame(i_rows), num_rows="dynamic", use_container_width=True, key=f"i-{cycle['id']}")
    if st.button("Guardar configuración", type="primary"):
        new_q = []
        for row in q_edit.fillna("").to_dict("records"):
            new_q.append({"codigo":str(row["codigo"]).strip(),"texto":str(row["texto"]).strip(),"tipo":str(row["tipo"]).strip(),"opciones":[{"etiqueta":x.strip()} for x in str(row["opciones"]).split("|") if x.strip()],"items":[x.strip() for x in str(row["items"]).split("|") if x.strip()]})
        new_i = []
        for row in i_edit.fillna("").to_dict("records"):
            item = {k:row[k] for k in ["code","name","dimension","question","kind"] if str(row.get(k,"")).strip()}
            if str(row.get("item","")).strip():
                item["item"] = int(float(row["item"]))
            item["inverse"] = bool(row.get("inverse",False))
            new_i.append(item)
        store.save_config(str(cycle["id"]), new_q, new_i)
        st.success("Configuración guardada.")
        st.rerun()


def login():
    brandbar()
    st.markdown('<div class="section-head"><div class="eyebrow">ACCESO PROTEGIDO</div><h1>Administración</h1><p>Gestión institucional de la encuesta y sus resultados</p></div>', unsafe_allow_html=True)
    left, center, right = st.columns([1, 1.2, 1])
    with center:
        with st.form("login"):
            user = st.text_input("Usuario")
            password = st.text_input("Contraseña", type="password")
            submitted = st.form_submit_button("Ingresar", type="primary", use_container_width=True)
        if submitted:
            configured_user, configured_password = admin_credentials()
            if not configured_password:
                st.error("Falta configurar la contraseña en los secretos de Streamlit.")
            elif hmac.compare_digest(user, configured_user) and hmac.compare_digest(password, configured_password):
                st.session_state.admin_authenticated = True
                st.rerun()
            else:
                st.error("Usuario o contraseña incorrectos.")
        if st.button("← Volver al inicio", use_container_width=True):
            go("inicio")


def administration():
    if not st.session_state.get("admin_authenticated"):
        login()
        return
    with st.sidebar:
        st.markdown(f'<img src="{LOGO_URL}" style="width:100%;background:white;padding:8px;border-radius:6px;margin:8px 0 20px">', unsafe_allow_html=True)
        page = st.radio("NAVEGACIÓN", ["Inicio", "Ciclos y autogestión", "Dashboard de indicadores", "Informe ejecutivo"])
        st.caption(f"Almacenamiento: {storage_label}")
        if st.button("Cerrar sesión", use_container_width=True):
            st.session_state.admin_authenticated = False
            st.rerun()
    st.markdown('<div class="admin-title"><div><div class="eyebrow" style="color:#075f91">PANEL ADMINISTRATIVO</div><h1>Gestión institucional</h1><p>Encuesta Comunidad Funcionaria</p></div><span class="online">● Datos en línea</span></div>', unsafe_allow_html=True)
    cycles = store.list_cycles()
    if page == "Inicio":
        active = store.active_cycle()
        st.markdown(f'<div class="panel"><div class="eyebrow" style="color:#075f91">ESTADO GENERAL</div><h3>{"Ciclo activo: " + html.escape(active["name"]) if active else "No existe un ciclo activo"}</h3><p>Desde este panel puede administrar ciclos, revisar indicadores y generar el informe ejecutivo.</p></div>', unsafe_allow_html=True)
        if cycles:
            st.dataframe(pd.DataFrame(cycles)[["name","period","status","response_count"]].rename(columns={"name":"Ciclo","period":"Período","status":"Estado","response_count":"Respuestas"}), use_container_width=True, hide_index=True)
        return
    labels = {f"{x['name']} · {x['status']} · {x['response_count']} respuestas":x for x in cycles}
    selected = st.selectbox("Ciclo de medición", list(labels))
    cycle = labels[selected]
    if page == "Ciclos y autogestión":
        left, right = st.columns([1,2.2], gap="large")
        with left:
            st.markdown('<div class="panel"><div class="eyebrow" style="color:#075f91">HISTÓRICO</div><h3>Ciclos de medición</h3>', unsafe_allow_html=True)
            for item in cycles:
                st.markdown(f'<div class="cycle-card{" active" if item["id"]==cycle["id"] else ""}"><b>{html.escape(item["name"])}</b><br><small>{html.escape(str(item["period"]))} · {item["response_count"]} respuestas · {html.escape(item["status"])}</small></div>', unsafe_allow_html=True)
            st.markdown("</div>", unsafe_allow_html=True)
        with right:
            st.markdown(f'<div class="panel"><div class="eyebrow" style="color:#075f91">{html.escape(cycle["status"].upper())}</div><h3>{html.escape(cycle["name"])}</h3><p>{len(json.loads(cycle["questions_json"]))} preguntas · {len(json.loads(cycle["indicators_json"]))} indicadores · {cycle["response_count"]} respuestas</p></div>', unsafe_allow_html=True)
            if cycle["status"] == "Borrador":
                c1,c2 = st.columns(2)
                if c1.button("Activar ciclo", type="primary", use_container_width=True):
                    store.activate_cycle(str(cycle["id"])); st.rerun()
                if c2.button("Eliminar borrador", use_container_width=True):
                    store.delete_draft(str(cycle["id"])); st.rerun()
                config_editor(cycle)
            elif cycle["status"] == "Activo":
                st.info("La configuración está congelada para proteger las respuestas recibidas.")
                if st.button("Finalizar ciclo", type="primary"):
                    store.finalize_cycle(str(cycle["id"]), cycle_results(cycle)); st.rerun()
            else:
                st.success("Ciclo finalizado y conservado como registro histórico.")
        with st.expander("Crear un nuevo ciclo"):
            with st.form("new-cycle"):
                name = st.text_input("Nombre del ciclo", placeholder="Ej.: Encuesta Comunidad Funcionaria 2027")
                period = st.text_input("Período o año", placeholder="2027")
                mode = st.radio("Configuración inicial", ["Copiar ciclo seleccionado", "Comenzar desde cero"])
                create = st.form_submit_button("Crear borrador", type="primary")
            if create:
                q = json.loads(cycle["questions_json"]) if mode.startswith("Copiar") else []
                i = json.loads(cycle["indicators_json"]) if mode.startswith("Copiar") else []
                store.create_cycle(name, period, q, i); st.rerun()
    elif page == "Dashboard de indicadores":
        st.markdown(f'<div class="section-head"><div class="eyebrow">MEDICIÓN {html.escape(str(cycle["period"]))}</div><h1>Dashboard de indicadores</h1><p>Se actualiza automáticamente con cada encuesta recibida.</p></div>', unsafe_allow_html=True)
        snapshot = json.loads(cycle.get("snapshot_json") or "null")
        render_dashboard(snapshot or cycle_results(cycle))
    else:
        snapshot = json.loads(cycle.get("snapshot_json") or "null")
        results = snapshot or cycle_results(cycle)
        report = report_html(cycle, results)
        st.markdown('<div class="section-head"><div class="eyebrow">INFORME AUTOMÁTICO</div><h1>Informe ejecutivo</h1><p>Cada indicador incluye resultado, interpretación y orientación para la gestión.</p></div>', unsafe_allow_html=True)
        st.components.v1.html(report, height=1100, scrolling=True)
        st.download_button("Descargar informe HTML", report, f"informe_ejecutivo_{cycle['period']}.html", "text/html", type="primary")


view = st.query_params.get("vista", "inicio")
if view == "admin":
    administration()
elif view == "encuesta":
    public_survey()
else:
    landing()
