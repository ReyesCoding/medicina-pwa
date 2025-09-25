import fs from 'fs';

// Read the extraction file
const extractionText = fs.readFileSync('temp_course_extraction.txt', 'utf-8');

const courses = [];
let currentTerm = 1;
let currentBlock = "PREMÉDICA";

// Helper function to parse prerequisites and corequisites
function parsePrerequisitesAndCorequisites(prereqText) {
  const prerequisites = [];
  const corequisites = [];
  
  if (!prereqText || prereqText.trim() === '' || prereqText.trim() === '[]') {
    return { prerequisites, corequisites };
  }
  
  // Split by Co-Req: to separate prerequisites from corequisites
  const coReqMatch = prereqText.match(/^(.*?)\s*Co-Req:\s*(.+)$/);
  
  if (coReqMatch) {
    // Has both prerequisites and corequisites
    const prereqPart = coReqMatch[1].trim();
    const coreqPart = coReqMatch[2].trim();
    
    // Parse prerequisites (before Co-Req:)
    if (prereqPart && prereqPart !== '[]') {
      prerequisites.push(...prereqPart.split(',').map(p => p.trim()).filter(p => p && p !== '[]'));
    }
    
    // Parse corequisites (after Co-Req:)
    if (coreqPart) {
      corequisites.push(...coreqPart.split(',').map(c => c.trim()).filter(c => c));
    }
  } else {
    // Only prerequisites, no corequisites
    if (prereqText !== '[]') {
      prerequisites.push(...prereqText.split(',').map(p => p.trim()).filter(p => p && p !== '[]'));
    }
  }
  
  return { prerequisites, corequisites };
}

// Helper function to clean course name
function cleanCourseName(name) {
  return name.replace(/\s+/g, ' ').trim();
}

// Split into lines and process
const lines = extractionText.split('\n');
let currentElectiveType = null;

for (const line of lines) {
  const trimmedLine = line.trim();
  
  // Skip empty lines and headers
  if (!trimmedLine || trimmedLine.startsWith('===') || trimmedLine.startsWith('TERM') || 
      trimmedLine.includes('CUATRIMESTRE') || trimmedLine.includes('CLAVE') || 
      trimmedLine.includes('NOMBRE ASIGNATURA')) {
    
    // Check for block changes
    if (trimmedLine.includes('CIENCIAS BÁSICAS')) {
      currentBlock = "CIENCIAS BÁSICAS";
      currentTerm = 7;
    } else if (trimmedLine.includes('CLÍNICAS Y QUIRÚRGICAS')) {
      currentBlock = "CIENCIAS CLÍNICAS Y QUIRÚRGICAS";
      currentTerm = 12;
    } else if (trimmedLine.includes('INTERNADO ROTATORIO')) {
      currentBlock = "INTERNADO ROTATORIO";
      currentTerm = 16;
    } else if (trimmedLine.includes('PROYECTO DE GRADO')) {
      currentBlock = "PROYECTO DE GRADO";
      currentTerm = 18; // Keep within 18 terms
    }
    
    // Check for elective types
    if (trimmedLine.includes('ELECTIVAS GENERALES')) {
      currentElectiveType = "general";
    } else if (trimmedLine.includes('ELECTIVAS PROFESIONALIZANTES')) {
      currentElectiveType = "professional";
    } else if (trimmedLine.includes('TERM ')) {
      currentElectiveType = null;
      // Extract term number
      const termMatch = trimmedLine.match(/TERM (\d+)/);
      if (termMatch) {
        currentTerm = parseInt(termMatch[1]);
      }
    }
    
    continue;
  }
  
  // Parse course lines (regular format: CODE NAME HT HP TH CRED PREREQS)
  let courseMatch = trimmedLine.match(/^([A-Z]{3}-\d{3})\s+(.+?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*(.*)/);
  
  // Also handle INTERNADO ROTATORIO format: CODE NAME WEEKS CRED PREREQS
  let isInternado = false;
  if (!courseMatch && currentBlock === "INTERNADO ROTATORIO") {
    courseMatch = trimmedLine.match(/^([A-Z]{3}-\d{3})\s+(.+?)\s+(\d+)\s+weeks\s+0\s+(\d+)\s*(.*)/);
    isInternado = true;
  }
  
  if (courseMatch) {
    let id, rawName, ht, hp, th, credits, prereqPart;
    
    if (isInternado) {
      [, id, rawName, ht, credits, prereqPart] = courseMatch;
      hp = 0;
      th = ht; // For internado, weeks become theoretical hours
    } else {
      [, id, rawName, ht, hp, th, credits, prereqPart] = courseMatch;
    }
    
    // Clean up the name (remove extra spaces and get everything before prereqs)
    let name = rawName.trim();
    
    // Parse prerequisites and corequisites
    const { prerequisites, corequisites } = parsePrerequisitesAndCorequisites(prereqPart);
    
    // Create course object
    const course = {
      id,
      name: cleanCourseName(name),
      credits: parseInt(credits),
      theoreticalHours: parseInt(ht),
      practicalHours: parseInt(hp),
      term: currentTerm,
      block: currentBlock,
      prerequisites,
      corequisites,
      isElective: currentElectiveType !== null,
      electiveType: currentElectiveType,
      description: generateDescription(id, name, currentBlock)
    };
    
    courses.push(course);
  }
}

// Helper function to generate descriptions
function generateDescription(id, name, block) {
  const descriptions = {
    'ESP': 'Curso de lengua española enfocado en comunicación y redacción.',
    'ING': 'Curso de idioma inglés para desarrollo de competencias comunicativas.',
    'MAT': 'Curso de matemáticas aplicadas a las ciencias médicas.',
    'MED': 'Asignatura médica fundamental para la formación profesional.',
    'SOC': 'Curso de ciencias sociales aplicadas al contexto médico.',
    'SIC': 'Asignatura de psicología aplicada a la práctica médica.',
    'INF': 'Curso de informática y tecnologías aplicadas a la salud.',
    'ECO': 'Curso de economía aplicada al sector salud.',
    'ORI': 'Curso de orientación para el desarrollo académico y profesional.',
    'ENF': 'Curso complementario de enfermería básica.',
    'ADM': 'Curso de administración y emprendimiento.',
    'DPG': 'Trabajo de investigación para obtención del grado académico.'
  };
  
  const prefix = id.split('-')[0];
  return descriptions[prefix] || `Asignatura del bloque ${block}.`;
}

// Sort courses by term and then by id
courses.sort((a, b) => {
  if (a.term !== b.term) return a.term - b.term;
  return a.id.localeCompare(b.id);
});

// Write to JSON file
fs.writeFileSync('client/src/data/courses_complete.json', JSON.stringify(courses, null, 2));

console.log(`Generated ${courses.length} courses successfully!`);
console.log(`Blocks: ${[...new Set(courses.map(c => c.block))].join(', ')}`);
console.log(`Terms: ${Math.min(...courses.map(c => c.term))} - ${Math.max(...courses.map(c => c.term))}`);