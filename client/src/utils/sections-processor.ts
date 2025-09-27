// Utility to process and fix the sections data
export interface ProcessedSection {
  crn: string;
  label: string;
  room: string;
  career: string;
  closed: boolean;
  slots: TimeSlot[];
}

export interface TimeSlot {
  day: string;
  start: number;
  end: number;
}

export interface ProcessedCourse {
  name: string;
  id: string | null;
  sections: ProcessedSection[];
}

export interface SectionsData {
  courses: ProcessedCourse[];
}

// Convert minutes since midnight to HH:MM format
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Convert HH:MM format to minutes since midnight
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Parse time from label (e.g., "J7:00 a 10:00 am", "MI9:15 a 12:15 am")
export function parseTimeFromLabel(label: string): { start: number; end: number; days: string[] } | null {
  try {
    // Extract day abbreviations and time range
    const dayMatch = label.match(/^([LMIJVS]+)/);
    if (!dayMatch) return null;
    
    const daysStr = dayMatch[1];
    const days = [];
    
    // Parse individual day codes
    let i = 0;
    while (i < daysStr.length) {
      if (i < daysStr.length - 1 && daysStr.substr(i, 2) === 'MI') {
        days.push('MI');
        i += 2;
      } else {
        days.push(daysStr[i]);
        i += 1;
      }
    }
    
    // Extract time range (e.g., "7:00 a 10:00 am")
    const timeMatch = label.match(/(\d+):(\d+)\s+a\s+(\d+):(\d+)\s+(am|pm)/);
    if (!timeMatch) return null;
    
    const [, startHour, startMin, endHour, endMin, period] = timeMatch;
    
    let startMinutes = parseInt(startHour) * 60 + parseInt(startMin);
    let endMinutes = parseInt(endHour) * 60 + parseInt(endMin);
    
    // Convert to 24-hour format
    if (period === 'pm' && parseInt(startHour) !== 12) {
      startMinutes += 12 * 60;
    }
    if (period === 'pm' && parseInt(endHour) !== 12) {
      endMinutes += 12 * 60;
    }
    if (period === 'am' && parseInt(startHour) === 12) {
      startMinutes -= 12 * 60;
    }
    if (period === 'am' && parseInt(endHour) === 12) {
      endMinutes -= 12 * 60;
    }
    
    return { start: startMinutes, end: endMinutes, days };
  } catch (error) {
    console.warn('Failed to parse time from label:', label, error);
    return null;
  }
}

// Fix slot timing issues in the sections data
export function fixSectionSlots(section: ProcessedSection): ProcessedSection {
  const fixed = { ...section };
  
  // Try to fix slots using the label
  const parsedTime = parseTimeFromLabel(section.label);
  if (parsedTime) {
    const { start, end, days } = parsedTime;
    
    // Create corrected slots
    fixed.slots = days.map(day => ({
      day,
      start,
      end
    }));
  } else {
    // Fix existing slots where end < start (likely PM/AM confusion)
    fixed.slots = section.slots.map(slot => {
      if (slot.end < slot.start) {
        // If end is less than start, likely an AM/PM issue
        // Add 12 hours (720 minutes) to the end time
        return { ...slot, end: slot.end + 720 };
      }
      return slot;
    });
  }
  
  return fixed;
}

// Process the entire sections data
export function processSectionsData(rawData: SectionsData): SectionsData {
  return {
    courses: rawData.courses.map(course => ({
      ...course,
      sections: course.sections.map(fixSectionSlots)
    }))
  };
}

// Check for schedule conflicts between two sections
export function hasScheduleConflict(section1: ProcessedSection, section2: ProcessedSection): boolean {
  for (const slot1 of section1.slots) {
    for (const slot2 of section2.slots) {
      if (slot1.day === slot2.day) {
        // Check if times overlap
        if (!(slot1.end <= slot2.start || slot2.end <= slot1.start)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Format schedule for display
export function formatScheduleDisplay(section: ProcessedSection): string {
  const dayNames: Record<string, string> = {
    'L': 'Lun',
    'MI': 'Mié', 
    'J': 'Jue',
    'V': 'Vie',
    'S': 'Sáb'
  };
  
  const schedules = section.slots.map(slot => {
    const dayName = dayNames[slot.day] || slot.day;
    const startTime = minutesToTime(slot.start);
    const endTime = minutesToTime(slot.end);
    return `${dayName} ${startTime}-${endTime}`;
  });
  
  return schedules.join(', ');
}