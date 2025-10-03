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
      } else if (i < daysStr.length - 1 && daysStr.substr(i, 2) === 'MA') {
        days.push('MA');
        i += 2;
      } else {
        days.push(daysStr[i]);
        i += 1;
      }
    }
    
    // Extract time range (e.g., "7:00 a 10:00 am")
    const timeMatch = label.match(/(\d+):(\d+)\s+a\s+(\d+):(\d+)\s+(am|pm)/i);
    if (!timeMatch) return null;
    
    const [, startHour, startMin, endHour, endMin, period] = timeMatch;
    
    let startMinutes = parseInt(startHour) * 60 + parseInt(startMin);
    let endMinutes = parseInt(endHour) * 60 + parseInt(endMin);
    
    // Convert to 24-hour format
    const isAM = period.toLowerCase() === 'am';
    const isPM = period.toLowerCase() === 'pm';
    
    if (isPM && parseInt(startHour) !== 12) {
      startMinutes += 12 * 60;
    }
    if (isPM && parseInt(endHour) !== 12) {
      endMinutes += 12 * 60;
    }
    if (isAM && parseInt(startHour) === 12) {
      startMinutes -= 12 * 60;
    }
    if (isAM && parseInt(endHour) === 12) {
      // Handle "12:xx am" edge case - if start > end, treat 12:xx am as 12:xx PM (noon)
      endMinutes -= 12 * 60;
      if (endMinutes < 0) endMinutes = 0;
    }
    
    // Fix: if end < start and end hour was 12 with AM, it likely means PM (noon)
    if (endMinutes < startMinutes && parseInt(endHour) === 12 && isAM) {
      endMinutes += 12 * 60; // Convert to PM
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
    
    // Day offsets for calculating absolute time
    const dayOffsets: Record<string, number> = {
      'L': 0,        // Monday
      'MA': 1440,    // Tuesday
      'MI': 2880,    // Wednesday
      'J': 4320,     // Thursday
      'V': 5760,     // Friday
      'S': 7200      // Saturday
    };
    
    // Create corrected slots with day offsets
    fixed.slots = days.map(day => ({
      day,
      start: (dayOffsets[day] || 0) + start,
      end: (dayOffsets[day] || 0) + end
    }));
  } else {
    // Fix existing slots where end < start (likely PM/AM confusion)
    fixed.slots = section.slots.map(slot => {
      // Extract day offset
      const dayOffsets: Record<string, number> = {
        'L': 0,
        'MA': 1440,
        'MI': 2880,
        'J': 4320,
        'V': 5760,
        'S': 7200
      };
      
      const dayOffset = dayOffsets[slot.day] || 0;
      const startTime = slot.start - dayOffset;
      const endTime = slot.end - dayOffset;
      
      if (endTime < startTime) {
        // If end is less than start, likely an AM/PM issue
        // Add 12 hours (720 minutes) to the end time
        return { ...slot, end: dayOffset + endTime + 720 };
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

// Convert 24-hour time to 12-hour format
function formatTime12Hour(minutes: number): string {
  const totalMinutes = minutes % 1440; // Handle overflow
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
}

// Format schedule for display in 12-hour format
export function formatScheduleDisplay(section: ProcessedSection): string {
  // If it's a virtual class, return the label as is
  if (section.label.toLowerCase().includes('virtual')) {
    return section.label;
  }
  
  const dayNames: Record<string, string> = {
    'L': 'Lun',
    'MI': 'Mié', 
    'J': 'Jue',
    'V': 'Vie',
    'S': 'Sáb',
    'MA': 'Mar'
  };
  
  if (section.slots.length === 0) {
    return section.label;
  }
  
  // Group slots by day
  const dayGroups = new Map<string, { start: number; end: number }>();
  
  section.slots.forEach(slot => {
    const dayOffset = slot.day === 'L' ? 0 : 
                      slot.day === 'MA' ? 1440 :
                      slot.day === 'MI' ? 2880 :
                      slot.day === 'J' ? 4320 :
                      slot.day === 'V' ? 5760 :
                      slot.day === 'S' ? 7200 : 0;
    
    const startMinutes = slot.start - dayOffset;
    const endMinutes = slot.end - dayOffset;
    
    if (!dayGroups.has(slot.day)) {
      dayGroups.set(slot.day, { start: startMinutes, end: endMinutes });
    }
  });
  
  // Check if all days have the same time
  const times = Array.from(dayGroups.values());
  const sameTime = times.every(t => t.start === times[0].start && t.end === times[0].end);
  
  if (sameTime && times.length > 0) {
    const days = Array.from(dayGroups.keys()).map(d => dayNames[d] || d).join('/');
    const startTime = formatTime12Hour(times[0].start);
    const endTime = formatTime12Hour(times[0].end);
    return `${days} ${startTime} a ${endTime}`;
  }
  
  // Different times for different days
  const schedules = Array.from(dayGroups.entries()).map(([day, time]) => {
    const dayName = dayNames[day] || day;
    const startTime = formatTime12Hour(time.start);
    const endTime = formatTime12Hour(time.end);
    return `${dayName} ${startTime} a ${endTime}`;
  });
  
  return schedules.join(', ');
}