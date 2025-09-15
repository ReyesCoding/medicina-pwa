export const CONFIG = {
  TITLE: "Pensum Medicina (vig. 2013)",
  ADMIN_KEY: "med-admin-2025", // para ?admin=med-admin-2025
  DEFAULT_MAX_CREDITS: 18,
  ELECTIVES_MIN: { PREMED: 12, BASICAS: 8, CLINICAS: 8 },
  GPA_MIN_PREMED_TO_BASICAS: 2.5,
  BLOCK_ORDER: ["PREMED", "BASICAS", "CLINICAS", "INTERNADO"],
  GPA: {
    COUNT_ONLY_PASSED: true,
    REQUIRE_GRADE_ON_PASS: true,
    PASSING_MIN_NUMERIC: 60
  },
  GRADE_SCALE: {
    mode: "numeric", // fijo a numérica
    numeric: [
      { min: 90, gpa: 4.0 },
      { min: 85, gpa: 3.7 },
      { min: 80, gpa: 3.3 },
      { min: 75, gpa: 3.0 },
      { min: 70, gpa: 2.7 },
      { min: 65, gpa: 2.3 },
      { min: 60, gpa: 2.0 },
      { min: 0,  gpa: 0.0 }
    ]
  },
  
 ELECTIVE_TITLES: {
    GEN: "Electivas Generales",
    BASICAS: "Electivas Profesionalizantes de Ciencias Básicas",
    CLINICAS: "Electivas Profesionalizantes de Ciencias Clínicas y Quirúrgicas"
  },
  ELECTIVE_FALLBACK_BY_AREA: { // por si el JSON aún no trae el grupo
    PREMEDICA: "GEN",
    BASICAS: "BASICAS",
    CLINICAS: "CLINICAS"
  },
  CHECKPOINTS: {
    "6": {
      title: "Paso a Ciencias Básicas",
      note: "Pre–requisitos: Haber aprobado el bloque de PreMédica y un Índice Académico mínimo acumulado de 2.5."
    },
    "11": {
      title: "Paso a Clínicas",
      note: "Pre–requisitos: Haber aprobado el bloque de Ciencias Básicas."
    },
    "15": {
      title: "Antes de Internado",
      note: "Revisa que cumplas todos los requisitos previos al Internado Rotatorio."
    }
  }
};
