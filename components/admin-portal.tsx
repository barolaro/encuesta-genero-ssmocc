"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  FilePlus2,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Plus,
  Send,
  Settings2,
  UsersRound,
} from "lucide-react";
import { INSTITUTION_CONFIG as institution } from "@/config/institution";

type Survey = {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
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
};
const statusLabel: Record<string, string> = {
  draft: "Borrador",
  published: "Activa",
  closed: "Cerrada",
};

function Login({ done }: { done: () => void }) {
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
        <img
          src={institution.logoUrl}
          alt="Servicio de Salud Metropolitano Occidente"
        />
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

function NewSurvey({ close, saved }: { close: () => void; saved: () => void }) {
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

export function AdminPortal({ authenticated }: { authenticated: boolean }) {
  const [logged, setLogged] = useState(authenticated),
    [data, setData] = useState<Overview | null>(null),
    [view, setView] = useState("resumen"),
    [creating, setCreating] = useState(false),
    [error, setError] = useState("");
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
  if (!logged) return <Login done={() => setLogged(true)} />;
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <img src={institution.logoUrl} alt="SSMOCC" />
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
                  : "Resultados e informes"}
            </h1>
          </div>
          <button className="solid-button" onClick={() => setCreating(true)}>
            <Plus /> Nueva encuesta
          </button>
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
                <div>
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
                <span className="mini-label">Informe consolidado</span>
                <h2>Resultados de participación</h2>
                <p>
                  Descarga los datos anonimizados para análisis institucional.
                  El archivo no contiene nombres, correos ni RUT.
                </p>
              </div>
              <button className="solid-button" onClick={exportCsv}>
                <Download /> Descargar CSV
              </button>
            </section>
            <section className="panel-card">
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
      </main>
      {creating && (
        <NewSurvey
          close={() => setCreating(false)}
          saved={() => {
            setCreating(false);
            load();
            setView("encuestas");
          }}
        />
      )}
    </div>
  );
}
