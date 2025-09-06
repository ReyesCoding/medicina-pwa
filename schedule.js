// schedule.js — parser de horarios + choques
const DAYMAP = { "L":0,"LU":0, "MA":1, "MI":2, "X":2, "J":3, "V":4, "S":5, "D":6 };

function normalizeName(s){
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/\s+/g," ").trim();
}

function parseTime(str){ // "8:30", "1:45 pm"
  const m = String(str).trim().match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i);
  if(!m) return null;
  let hh = parseInt(m[1],10);
  let mm = parseInt(m[2]||"0",10);
  const ampm = (m[3]||"").toLowerCase();
  if(ampm==="pm" && hh<12) hh+=12;
  if(ampm==="am" && hh===12) hh=0;
  return {hh,mm};
}

function toMinutes(dayCode, t){ // minutos desde lunes 00:00
  const d = DAYMAP[dayCode] ?? null;
  if(d==null) return null;
  return d*24*60 + t.hh*60 + t.mm;
}

// Detecta patrones tipo:
// "MIJ8:30,9:15 am", "J1:45 a 4:45 pm", "LV7:00,7:45 am", "J4:00,4:45,V2:30,3:15 pm"
function expandSlots(horario){
  const slots = [];
  const txt = String(horario||"").toUpperCase();

  // Partimos por ")," para separar segmentos tipo "J4:00,4:45" y "V2:30,3:15 pm"
  const segments = txt.split(/\)\s*|(?<=\w)\s+(?=[A-Z]{1,2}\d)|\s{2,}/).filter(Boolean);
  const re = /([LMIXJVS]{1,2})\s*([0-9:]+)\s*(?:,|a|-)\s*([0-9:]+)\s*(am|pm)?/i;

  // Si no hubo cortes, intentamos al menos una coincidencia global
  const base = segments.length ? segments : [txt];

  base.forEach(seg=>{
    let suffix = ""; // am/pm que se arrastra al final
    const segPm = seg.match(/\b(am|pm)\b/i);
    if (segPm) suffix = segPm[1].toLowerCase();

    // dividir por comas separando paquetes "J4:00,4:45" y "V2:30,3:15"
    const parts = seg.split(/\s*,\s*(?=[LMIXJVS]{1,2}\s*\d)/);
    (parts.length?parts:[seg]).forEach(p=>{
      const m = p.match(re);
      if(!m) return;
      const day = m[1];
      const t1 = parseTime(m[2] + (suffix?(" "+suffix):""));
      const t2 = parseTime(m[3] + (suffix?(" "+suffix):""));
      if(!t1 || !t2) return;

      // Si day tiene dos letras tipo "MI" o "LV", se expanden ambos días
      const days = expandDayToken(day);
      days.forEach(d=>{
      const start = toMinutes(d, t1), end = toMinutes(d, t2);
        if(start!=null && end!=null) slots.push({ day:d, start, end });
      });

      days.forEach(d=>{
        const start = toMinutes(d, t1), end = toMinutes(d, t2);
        if(start!=null && end!=null) slots.push({ day:d, start, end });
      });
    });
  });
  return slots;
}

// Parser principal: recibe texto pegado, devuelve mapping por materia
function parsePastedSchedules(text){
  // Esperamos columnas tipo: Estado | Clave | Nombre | Horario | Aula | Carreras
  // Separadas por tabs o múltiples espacios.
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const out = {}; // nameNormalized -> [{crn,label,room,career,slots}]
  for (const line of lines){
    const cols = line.split(/\t+| {2,}/).map(c=>c.trim());
    if (cols.length < 4) continue;
    const crn   = cols[0];           // a veces vacío
    const name  = cols[1] || cols[2];// según orden
    const horario = cols[2] || cols[3];
    const aula  = cols[3] || cols[4] || "";
    const carr  = cols[4] || cols[5] || "";

    const label = horario.replace(/\s*\(PRESENCIAL\)\s*/i,"").trim();
    const slots = expandSlots(label);
    const key = normalizeName(name);
    if (!out[key]) out[key] = [];
    out[key].push({ crn: crn || "", label, room: aula, career: carr || "MED", slots });
  }
  return out;
}

// Choques: true si [a,b] solapa con [c,d]
function overlap(a,b,c,d){ return Math.max(a,c) < Math.min(b,d); }

function hasConflict(selectedMap){
  // selectedMap: { courseId: {crn,label,slots[]} }
  const entries = Object.values(selectedMap).filter(s=>s && s.slots && s.slots.length);
  for (let i=0;i<entries.length;i++){
    for (let j=i+1;j<entries.length;j++){
      for (const s1 of entries[i].slots){
        for (const s2 of entries[j].slots){
          // mismo día lógico (convertimos letras alternativas)
          const d1 = (s1.day.length===1)? s1.day : s1.day[0];
          const d2 = (s2.day.length===1)? s2.day : s2.day[0];
          if (d1===d2 && overlap(s1.start, s1.end, s2.start, s2.end)) return true;
        }
      }
    }
  }
  return false;
}

// Convierte tokens como "MIJ", "MAV", "LV", "MAMI" → ["MI","J"] o ["MA","V"] etc.
function expandDayToken(tok){
  const s = String(tok).toUpperCase();
  const out = [];
  const two = ["MA","MI"]; // pares de 2 letras
  let i = 0;
  while (i < s.length) {
    const twoCandidate = s.slice(i, i+2);
    if (two.includes(twoCandidate)) {
      out.push(twoCandidate);
      i += 2;
      continue;
    }
    // 1 letra
    const ch = s[i];
    if ("LJVSXD".includes(ch)) {
      // X = MIércoles alternativo; lo normalizamos a "MI"
      out.push(ch === "X" ? "MI" : ch);
    }
    i += 1;
  }
  return out;
}

window.Schedule = { parsePastedSchedules, hasConflict };
export {};
