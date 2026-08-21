"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FilePlus2,
  ImagePlus,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Plus,
  Pencil,
  Upload,
  Send,
  Settings2,
  UsersRound,
} from "lucide-react";
import { SSMOCC_ESTABLISHMENTS, type InstitutionSettings } from "@/config/institution";
import type { SurveySection } from "@/config/survey";
import type { SurveyAnalysis } from "@/lib/survey-analysis";

type Survey = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  units: string[];
  sections: SurveySection[];
};
type ResponseRow = {
  id: string;
  anonymousCode: string;
  unit: string;
  responses: Record<string, unknown>;
  createdAt: string;
};
type Overview = {
  surveys: Survey[];
  responses: ResponseRow[];
  metrics: { total: number; surveys: number; active: number; units: number };
  byUnit: Record<string, number>;
  byDay: Record<string, number>;
  analysis: SurveyAnalysis;
};
const statusLabel: Record<string, string> = {
  draft: "Borrador",
  published: "Activa",
  closed: "Cerrada",
};

function Login({ done, institution }: { done: () => void; institution: InstitutionSettings }) {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (r.ok) done();
    else setError("La clave ingresada no es correcta.");
  };
  return (
    <main className="admin-login">
      <section className="login-brand">
        <div className="login-logos">
          <img src={institution.networkLogoUrl} alt={institution.networkName} />
          <span><img src={institution.logoUrl} alt={institution.institutionName} /></span>
        </div>
        <div>
          <span>Gestión institucional</span>
          <h1>
            Encuestas con propósito.
            <br />
            Decisiones con evidencia.
          </h1>
          <p>
            Un espacio seguro para escuchar, comprender y avanzar hacia una
            comunidad funcionaria más inclusiva.
          </p>
        </div>
      </section>
      <form className="login-card" onSubmit={submit}>
        <div className="login-icon">
          <LockKeyhole />
        </div>
        <span className="mini-label">Acceso restringido</span>
        <h2>Portal de administración</h2>
        <p>
          Ingresa con la clave de administración configurada para este sistema.
        </p>
        <label>
          Clave de acceso
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            autoFocus
          />
        </label>
        {error && <div className="admin-error">{error}</div>}
        <button disabled={busy}>
          {busy ? "Verificando…" : "Ingresar al panel"}
        </button>
        <a href="/">← Volver a la encuesta</a>
      </form>
    </main>
  );
}

function NewSurvey({ close, saved, institution }: { close: () => void; saved: () => void; institution: InstitutionSettings }) {
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [sectionTitle, setSectionTitle] = useState("Experiencia y percepción"),
    [questions, setQuestions] = useState([
      {
        id: "q1",
        type: "likert",
        title: "En mi unidad se promueve un trato respetuoso",
        required: true,
        rows: ["La afirmación representa mi experiencia"],
      },
    ]),
    [error, setError] = useState("");
  const add = () =>
    setQuestions((q) => [
      ...q,
      {
        id: `q${Date.now()}`,
        type: "single",
        title: "Nueva pregunta",
        required: false,
        options: ["Alternativa 1", "Alternativa 2"],
      } as never,
    ]);
  const save = async () => {
    const r = await fetch("/api/admin/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        units: institution.units,
        sections: [
          {
            id: "seccion-1",
            eyebrow: "Sección 1",
            title: sectionTitle,
            description: "",
            questions,
          },
        ],
      }),
    });
    if (!r.ok) {
      const b = await r.json();
      return setError(b.error);
    }
    saved();
  };
  return (
    <div className="modal-backdrop">
      <section className="builder-modal">
        <header>
          <div>
            <span className="mini-label">Constructor modular</span>
            <h2>Nueva encuesta</h2>
          </div>
          <button className="icon-button" onClick={close}>
            ×
          </button>
        </header>
        <div className="builder-body">
          <label>
            Título de la encuesta
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Encuesta de clima y equidad 2026"
            />
          </label>
          <label>
            Descripción
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explica brevemente el propósito…"
            />
          </label>
          <div className="builder-section">
            <label>
              Nombre de la primera sección
              <input
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
              />
            </label>
            {questions.map((q, i) => (
              <div className="builder-question" key={q.id}>
                <span>{i + 1}</span>
                <input
                  value={q.title}
                  onChange={(e) =>
                    setQuestions((list) =>
                      list.map((x, n) =>
                        n === i ? { ...x, title: e.target.value } : x,
                      ),
                    )
                  }
                />
                <select
                  value={q.type}
                  onChange={(e) =>
                    setQuestions((list) =>
                      list.map((x, n) =>
                        n === i ? { ...x, type: e.target.value } : x,
                      ),
                    )
                  }
                >
                  <option value="single">Selección única</option>
                  <option value="multiple">Selección múltiple</option>
                  <option value="dichotomous">Sí / No</option>
                  <option value="likert">Escala Likert</option>
                  <option value="text">Texto libre</option>
                </select>
              </div>
            ))}
            <button className="ghost-button" onClick={add}>
              <Plus size={17} /> Agregar pregunta
            </button>
          </div>
          {error && <div className="admin-error">{error}</div>}
        </div>
        <footer>
          <button className="ghost-button" onClick={close}>
            Cancelar
          </button>
          <button className="solid-button" onClick={save}>
            <FilePlus2 size={17} /> Guardar borrador
          </button>
        </footer>
      </section>
    </div>
  );
}

