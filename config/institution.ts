export type InstitutionSettings = {
  institutionName: string;
  shortName: string;
  subHeader: string;
  surveyTitle: string;
  surveyDescription: string;
  logoUrl: string;
  networkName: string;
  networkShortName: string;
  networkLogoUrl: string;
  colors: {
    primaryBlue: string;
    primaryRed: string;
    headerBg: string;
  };
  units: string[];
};

export const SSMOCC_ESTABLISHMENTS = [
  { name: "Hospital San Juan de Dios", shortName: "HSJD", logoUrl: "/logo-hsjd.png" },
  { name: "Hospital Clínico Dr. Félix Bulnes Cerda", shortName: "HFBC", logoUrl: "/logo-felix-bulnes.png" },
  { name: "Hospital San José de Melipilla", shortName: "HSJM", logoUrl: "/logo-melipilla.png" },
  { name: "Hospital de Peñaflor", shortName: "HPE", logoUrl: "/logo-penaflor.png" },
  { name: "Hospital de Talagante", shortName: "HTA", logoUrl: "/logo-talagante.svg" },
  { name: "Hospital de Curacaví", shortName: "HCU", logoUrl: "/logo-curacavi.png" },
  { name: "Instituto Traumatológico", shortName: "IT", logoUrl: "/logo-traumatologico.png" },
  { name: "CRS Dr. Salvador Allende", shortName: "CRS-SA", logoUrl: "/logo-crs-salvador-allende.png" },
] as const;

export const INSTITUTION_CONFIG: InstitutionSettings = {
  institutionName: "Instituto Traumatológico",
  shortName: "IT",
  subHeader: "Ministerio de Salud · Gobierno de Chile",
  surveyTitle: "Encuesta Comunidad Funcionaria 2026",
  surveyDescription: "Tu experiencia contribuye a construir espacios laborales más respetuosos, seguros e inclusivos.",
  logoUrl: "/logo-traumatologico.png",
  networkName: "Servicio de Salud Metropolitano Occidente",
  networkShortName: "SSMOCC",
  networkLogoUrl: "/logo-ssmocc-oficial.png",
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
