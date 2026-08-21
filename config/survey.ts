export type Question =
  | { id: string; type: "single"; title: string; required?: boolean; options: string[] }
  | { id: string; type: "multiple"; title: string; hint?: string; required?: boolean; options: string[] }
  | { id: string; type: "dichotomous"; title: string; required?: boolean; rows: string[] }
  | { id: string; type: "likert"; title: string; required?: boolean; rows: string[] }
  | { id: string; type: "text"; title: string; hint?: string; required?: boolean; maxLength?: number };

export type SurveySection = { id: string; eyebrow: string; title: string; description: string; questions: Question[] };

export const LIKERT_OPTIONS = ["Muy en desacuerdo", "En desacuerdo", "Ni de acuerdo ni en desacuerdo", "De acuerdo", "Muy de acuerdo"];

export const SURVEY_SECTIONS: SurveySection[] = [
  {
    id: "experiencia",
    eyebrow: "Sección 1",
    title: "Experiencia laboral",
    description: "Cuéntanos cómo percibes tu entorno de trabajo habitual.",
    questions: [
      { id: "antiguedad", type: "single", title: "¿Cuánto tiempo llevas trabajando en la institución?", required: true, options: ["Menos de 1 año", "Entre 1 y 3 años", "Entre 4 y 6 años", "7 años o más"] },
      { id: "factores", type: "multiple", title: "¿Qué factores valoras más de tu lugar de trabajo?", hint: "Puedes seleccionar más de una alternativa.", options: ["Trabajo en equipo", "Liderazgo", "Estabilidad", "Desarrollo profesional", "Conciliación laboral y personal"] },
      { id: "condiciones", type: "dichotomous", title: "Respecto de las siguientes condiciones, indica Sí o No.", required: true, rows: ["Conozco los canales para plantear inquietudes", "Sé dónde solicitar apoyo ante una situación compleja", "Recibo información oportuna para realizar mi trabajo"] },
    ],
  },
  {
    id: "cultura",
    eyebrow: "Sección 2",
    title: "Cultura y convivencia",
    description: "Indica tu nivel de acuerdo con cada afirmación.",
    questions: [
      { id: "percepcion", type: "likert", title: "En mi unidad…", required: true, rows: ["Las personas son tratadas con respeto", "Se valoran distintas perspectivas", "Puedo expresar una opinión sin temor", "Las jefaturas promueven un ambiente colaborativo"] },
      { id: "comentarios", type: "text", title: "¿Qué medida concreta ayudaría a mejorar la convivencia en tu unidad?", hint: "No incluyas nombres ni información que permita identificar a otras personas.", maxLength: 1000 },
    ],
  },
];
