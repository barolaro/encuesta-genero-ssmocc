"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { INSTITUTION_CONFIG as institution } from "@/config/institution";
import {
  LIKERT_OPTIONS,
  SURVEY_SECTIONS,
  type Question,
} from "@/config/survey";
type Answers = Record<string, string | string[] | Record<string, string>>;
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeCode = () => {
  const values = crypto.getRandomValues(new Uint8Array(8));
  const raw = Array.from(values, (v) => alphabet[v % alphabet.length]).join("");
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
};
function Header() {
  return (
    <header className="institutional-header">
      <div className="header-blue">
        <img src={institution.logoUrl} alt={`Logo ${institution.shortName}`} />
      </div>
      <div className="header-red">
        <p>{institution.subHeader}</p>
        <strong>{institution.institutionName}</strong>
        <a className="admin-access" href="/administracion">
          <LockKeyhole size={16} aria-hidden="true" />
          <span>Administración</span>
        </a>
      </div>
    </header>
  );
}
function Matrix({
  question,
  value,
  onChange,
  options,
}: {
  question: Extract<Question, { type: "dichotomous" | "likert" }>;
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
  options: string[];
}) {
  return (
    <div className="matrix-wrap">
      <table className="matrix">
        <thead>
          <tr>
            <th>Afirmación</th>
            {options.map((o) => (
              <th key={o}>{o}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {question.rows.map((row) => (
            <tr key={row}>
              <td>{row}</td>
              {options.map((option) => (
                <td key={option}>
                  <label className="radio-cell">
                    <input
                      type="radio"
                      name={`${question.id}-${row}`}
                      checked={value[row] === option}
                      onChange={() => onChange({ ...value, [row]: option })}
                    />
                    <span>{option}</span>
                  </label>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function QuestionCard({
  question,
  answer,
  setAnswer,
}: {
  question: Question;
  answer: Answers[string] | undefined;
  setAnswer: (v: Answers[string]) => void;
}) {
  return (
    <article className="question-card">
      <div className="question-heading">
        <span>{question.required ? "Obligatoria" : "Opcional"}</span>
        <h3>{question.title}</h3>
        {"hint" in question && question.hint && <p>{question.hint}</p>}
      </div>
      {question.type === "single" && (
        <div className="choice-grid">
          {question.options.map((option) => (
            <label
              className={`choice ${answer === option ? "selected" : ""}`}
              key={option}
            >
              <input
                type="radio"
                name={question.id}
                checked={answer === option}
                onChange={() => setAnswer(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
      {question.type === "multiple" && (
        <div className="choice-grid">
          {question.options.map((option) => {
            const values = Array.isArray(answer) ? answer : [];
            return (
              <label
                className={`choice ${values.includes(option) ? "selected" : ""}`}
                key={option}
              >
                <input
                  type="checkbox"
                  checked={values.includes(option)}
                  onChange={() =>
                    setAnswer(
                      values.includes(option)
                        ? values.filter((x) => x !== option)
                        : [...values, option],
                    )
                  }
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      )}
      {question.type === "dichotomous" && (
        <Matrix
          question={question}
          value={(answer as Record<string, string>) ?? {}}
          onChange={setAnswer}
          options={["Sí", "No"]}
        />
      )}{" "}
      {question.type === "likert" && (
        <Matrix
          question={question}
          value={(answer as Record<string, string>) ?? {}}
          onChange={setAnswer}
          options={LIKERT_OPTIONS}
        />
      )}{" "}
      {question.type === "text" && (
        <div>
          <textarea
            value={(answer as string) ?? ""}
            maxLength={question.maxLength}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Escribe aquí tu comentario…"
          />
          <div className="counter">
            {((answer as string) ?? "").length} / {question.maxLength}
          </div>
        </div>
      )}
    </article>
  );
}
export function SurveyApp({
  survey,
}: {
  survey?: {
    id: string;
    title: string;
    description: string;
    sections: typeof SURVEY_SECTIONS;
  };
}) {
  const sections = survey?.sections ?? SURVEY_SECTIONS;
  const [step, setStep] = useState(0),
    [code, setCode] = useState(""),
    [unit, setUnit] = useState(""),
    [answers, setAnswers] = useState<Answers>({}),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false);
  const totalSteps = sections.length + 2,
    progress =
      step === totalSteps - 1
        ? 100
        : Math.round((step / (totalSteps - 1)) * 100),
    section = step > 0 && step <= sections.length ? sections[step - 1] : null,
    answered = useMemo(() => Object.keys(answers).length, [answers]);
  useEffect(() => setCode(makeCode()), []);
  const updateCode = (v: string) => {
    const raw = v
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    setCode(raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw);
  };
  const valid = () =>
    !section ||
    section.questions
      .filter((q) => q.required)
      .every((q) => {
        const v = answers[q.id];
        return (
          !!v &&
          (!("rows" in q) || Object.keys(v as object).length === q.rows.length)
        );
      });
  const next = () => {
    setError("");
    if (step === 0 && (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code) || !unit))
      return setError(
        "Ingresa un código válido y selecciona tu unidad para continuar.",
      );
    if (!valid())
      return setError(
        "Responde todas las preguntas obligatorias de esta sección.",
      );
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const submit = async () => {
    if (!valid())
      return setError(
        "Responde todas las preguntas obligatorias de esta sección.",
      );
    setSending(true);
    setError("");
    try {
      const r = await fetch("/api/survey/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            surveyId: survey?.id,
            anonymousCode: code,
            unit,
            responses: answers,
          }),
        }),
        b = await r.json();
      if (!r.ok)
        throw new Error(b.error || "No fue posible enviar la encuesta.");
      setStep(totalSteps - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No fue posible enviar la encuesta.",
      );
    } finally {
      setSending(false);
    }
  };
  return (
    <>
      <Header />
      <div className="progress-shell">
        <div className="progress-meta">
          <span>
            Paso {Math.min(step + 1, totalSteps)} de {totalSteps}
          </span>
          <span>{progress}% completado</span>
        </div>
        <div className="progress-track">
          <div style={{ width: `${progress}%` }} />
        </div>
      </div>
      <main className="main-shell">
        {step === 0 && (
          <section className="intro-layout">
            <div className="intro-copy">
              <span className="eyebrow">Participación funcionaria · 2026</span>
              <h1>{survey?.title ?? institution.surveyTitle}</h1>
              <p>{survey?.description || institution.surveyDescription}</p>
              <div className="trust-row">
                <span>
                  <ShieldCheck size={18} /> Anónima
                </span>
                <span>
                  <LockKeyhole size={18} /> Confidencial
                </span>
                <span>≈ 6 minutos</span>
              </div>
            </div>
            <div className="entry-card">
              <div className="privacy">
                <ShieldCheck />
                <div>
                  <strong>Tu identidad está protegida</strong>
                  <p>
                    No solicitamos RUT, correo electrónico, nombre ni ningún
                    otro dato personal. Evita identificar personas en tus
                    comentarios.
                  </p>
                </div>
              </div>
              <label className="field">
                <span>Código anónimo de acceso</span>
                <div className="code-control">
                  <input
                    value={code}
                    onChange={(e) => updateCode(e.target.value)}
                    aria-label="Código anónimo"
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(code)}
                    title="Copiar código"
                  >
                    <Clipboard size={19} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCode(makeCode())}
                    title="Generar otro código"
                  >
                    <RefreshCw size={19} />
                  </button>
                </div>
                <small>
                  Guárdalo como comprobante. Puedes editarlo antes de comenzar.
                </small>
              </label>
              <label className="field">
                <span>Unidad o área de desempeño</span>
                <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                  <option value="">Selecciona una unidad</option>
                  {institution.units.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button className="primary-button" onClick={next}>
                Comenzar encuesta <ChevronRight size={20} />
              </button>
            </div>
          </section>
        )}
        {section && (
          <section>
            <div className="section-title">
              <span>{section.eyebrow}</span>
              <h1>{section.title}</h1>
              <p>{section.description}</p>
            </div>
            {section.questions.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                answer={answers[q.id]}
                setAnswer={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              />
            ))}
            {error && (
              <p className="error centered" role="alert">
                {error}
              </p>
            )}
            <div className="actions">
              <button
                className="secondary-button"
                onClick={() => {
                  setStep((s) => s - 1);
                  setError("");
                }}
              >
                <ChevronLeft size={20} /> Volver
              </button>
              {step === sections.length ? (
                <button
                  className="primary-button compact"
                  disabled={sending}
                  onClick={submit}
                >
                  {sending ? "Enviando…" : "Enviar encuesta"}{" "}
                  <Check size={20} />
                </button>
              ) : (
                <button className="primary-button compact" onClick={next}>
                  Continuar <ChevronRight size={20} />
                </button>
              )}
            </div>
          </section>
        )}
        {step === totalSteps - 1 && (
          <section className="success-card">
            <div className="success-icon">
              <Check />
            </div>
            <span className="eyebrow">Envío confirmado</span>
            <h1>Gracias por participar</h1>
            <p>
              Tu respuesta fue registrada de forma anónima. Tu opinión será
              considerada en el análisis institucional.
            </p>
            <div className="receipt">
              <span>Código de comprobante</span>
              <strong>{code}</strong>
              <button onClick={() => navigator.clipboard.writeText(code)}>
                <Clipboard size={17} /> Copiar
              </button>
              <div>
                <p>
                  <b>Unidad:</b> {unit}
                </p>
                <p>
                  <b>Respuestas registradas:</b> {answered}
                </p>
                <p>
                  <b>Fecha:</b>{" "}
                  {new Intl.DateTimeFormat("es-CL", {
                    dateStyle: "long",
                    timeStyle: "short",
                  }).format(new Date())}
                </p>
              </div>
            </div>
            <p className="privacy-note">
              <LockKeyhole size={17} /> Este comprobante no permite asociar tus
              respuestas con tu identidad.
            </p>
          </section>
        )}
      </main>
      <footer>
        <span>Gobierno de Chile</span>
        <p>{institution.institutionName} · Encuesta anónima</p>
      </footer>
    </>
  );
}