function EditSurvey({
  survey,
  close,
  saved,
}: {
  survey: Survey;
  close: () => void;
  saved: () => void;
}) {
  const [title, setTitle] = useState(survey.title),
    [description, setDescription] = useState(survey.description),
    [sections, setSections] = useState<SurveySection[]>(
      structuredClone(survey.sections),
    ),
    [error, setError] = useState("");
  const save = async () => {
    const r = await fetch("/api/admin/surveys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: survey.id,
        title,
        description,
        sections,
        units: survey.units,
      }),
    });
    if (!r.ok) {
      const b = await r.json();
      return setError(b.error || "No fue posible guardar los cambios");
    }
    saved();
  };
  return (
    <div className="modal-backdrop">
      <section className="builder-modal">
        <header>
          <div>
            <span className="mini-label">Edición de plantilla</span>
            <h2>Modificar encuesta</h2>
          </div>
          <button className="icon-button" onClick={close}>
            ×
          </button>
        </header>
        <div className="builder-body">
          <label>
            Título de la encuesta
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label>
            Descripción
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          {sections.map((section, si) => (
            <div className="builder-section" key={section.id}>
              <label>
                Sección {si + 1}
                <input
                  value={section.title}
                  onChange={(e) =>
                    setSections((current) =>
                      current.map((s, i) =>
                        i === si ? { ...s, title: e.target.value } : s,
                      ),
                    )
                  }
                />
              </label>
              {section.questions.map((question, qi) => (
                <div className="builder-question" key={question.id}>
                  <span>{qi + 1}</span>
                  <input
                    value={question.title}
                    onChange={(e) =>
                      setSections((current) =>
                        current.map((s, i) =>
                          i === si
                            ? {
                                ...s,
                                questions: s.questions.map((q, n) =>
                                  n === qi
                                    ? { ...q, title: e.target.value }
                                    : q,
                                ),
                              }
                            : s,
                        ),
                      )
                    }
                  />
                  <select value={question.type} disabled>
                    <option value="single">Selección única</option>
                    <option value="multiple">Selección múltiple</option>
                    <option value="dichotomous">Sí / No</option>
                    <option value="likert">Escala Likert</option>
                    <option value="text">Texto libre</option>
                  </select>
                </div>
              ))}
            </div>
          ))}
          {error && <div className="admin-error">{error}</div>}
        </div>
        <footer>
          <button className="ghost-button" onClick={close}>
            Cancelar
          </button>
          <button className="solid-button" onClick={save}>
            <Pencil size={17} /> Guardar cambios
          </button>
        </footer>
      </section>
    </div>
  );
}

