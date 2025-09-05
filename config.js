export const CONFIG = {
  TITLE: "Pensum Medicina (vig. 2013)",
  ADMIN_KEY: "med-admin-2025", // para ?admin=med-admin-2025
  DEFAULT_MAX_CREDITS: 18,
  ELECTIVES_MIN: { PREMED: 12, BASICAS: 8, CLINICAS: 8 },
  GPA_MIN_PREMED_TO_BASICAS: 2.5,
  BLOCK_ORDER: ["PREMED", "BASICAS", "CLINICAS", "INTERNADO"],
  GRADE_SCALE: {
    mode: "numeric", // "numeric" | "letters"
    letters: { "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7, "C+": 2.3, "C": 2.0, "C-": 1.7, "D": 1.0, "F": 0.0 },
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
  }
};
