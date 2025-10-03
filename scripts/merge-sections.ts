import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Course {
  id: string;
  name: string;
  credits: number;
}

interface TimeSlot {
  day: string;
  start: number;
  end: number;
}

interface Section {
  crn: string;
  label: string;
  room: string;
  career?: string;
  closed: boolean;
  slots: TimeSlot[];
}

interface CourseWithSections {
  name: string;
  id: string | null;
  sections: Section[];
}

interface SectionsData {
  courses: CourseWithSections[];
}

// Day code mapping
const DAY_CODES: Record<string, string> = {
  'L': 'Lun',
  'MA': 'Mar',
  'MI': 'Mié',
  'J': 'Jue',
  'V': 'Vie',
  'S': 'Sáb'
};

// Minutes from start of week for each day
const DAY_OFFSETS: Record<string, number> = {
  'L': 0,        // Monday
  'MA': 1440,    // Tuesday
  'MI': 2880,    // Wednesday
  'J': 4320,     // Thursday
  'V': 5760,     // Friday
  'S': 7200      // Saturday
};

function parseTime(timeStr: string): { hours: number; minutes: number; isPM: boolean } {
  const match = timeStr.match(/(\d+):(\d+)\s*(am|pm)?/i);
  if (!match) throw new Error(`Invalid time format: ${timeStr}`);
  
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const isPM = match[3]?.toLowerCase() === 'pm';
  
  // Handle 12-hour format
  if (isPM && hours !== 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;
  
  return { hours, minutes, isPM: hours >= 12 };
}

function timeToMinutes(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): { hours: number; minutes: number } {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}

function formatTime12Hour(hours: number, minutes: number): string {
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function parseDayCodes(scheduleStr: string): string[] {
  const days: string[] = [];
  let i = 0;
  
  while (i < scheduleStr.length && /[A-Z]/.test(scheduleStr[i])) {
    if (i + 1 < scheduleStr.length && /[A-Z]/.test(scheduleStr[i + 1])) {
      const twoChar = scheduleStr.substring(i, i + 2);
      if (DAY_CODES[twoChar]) {
        days.push(twoChar);
        i += 2;
        continue;
      }
    }
    const oneChar = scheduleStr[i];
    if (DAY_CODES[oneChar]) {
      days.push(oneChar);
    }
    i++;
  }
  
  return days;
}

function parseSchedule(scheduleStr: string, credits: number): { slots: TimeSlot[]; label: string } {
  // Handle virtual classes
  if (scheduleStr.includes('Virtual') || scheduleStr.includes('VIRTU')) {
    return {
      slots: [],
      label: 'Virtual'
    };
  }

  // Check if it's a range format like "J6:15 a 8:30 pm"
  const rangeMatch = scheduleStr.match(/([A-Z]+)(\d+:\d+)\s*a\s*(\d+:\d+)\s*(am|pm)?/i);
  if (rangeMatch) {
    const days = parseDayCodes(rangeMatch[1]);
    const startTime = parseTime(rangeMatch[2] + (rangeMatch[4] || ''));
    const endTime = parseTime(rangeMatch[3] + (rangeMatch[4] || ''));
    
    const slots: TimeSlot[] = days.map(day => ({
      day,
      start: DAY_OFFSETS[day] + timeToMinutes(startTime.hours, startTime.minutes),
      end: DAY_OFFSETS[day] + timeToMinutes(endTime.hours, endTime.minutes)
    }));

    const dayNames = days.map(d => DAY_CODES[d]).join('/');
    const label = `${dayNames} ${formatTime12Hour(startTime.hours, startTime.minutes)} a ${formatTime12Hour(endTime.hours, endTime.minutes)}`;
    
    return { slots, label };
  }

  // Condensed format like "MAMI7:00,7:45 pm" or "L10:45,11:30,MA7:45,8:30 am"
  const days = parseDayCodes(scheduleStr);
  const timeMatches = Array.from(scheduleStr.matchAll(/(\d+):(\d+)/g));
  const periodMatch = scheduleStr.match(/(am|pm)/i);
  const period = periodMatch ? periodMatch[1].toLowerCase() : 'am';
  
  if (timeMatches.length === 0 || days.length === 0) {
    return { slots: [], label: scheduleStr };
  }

  // Parse all times mentioned
  const times = timeMatches.map(m => {
    const hours = parseInt(m[1]);
    const minutes = parseInt(m[2]);
    return { hours, minutes };
  });

  // Calculate session duration based on credits
  // Each credit = 45 minutes total
  const totalMinutes = credits * 45;
  const sessionsPerWeek = days.length;
  const minutesPerSession = Math.floor(totalMinutes / sessionsPerWeek);

  const slots: TimeSlot[] = [];
  const labelParts: string[] = [];

  // Use the first time as start time for each day
  const startTime = times[0];
  let { hours: startHours, minutes: startMinutes } = startTime;
  
  // Apply AM/PM
  if (period === 'pm' && startHours !== 12) startHours += 12;
  if (period === 'am' && startHours === 12) startHours = 0;

  const startTotalMinutes = timeToMinutes(startHours, startMinutes);
  const endTotalMinutes = startTotalMinutes + minutesPerSession;
  const endTime = minutesToTime(endTotalMinutes);

  days.forEach(day => {
    slots.push({
      day,
      start: DAY_OFFSETS[day] + startTotalMinutes,
      end: DAY_OFFSETS[day] + endTotalMinutes
    });
  });

  const dayNames = days.map(d => DAY_CODES[d]).join('/');
  const label = `${dayNames} ${formatTime12Hour(startHours, startMinutes)} a ${formatTime12Hour(endTime.hours, endTime.minutes)}`;

  return { slots, label };
}

function parseTxtLine(line: string, coursesMap: Map<string, Course>): Section | null {
  // Skip closed sections
  if (line.trim().startsWith('Cerrado')) {
    return null;
  }

  // Split by tabs
  const parts = line.split('\t').map(p => p.trim()).filter(p => p);
  
  if (parts.length < 3) return null;

  const crn = parts[0];
  const subjectName = parts[1];
  const schedule = parts[2];
  const room = parts[3] || 'TBA';

  // Extract course ID from CRN (e.g., ESP095001 -> ESP-095)
  const crnMatch = crn.match(/^([A-Z]+)(\d{3})/);
  if (!crnMatch) return null;
  
  const courseId = `${crnMatch[1]}-${crnMatch[2]}`;
  const course = coursesMap.get(courseId);
  
  if (!course) {
    console.warn(`Course not found for CRN ${crn} (${courseId})`);
    return null;
  }

  const { slots, label } = parseSchedule(schedule, course.credits);

  return {
    crn,
    label,
    room,
    career: 'MED',
    closed: false,
    slots
  };
}

function main() {
  console.log('Starting sections merge...');

  // Read courses.json
  const coursesData: Course[] = JSON.parse(
    readFileSync(join(process.cwd(), 'client/src/data/courses.json'), 'utf-8')
  );

  // Create courses map for quick lookup
  const coursesMap = new Map<string, Course>();
  coursesData.forEach(course => {
    coursesMap.set(course.id, course);
  });

  // Read existing sections JSON
  const existingSections: SectionsData = JSON.parse(
    readFileSync(join(process.cwd(), 'attached_assets/medicine-2013-sections_1759011415431.json'), 'utf-8')
  );

  // Read TXT file
  const txtContent = readFileSync(
    join(process.cwd(), 'attached_assets/remaining-sections_1759467772127.txt'),
    'utf-8'
  );

  // Parse TXT lines
  const txtLines = txtContent.split('\n').filter(line => line.trim());
  const newSections: Section[] = [];

  txtLines.forEach(line => {
    const section = parseTxtLine(line, coursesMap);
    if (section) {
      newSections.push(section);
    }
  });

  console.log(`Parsed ${newSections.length} sections from TXT file`);

  // Create a map of existing sections by CRN
  const existingSectionsByCRN = new Map<string, Section>();
  existingSections.courses.forEach(course => {
    course.sections.forEach(section => {
      existingSectionsByCRN.set(section.crn, section);
    });
  });

  // Group new sections by course name
  const newSectionsByCourse = new Map<string, Section[]>();
  newSections.forEach(section => {
    const crnMatch = section.crn.match(/^([A-Z]+)(\d{3})/);
    if (!crnMatch) return;
    
    const courseId = `${crnMatch[1]}-${crnMatch[2]}`;
    const course = coursesMap.get(courseId);
    
    if (course) {
      if (!newSectionsByCourse.has(course.name)) {
        newSectionsByCourse.set(course.name, []);
      }
      newSectionsByCourse.get(course.name)!.push(section);
    }
  });

  // Merge sections
  const mergedCourses: CourseWithSections[] = [...existingSections.courses];
  const existingCourseNames = new Set(existingSections.courses.map(c => c.name));

  newSectionsByCourse.forEach((sections, courseName) => {
    if (existingCourseNames.has(courseName)) {
      // Add to existing course
      const course = mergedCourses.find(c => c.name === courseName)!;
      sections.forEach(newSection => {
        // Only add if CRN doesn't exist
        if (!course.sections.find(s => s.crn === newSection.crn)) {
          course.sections.push(newSection);
        }
      });
    } else {
      // Create new course entry
      const crnMatch = sections[0].crn.match(/^([A-Z]+)(\d{3})/);
      const courseId = crnMatch ? `${crnMatch[1]}-${crnMatch[2]}` : null;
      
      mergedCourses.push({
        name: courseName,
        id: courseId,
        sections
      });
    }
  });

  // Sort courses by name
  mergedCourses.sort((a, b) => a.name.localeCompare(b.name));

  // Write merged data
  const outputPath = join(process.cwd(), 'client/src/data/sections-merged.json');
  writeFileSync(
    outputPath,
    JSON.stringify({ courses: mergedCourses }, null, 2)
  );

  console.log(`Merged sections written to ${outputPath}`);
  console.log(`Total courses: ${mergedCourses.length}`);
  console.log(`Total sections: ${mergedCourses.reduce((sum, c) => sum + c.sections.length, 0)}`);
}

main();
