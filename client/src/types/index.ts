export interface Course {
  id: string;
  name: string;
  credits: number;
  theoreticalHours: number;
  practicalHours: number;
  term: number;
  block: string;
  prerequisites: string[];
  corequisites: string[];
  isElective: boolean;
  electiveType: string | null;
  description: string;
}

export interface Section {
  id: string;
  courseId: string;
  sectionNumber: string;
  instructor: string;
  room: string;
  crn: string;
  schedule: {
    day: string;
    startTime: string;
    endTime: string;
  }[];
  maxCapacity: number;
  currentEnrollment: number;
}

export interface StudentProgress {
  courseId: string;
  status: 'passed' | 'in_progress' | 'planned';
  grade?: string;
  completedAt?: string;
  sectionId?: string;
}

export interface CoursePlan {
  courseId: string;
  plannedTerm: number;
  sectionId?: string;
  priority: number;
}

export type CourseStatus = 'available' | 'blocked' | 'passed';

export interface ScheduleConflict {
  course1: string;
  course2: string;
  conflictTime: string;
}

export interface FilterState {
  term: number | null;
  status: CourseStatus | null;
  electivesOnly: boolean;
  inPlanOnly: boolean;
  searchTerm: string;
}

export interface TermInfo {
  term: number;
  name: string;
  block: string;
  credits: number;
  courseCount: number;
}