export function AdminPortal({
  authenticated,
  initialInstitution,
}: {
  authenticated: boolean;
  initialInstitution: InstitutionSettings;
}) {
  const [logged, setLogged] = useState(authenticated),
    [institution, setInstitution] = useState(initialInstitution),
    [identityDraft, setIdentityDraft] = useState(initialInstitution),
    [unitsText, setUnitsText] = useState(initialInstitution.units.join("\n")),
    [identityBusy, setIdentityBusy] = useState(false),
    [identityMessage, setIdentityMessage] = useState(""),
    [data, setData] = useState<Overview | null>(null),
    [view, setView] = useState("resumen"),
    [creating, setCreating] = useState(false),
    [editing, setEditing] = useState<Survey | null>(null),
    [error, setError] = useState("");
  const selectLogo = (file?: File) => {
    setIdentityMessage("");
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
      return setIdentityMessage("Usa un logo PNG, JPG o WEBP.");
    if (file.size > 750_000)
      return setIdentityMessage("El logo debe pesar menos de 750 KB.");
    const reader = new FileReader();
    reader.onload = () =>
      setIdentityDraft((current) => ({ ...current, logoUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };
  const saveIdentity = async () => {
    setIdentityBusy(true);
    setIdentityMessage("");
    const units = unitsText.split("\n").map((unit) => unit.trim()).filter(Boolean);
    const response = await fetch("/api/admin/institution", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...identityDraft, units }),
    });
    const body = await response.json();
    setIdentityBusy(false);
    if (!response.ok)
      return setIdentityMessage(body.error || "No fue posible guardar la identidad.");
    const updated = { ...identityDraft, units };
    setInstitution(updated);
    setIdentityDraft(updated);
    setIdentityMessage("Identidad actualizada. La encuesta pública ya muestra este establecimiento.");
  };
  const load = async () => {
    const r = await fetch("/api/admin/overview");
    if (r.status === 401) return setLogged(false);
    if (!r.ok)
      return setError("Configura la base de datos para activar el panel.");
    setData(await r.json());
  };
  useEffect(() => {
    if (logged) load();
  }, [logged]);
  const maxUnit = useMemo(
    () => Math.max(1, ...Object.values(data?.byUnit || {})),
    [data],
  );
  const publish = async (id: string, status: string) => {
    await fetch("/api/admin/surveys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  };
  const importBaseSurvey = async () => {
    setError("");
    const r = await fetch("/api/admin/surveys/template", { method: "POST" });
    if (!r.ok) {
      const body = await r.json();
      return setError(body.error || "No fue posible cargar la encuesta base.");
    }
    await load();
    setView("encuestas");
  };
  const exportCsv = () => {
    if (!data) return;
    const rows = [
      ["Código anónimo", "Unidad", "Fecha", "Respuestas JSON"],
      ...data.responses.map((r) => [
        r.anonymousCode,
        r.unit,
        r.createdAt,
        JSON.stringify(r.responses),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";"),
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }),
    );
    a.download = "resultados_encuesta.csv";
    a.click();
  };
  const exportExcel = () => {
    window.location.href = "/api/admin/reports/excel";
  };
  if (!logged) return <Login institution={institution} done={() => setLogged(true)} />;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="sidebar-logos">
          <img src={institution.networkLogoUrl} alt={institution.networkShortName} />
          <span><img src={institution.logoUrl} alt={institution.shortName} /></span>
        </div>
        <div className="admin-product">
          <span>Plataforma institucional</span>
          <strong>
            Escucha<span>+</span>
          </strong>
        </div>
        <nav>
          <button
            className={view === "resumen" ? "active" : ""}
            onClick={() => setView("resumen")}
          >
            <LayoutDashboard /> Resumen ejecutivo
          </button>
          <button
            className={view === "encuestas" ? "active" : ""}
            onClick={() => setView("encuestas")}
          >
            <ClipboardList /> Encuestas
          </button>
          <button
            className={view === "resultados" ? "active" : ""}
            onClick={() => setView("resultados")}
          >
            <BarChart3 /> Resultados e informes
          </button>
          <button
            className={view === "identidad" ? "active" : ""}
            onClick={() => setView("identidad")}
          >
            <Settings2 /> Identidad del establecimiento
          </button>
        </nav>
        <div className="sidebar-bottom">
          <a href="/">
            <UsersRound /> Ver encuesta pública
          </a>
          <button
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              setLogged(false);
            }}
          >
            <LogOut /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-top">
          <div>
            <span className="mini-label">Administración</span>
            <h1>
              {view === "resumen"
                ? "Resumen ejecutivo"
                : view === "encuestas"
                  ? "Gestión de encuestas"
                  : view === "resultados"
                    ? "Resultados e informes"
                    : "Identidad del establecimiento"}
            </h1>
          </div>
          {view !== "identidad" && (
            <div className="admin-top-actions">
              <button className="ghost-button" onClick={importBaseSurvey}>
                <Upload /> Cargar encuesta base
              </button>
              <button className="solid-button" onClick={() => setCreating(true)}>
                <Plus /> Nueva encuesta
              </button>
            </div>
          )}
        </header>
        {error && <div className="admin-error">{error}</div>}
        {view === "resumen" && (
          <>
            <section className="metric-grid">
              <article>
                <span>
                  <UsersRound />
                </span>
                <div>
                  <small>Participaciones</small>
                  <strong>{data?.metrics.total || 0}</strong>
                  <p>Respuestas anónimas registradas</p>
                </div>
              </article>
              <article>
                <span>
                  <ClipboardList />
                </span>
                <div>
                  <small>Encuestas creadas</small>
                  <strong>{data?.metrics.surveys || 0}</strong>
                  <p>{data?.metrics.active || 0} actualmente activa</p>
                </div>
              </article>
              <article>
                <span>
                  <Activity />
                </span>
                <div>
                  <small>Cobertura</small>
                  <strong>{data?.metrics.units || 0}</strong>
                  <p>Unidades con participación</p>
                </div>
              </article>
            </section>
            <section className="admin-grid">
              <article className="panel-card wide">
                <header>
                  <div>
                    <span className="mini-label">Participación</span>
                    <h2>Respuestas por unidad</h2>
                  </div>
                  <BarChart3 />
                </header>
                <div className="unit-bars">
                  {Object.entries(data?.byUnit || {})
                    .sort((a, b) => b[1] - a[1])
                    .map(([unit, count]) => (
                      <div key={unit}>
                        <div>
                          <span>{unit}</span>
                          <strong>{count}</strong>
                        </div>
                        <i>
                          <b style={{ width: `${(count / maxUnit) * 100}%` }} />
                        </i>
                      </div>
                    ))}
                  {!Object.keys(data?.byUnit || {}).length && (
                    <p className="empty-state">
                      Aún no hay respuestas. La participación aparecerá aquí en
                      tiempo real.
                    </p>
                  )}
                </div>
              </article>
              <article className="panel-card">
                <header>
                  <div>
                    <span className="mini-label">Estado</span>
                    <h2>Encuestas recientes</h2>
                  </div>
                </header>
                {data?.surveys.slice(0, 4).map((s) => (
                  <div className="survey-mini" key={s.id}>
                    <span className={`status ${s.status}`}>
                      {statusLabel[s.status]}
                    </span>
                    <strong>{s.title}</strong>
                    <small>
                      {new Date(s.createdAt).toLocaleDateString("es-CL")}
                    </small>
                  </div>
                ))}
                {!data?.surveys.length && (
                  <p className="empty-state">
                    Crea la primera encuesta desde el botón superior.
                  </p>
                )}
              </article>
            </section>
          </>
        )}
        {view === "encuestas" && (
          <section className="panel-card">
            <div className="table-head">
              <span>Encuesta</span>
              <span>Estado</span>
              <span>Creación</span>
              <span>Acción</span>
            </div>
            {data?.surveys.map((s) => (
              <div className="survey-row" key={s.id}>
                <div>
                  <strong>{s.title}</strong>
                  <small>{s.description || "Sin descripción"}</small>
                </div>
                <span className={`status ${s.status}`}>
                  {statusLabel[s.status]}
                </span>
                <span>{new Date(s.createdAt).toLocaleDateString("es-CL")}</span>
                <div className="survey-actions">
                  <button onClick={() => setEditing(s)}>
                    <Pencil /> Editar
                  </button>
                  {s.status !== "published" ? (
                    <button onClick={() => publish(s.id, "published")}>
                      <Send /> Publicar
                    </button>
                  ) : (
                    <button onClick={() => publish(s.id, "closed")}>
                      <CheckCircle2 /> Cerrar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
        {view === "resultados" && (
          <>
            <section className="report-hero">
              <div>
                <span className="mini-label">Informe institucional NCh3262</span>
                <h2>Análisis integral de género y equidad</h2>
                <p>
                  Indicadores de percepción, brechas, alertas y resultados por
                  unidad, con resguardo automático del anonimato.
                </p>
              </div>
              <div className="report-actions">
                <button className="ghost-button" onClick={exportCsv}>
                  <Download /> Base CSV
                </button>
                <button className="solid-button" onClick={exportExcel}>
                  <FileSpreadsheet /> Informe Excel
                </button>
              </div>
            </section>
            <section className="analysis-kpis">
              <article>
                <small>Índice global favorable</small>
                <strong>{data?.analysis.overallScore == null ? "—" : `${data.analysis.overallScore}%`}</strong>
                <p>Promedio ajustado de indicadores calculables</p>
              </article>
              <article className="positive">
                <small>Fortalezas</small>
                <strong>{data?.analysis.summary.positive || 0}</strong>
                <p>Indicadores en nivel positivo</p>
              </article>
              <article className="warning">
                <small>Atención</small>
                <strong>{data?.analysis.summary.intermediate || 0}</strong>
                <p>Indicadores en nivel intermedio</p>
              </article>
              <article className="critical">
                <small>Prioridades</small>
                <strong>{data?.analysis.summary.critical || 0}</strong>
                <p>Indicadores que requieren intervención</p>
              </article>
            </section>
            <section className="analysis-grid">
              <article className="panel-card">
                <header>
                  <div>
                    <span className="mini-label">Panorama institucional</span>
                    <h2>Resultados por dimensión</h2>
                  </div>
                  <BarChart3 />
                </header>
                <div className="dimension-list">
                  {data?.analysis.dimensions.map((item) => (
                    <div key={item.dimension}>
                      <div><span>{item.dimension}</span><strong>{item.score}%</strong></div>
                      <i><b className={item.score >= 70 ? "good" : item.score >= 50 ? "medium" : "bad"} style={{ width: `${item.score}%` }} /></i>
                    </div>
                  ))}
                  {!data?.analysis.dimensions.length && <p className="empty-state">Los indicadores aparecerán al alcanzar 5 respuestas válidas.</p>}
                </div>
              </article>
              <article className="panel-card alert-panel">
                <header>
                  <div>
                    <span className="mini-label">Señales sensibles</span>
                    <h2>Experiencias declaradas</h2>
                  </div>
                  <AlertTriangle />
                </header>
                {data && Object.entries({
                  "Discriminación": data.analysis.alerts.discrimination,
                  "Acoso laboral": data.analysis.alerts.workplaceHarassment,
                  "Acoso sexual": data.analysis.alerts.sexualHarassment,
                  "Malestar anímico": data.analysis.alerts.emotionalDistress,
                }).map(([label, item]) => (
                  <div className="alert-row" key={label}>
                    <span>{label}<small>Base: {item.base}</small></span>
                    <strong>{item.value == null ? "—" : `${item.value}%`}</strong>
                  </div>
                ))}
                <p className="privacy-note">Resultados agregados. Nunca se muestran cruces con menos de 5 respuestas.</p>
              </article>
            </section>
            <section className="panel-card indicator-panel">
              <header>
                <div>
                  <span className="mini-label">Matriz de resultados</span>
                  <h2>Indicadores de equidad y percepción</h2>
                </div>
              </header>
              <div className="indicator-head">
                <span>Código e indicador</span><span>Dimensión</span><span>Base</span><span>Resultado</span><span>Estado</span>
              </div>
              {data?.analysis.indicators.map((item) => (
                <div className="indicator-row" key={item.code}>
                  <div><code>{item.code}</code><strong>{item.name}</strong></div>
                  <span>{item.dimension}</span>
                  <span>{item.base}</span>
                  <strong>{item.value == null ? "Protegido" : `${item.value}%`}</strong>
                  <span className={`analysis-status ${item.status.toLowerCase().replace("í", "i").replace(" ", "-")}`}>{item.status}</span>
                </div>
              ))}
            </section>
            <section className="panel-card">
              <header>
                <div>
                  <span className="mini-label">Trazabilidad anonimizada</span>
                  <h2>Participaciones registradas</h2>
                </div>
              </header>
              <div className="table-head results">
                <span>Código</span>
                <span>Unidad</span>
                <span>Fecha</span>
              </div>
              {data?.responses.slice(0, 50).map((r) => (
                <div className="survey-row results" key={r.id}>
                  <code>{r.anonymousCode}</code>
                  <span>{r.unit}</span>
                  <span>{new Date(r.createdAt).toLocaleString("es-CL")}</span>
                </div>
              ))}
            </section>
          </>
        )}
        {view === "identidad" && (
          <section className="identity-layout">
            <article className="panel-card identity-editor">
              <header>
                <div>
                  <span className="mini-label">Configuración Red SSMOCC</span>
                  <h2>Establecimiento de la red</h2>
                </div>
                <Settings2 />
              </header>
              <div className="identity-preview">
                <div className="identity-brand-card network-brand-card">
                  <img src={institution.networkLogoUrl} alt={institution.networkShortName} />
                  <small>Servicio de Salud</small>
                </div>
                <span className="identity-plus" aria-hidden="true">+</span>
                <div className="identity-brand-card hospital-brand-card">
                  <img src={identityDraft.logoUrl} alt="Vista previa del logo" />
                  <small>{identityDraft.shortName || "Establecimiento"}</small>
                </div>
              </div>
              <label className="identity-field">
                Hospital o establecimiento SSMOCC
                <select
                  value={identityDraft.institutionName}
                  onChange={(event) => {
                    const selected = SSMOCC_ESTABLISHMENTS.find((item) => item.name === event.target.value);
                    if (selected)
                      setIdentityDraft((current) => ({
                        ...current,
                        institutionName: selected.name,
                        shortName: selected.shortName,
                      }));
                  }}
                >
                  {SSMOCC_ESTABLISHMENTS.map((item) => (
                    <option key={item.name} value={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="identity-field">
                Sigla institucional
                <input value={identityDraft.shortName} readOnly aria-readonly="true" />
              </label>
              <label className="logo-upload">
                <ImagePlus />
                <span><strong>Subir o reemplazar logo</strong><small>PNG, JPG o WEBP · máximo 750 KB</small></span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => selectLogo(event.target.files?.[0])} />
              </label>
              <label className="identity-field">
                Unidades o áreas <small>Una unidad por línea</small>
                <textarea value={unitsText} onChange={(event) => setUnitsText(event.target.value)} />
              </label>
              {identityMessage && <div className={identityMessage.startsWith("Identidad") ? "admin-success" : "admin-error"}>{identityMessage}</div>}
              <button className="solid-button identity-save" disabled={identityBusy} onClick={saveIdentity}>
                {identityBusy ? "Guardando…" : "Guardar identidad"}
              </button>
            </article>
            <aside className="identity-help">
              <span className="mini-label">Red asistencial</span>
              <h2>Una plataforma exclusiva para Occidente</h2>
              <p>El sello del SSMOCC permanece fijo. Solo se pueden seleccionar establecimientos pertenecientes a su red asistencial.</p>
              <ol>
                <li>Selecciona un establecimiento de la Red SSMOCC.</li>
                <li>Sube su logo institucional.</li>
                <li>Actualiza las unidades participantes.</li>
                <li>Guarda y revisa la encuesta pública.</li>
              </ol>
              <strong>Actual: {institution.institutionName}</strong>
            </aside>
          </section>
        )}
      </main>
      {creating && (
        <NewSurvey
          institution={institution}
          close={() => setCreating(false)}
          saved={() => {
            setCreating(false);
            load();
            setView("encuestas");
          }}
        />
      )}
      {editing && (
        <EditSurvey
          survey={editing}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
