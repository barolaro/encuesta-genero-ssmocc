export type ReportIndicatorSource = "Encuesta" | "Administrativa";

export type ReportIndicatorDefinition = {
  code: string;
  name: string;
  source: ReportIndicatorSource;
};

export type ReportTheme = {
  sheetName: string;
  title: string;
  indicatorCodes: string[];
  questionIds: string[];
};

export const ADMINISTRATIVE_INDICATORS: ReportIndicatorDefinition[] = [
  { code: "PL1", name: "Equilibrio de mujeres y hombres en la organización", source: "Administrativa" },
  { code: "PL3", name: "Equilibrio en cargos de responsabilidad", source: "Administrativa" },
  { code: "RSC1", name: "Equilibrio en candidaturas o postulaciones", source: "Administrativa" },
  { code: "RSC2", name: "Equilibrio en contrataciones", source: "Administrativa" },
  { code: "RSC3", name: "Tasa relativa de éxito de contratación", source: "Administrativa" },
  { code: "DC1", name: "Tasa relativa de movilidad interna", source: "Administrativa" },
  { code: "CAP1", name: "Equilibrio en tipos de capacitación", source: "Administrativa" },
  { code: "REM1", name: "Brecha salarial entre mujeres y hombres", source: "Administrativa" },
];

export const REPORT_THEMES: ReportTheme[] = [
  { sheetName: "Caracterización", title: "Caracterización sociodemográfica", indicatorCodes: [], questionIds: ["P1w", "P2w", "P3w", "P4w", "P5w", "P6w", "P7w", "P8w", "P9w", "P10w", "P11w", "P12w", "P13w", "P14w", "P15w", "P16w"] },
  { sheetName: "Igualdad oportunidades", title: "Comparativo de igualdad de oportunidades", indicatorCodes: ["DC2", "RSC4", "CAP2", "REM2"], questionIds: ["P18w"] },
  { sheetName: "Ambiente laboral", title: "Ambiente laboral libre de violencia", indicatorCodes: ["AL1", "AL2", "AL3"], questionIds: ["P19w", "P20w", "P21w", "P22w", "P23w", "P24w", "P25w", "P26w", "P27w"] },
  { sheetName: "Capacitación", title: "Capacitación", indicatorCodes: ["CAP1", "CAP2"], questionIds: ["P18w"] },
  { sheetName: "Conciliación", title: "Conciliación y corresponsabilidad", indicatorCodes: ["CC1", "CC2", "CC3", "CC4", "CC5", "USO"], questionIds: ["P14w", "P15w", "P16w", "P28w", "P29w"] },
  { sheetName: "Cultura organizacional", title: "Cultura organizacional", indicatorCodes: ["CO1", "CO2", "CO3", "CO4", "CO5"], questionIds: ["P39w"] },
  { sheetName: "Desarrollo carrera", title: "Desarrollo de carrera", indicatorCodes: ["DC1", "DC2"], questionIds: ["P18w"] },
  { sheetName: "EPP", title: "Ropa de trabajo y elementos de protección personal", indicatorCodes: ["EPP1"], questionIds: ["P38w"] },
  { sheetName: "Estereotipos y sesgos", title: "Estereotipos y sesgos de género", indicatorCodes: ["ES01"], questionIds: ["P17w"] },
  { sheetName: "Infraestructura", title: "Infraestructura inclusiva", indicatorCodes: ["INF1", "INF2"], questionIds: ["P38w"] },
  { sheetName: "Participación laboral", title: "Participación laboral", indicatorCodes: ["PL1", "PL3"], questionIds: [] },
  { sheetName: "Reclutamiento", title: "Reclutamiento, selección y contratación", indicatorCodes: ["RSC1", "RSC2", "RSC3", "RSC4"], questionIds: ["P18w"] },
  { sheetName: "Remuneraciones", title: "Remuneraciones", indicatorCodes: ["REM1", "REM2"], questionIds: ["P18w"] },
  { sheetName: "Salud integral", title: "Salud física y mental", indicatorCodes: ["SFM1", "SFM2", "SFM3"], questionIds: ["P30w", "P31w", "P32w", "P33w", "P34w", "P35w", "P36w", "P37w"] },
  { sheetName: "Violencia intrafamiliar", title: "Violencia intrafamiliar", indicatorCodes: ["VIF1"], questionIds: ["P19w"] },
];
