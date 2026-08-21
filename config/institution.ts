export const INSTITUTION_CONFIG = {
  institutionName: "Servicio de Salud Metropolitano Occidente",
  shortName: "SSMOCC",
  subHeader: "Ministerio de Salud · Gobierno de Chile",
  surveyTitle: "Encuesta Comunidad Funcionaria 2026",
  surveyDescription: "Tu experiencia contribuye a construir espacios laborales más respetuosos, seguros e inclusivos.",
  logoUrl: "/ssmocc-logo.svg",
  colors: {
    primaryBlue: "#0039A6",
    primaryRed: "#EF3340",
    headerBg: "#075F91",
  },
  units: [
    "Urgencia",
    "Pabellón / Quirófanos",
    "Unidad de Paciente Crítico (UPC)",
    "Consultorio Externo / Ambulatorio",
    "Hospitalización",
    "Laboratorio y Imagenología",
    "Administración / Recursos Humanos",
    "Servicios Generales y Mantenimiento",
  ],
} as const;
