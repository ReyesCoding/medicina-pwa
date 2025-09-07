// schedule.js
const DAYMAP = { L:0, LU:0, MA:1, MI:2, X:2, J:3, V:4, S:5, D:6 };

function normalizeName(s){
  return String(s||"")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toUpperCase()
    .replace(/^LAB\.?\s+/,"")
    .replace(/^LABORATORIO\s+/,"")
    .replace(/\s+/g," ")
    .trim();
}

function parseTime(str){
  const m = String(str).trim().match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)?$/i);
  if(!m) return null;
  let hh = parseInt(m[1],10);
  let mm = parseInt(m[2]||"0",10);
  const ap = (m[3]||"").toLowerCase();
  if(ap==="pm" && hh<12) hh+=12;
  if(ap==="am" && hh===12) hh=0;
  return {hh,mm};
}

function toMinutes(dayCode, t){
  const d = DAYMAP[dayCode] ?? null;
  if(d==null) return null;
  return d*24*60 + t.hh*60 + t.mm;
}

// MAJ / MAMI / JV / etc.
function expandDayToken(tok){
  const s = String(tok).toUpperCase();
  const out = [];
  const two = ["LU","MA","MI","JU","VI","SA","DO"]; // normales
  const alt = ["MA","MI"]; // abreviaturas pegadas que vemos
  let i = 0;
  while (i < s.length) {
    const twoCandidate = s.slice(i, i+2);
    if (alt.includes(twoCandidate) || two.includes(twoCandidate)) {
      out.push(twoCandidate);
      i += 2;
      continue;
    }
    const ch = s[i];
    if ("LJVSXD".includes(ch)) out.push(ch === "X" ? "MI" : ch);
    i += 1;
  }
  return out;
}

// Coma = inicios secuenciales (bloques de 45 min). "a" = rango explícito.
function expandSlots(horario){
  const slots = [];
  const txt = String(horario||"").toUpperCase().trim();
  const re = /([LMIXJVS]{1,4})\s*([0-9]{1,2}:[0-9]{2})(?:\s*(?:,|a|-)\s*([0-9]{1,2}:[0-9]{2}))?\s*(am|pm)?/gi;
  let m;
  while ((m = re.exec(txt)) !== null) {
    const dayTok = m[1];
    const between = txt.slice(m.index, re.lastIndex);
    const hasRange = /(?:\ba\b|-)/i.test(between);
    const t1 = parseTime(m[2] + (m[4] ? (" " + m[4]) : ""));
    if (!t1) continue;
    const days = expandDayToken(dayTok);

    if (m[3]) {
      const t2 = parseTime(m[3] + (m[4] ? (" " + m[4]) : ""));
      if (!t2) continue;
      if (hasRange) {
        for (const d of days) {
          const start = toMinutes(d, t1), end = toMinutes(d, t2);
          if (start!=null && end!=null) slots.push({ day:d, start, end });
        }
      } else {
        for (const d of days) {
          const start1 = toMinutes(d, t1);
          const end1 = start1!=null ? start1 + 45 : null;
          const start2 = toMinutes(d, t2);
          const end2 = start2!=null ? start2 + 45 : null;
          if (start1!=null && end1!=null) slots.push({ day:d, start:start1, end:end1 });
          if (start2!=null && end2!=null) slots.push({ day:d, start:start2, end:end2 });
        }
      }
    } else {
      for (const d of days) {
        const start = toMinutes(d, t1);
        const end = start!=null ? start + 45 : null;
        if (start!=null && end!=null) slots.push({ day:d, start, end });
      }
    }
  }
  return slots;
}

// Acepta líneas con o sin CRN al inicio
function parsePastedSchedules(text){
  const out = [];
  const CRN = /\b[A-Z]{3}\d{6}\b/g; // MED175043, etc.

  // 1) segmentar por CRN (aunque estén en la misma línea)
  const idxs = [];
  let m; while ((m = CRN.exec(text)) !== null) idxs.push(m.index);
  if (!idxs.length) return out;

  idxs.push(text.length);
  for (let i=0;i<idxs.length-1;i++){
    const seg = text.slice(idxs[i], idxs[i+1]).trim();
    if (!seg) continue;

    // 2) extraer CRN
    const mcrn = seg.match(CRN);
    const crn = mcrn ? mcrn[0] : "";

    // 3) encontrar primer token día+hora y cortar nombre allí (lo ignoramos)
    const reLead = /([LMIXJVS]{1,4})\s*\d{1,2}:\d{2}/i;
    const mlead = seg.match(reLead);
    if (!mlead) continue;

    let schedPart = seg.slice(seg.indexOf(mlead[0])).replace(/\(PRESENCIAL\)/ig,"").trim();

    // 4) aula (último token alfanumérico tipo A113/AS03)
    let room = "";
    const tt = schedPart.split(/\s+/);
    if (tt.length>=2 && /^[A-Z0-9\-]+$/.test(tt[tt.length-1])) {
      room = tt.pop(); schedPart = tt.join(" ");
    }

    const slots = expandSlots(schedPart);
    out.push({ crn, label: schedPart, room, career:"MED", slots });
  }
  return out;
}

function overlap(a,b,c,d){ return Math.max(a,c) < Math.min(b,d); }

function hasConflict(selectedMap){
  const entries = Object.values(selectedMap).filter(s=>s && s.slots && s.slots.length);
  for (let i=0;i<entries.length;i++){
    for (let j=i+1;j<entries.length;j++){
      for (const s1 of entries[i].slots){
        for (const s2 of entries[j].slots){
          const d1 = Array.isArray(s1.day) ? s1.day[0] : s1.day;
          const d2 = Array.isArray(s2.day) ? s2.day[0] : s2.day;
          if (d1===d2 && overlap(s1.start, s1.end, s2.start, s2.end)) return true;
        }
      }
    }
  }
  return false;
}

window.Schedule = { parsePastedSchedules, hasConflict };
export {};
