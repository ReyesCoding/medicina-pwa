import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { StudentProgress, CourseStatus, Course } from '@/types';

const STORAGE_KEY = 'medicina-student-progress';

interface StudentProgressContextType {
  progress: Map<string, StudentProgress>;
  passedCourses: Set<string>;
  plannedCourses: Set<string>;
  markCoursePassed: (courseId: string, grade?: string) => void;
  markCourseInProgress: (courseId: string, sectionId?: string) => void;
  markCoursePlanned: (courseId: string, sectionId?: string) => void;
  removeCourseProgress: (courseId: string) => void;
  getCourseStatus: (course: Course, passedCourses: Set<string>, plannedCourses?: Set<string>) => CourseStatus;
  getPassedCourses: () => Set<string>;
  getPlannedCourses: () => Set<string>;
  getTotalCredits: (courses: Course[]) => { passed: number; planned: number; total: number };
  calculateGPA: () => number;
  updateCourses: (courses: Course[]) => void;
}

const StudentProgressContext = createContext<StudentProgressContextType | undefined>(undefined);

export function useStudentProgress() {
  const context = useContext(StudentProgressContext);
  if (context === undefined) {
    throw new Error('useStudentProgress must be used within a StudentProgressProvider');
  }
  return context;
}

interface StudentProgressProviderProps {
  children: ReactNode;
}

export function StudentProgressProvider({ children }: StudentProgressProviderProps) {
  const [progress, setProgress] = useState<Map<string, StudentProgress>>(new Map());
  const [allCourses, setAllCourses] = useState<Course[]>([]);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        const progressMap = new Map(Object.entries(data) as [string, StudentProgress][]);
        setProgress(progressMap);
      } catch (error) {
        console.error('Error loading progress:', error);
      }
    }
  }, []);

  const saveProgress = (newProgress: Map<string, StudentProgress>) => {
    console.log('[saveProgress] Updating progress state, size:', newProgress.size);
    setProgress(newProgress);
    const data = Object.fromEntries(newProgress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('[saveProgress] localStorage updated:', Object.keys(data));
  };

  const markCoursePassed = (courseId: string, grade?: string) => {
    console.log('[markCoursePassed] Called for:', courseId);
    
    // Validate that grade is C or above (if provided)
    if (grade && !['A', 'B', 'C'].includes(grade)) {
      console.warn('[markCoursePassed] Grade must be C or above to pass. Received:', grade);
      return;
    }
    
    const newProgress = new Map(progress);
    newProgress.set(courseId, {
      courseId,
      status: 'passed',
      grade,
      completedAt: new Date().toISOString()
    });
    console.log('[markCoursePassed] New progress size:', newProgress.size);
    saveProgress(newProgress);
  };

  const markCourseInProgress = (courseId: string, sectionId?: string) => {
    const newProgress = new Map(progress);
    newProgress.set(courseId, {
      courseId,
      status: 'in_progress',
      sectionId
    });
    saveProgress(newProgress);
  };

  const markCoursePlanned = (courseId: string, sectionId?: string) => {
    const newProgress = new Map(progress);
    newProgress.set(courseId, {
      courseId,
      status: 'planned',
      sectionId
    });
    saveProgress(newProgress);
  };

  const removeCourseProgress = (courseId: string) => {
    const newProgress = new Map(progress);
    newProgress.delete(courseId);
    saveProgress(newProgress);
  };

  const getCourseStatus = (course: Course, passedCourses: Set<string>, plannedCourses?: Set<string>): CourseStatus => {
    // Use the passed Set directly instead of accessing progress Map
    if (passedCourses.has(course.id)) {
      return 'passed';
    }

    // Check prerequisites - if prerequisites array is empty, course is not blocked by prereqs
    if (course.prerequisites.length > 0) {
      for (const prereq of course.prerequisites) {
        if (!passedCourses.has(prereq)) {
          return 'blocked';
        }
      }
    }

    // Check corequisites - allow if any corequisite is passed, planned, or being planned together
    // OR if the course has no prerequisites (corequisites can be taken together)
    if (course.corequisites.length > 0) {
      const hasPassedCoreq = course.corequisites.some(coreq => passedCourses.has(coreq));
      const hasPlannedCoreq = course.corequisites.some(coreq => {
        const coreqProgress = progress.get(coreq);
        return coreqProgress?.status === 'planned' || coreqProgress?.status === 'in_progress';
      });
      const hasSamePlanCoreq = plannedCourses ? course.corequisites.some(coreq => plannedCourses.has(coreq)) : false;
      
      // Allow if ANY corequisite condition is met OR if course has no prerequisites
      // (courses with only corequisites can be taken together)
      if (!hasPassedCoreq && !hasPlannedCoreq && !hasSamePlanCoreq && course.prerequisites.length > 0) {
        return 'blocked';
      }
    }

    // Check elective availability based on student's academic progress
    if (course.isElective) {
      const studentProgress = calculateStudentTermProgress(passedCourses, plannedCourses || new Set());
      
      // General electives available when student has reached term 6
      if (course.electiveType === 'general' && studentProgress < 6) {
        return 'blocked';
      }
      
      // Professional electives for basic sciences available when reached term 11
      if (course.electiveType === 'professional' && course.term <= 11 && studentProgress < 11) {
        return 'blocked';
      }
      
      // Professional electives for clinical sciences available when reached term 15
      if (course.electiveType === 'professional' && course.term > 11 && studentProgress < 15) {
        return 'blocked';
      }
    }

    return 'available';
  };

  // Helper function to determine student's current term progress based on passed and planned courses
  const calculateStudentTermProgress = (passedCourses: Set<string>, plannedCourses: Set<string>): number => {
    if (allCourses.length === 0) return 0;
    
    // Combine passed and planned courses to determine current academic standing
    const completedOrPlanned = new Set([...Array.from(passedCourses), ...Array.from(plannedCourses)]);
    let highestTerm = 0;
    
    // Find highest term where student has completed or is planning significant progress
    for (let term = 1; term <= 18; term++) {
      const termRequiredCourses = allCourses.filter(course => 
        course.term === term && !course.isElective
      );
      
      const completedTermCourses = termRequiredCourses.filter(course => 
        completedOrPlanned.has(course.id)
      );
      
      // Consider term "reached" if student has 50% or more courses completed/planned
      if (termRequiredCourses.length > 0 && 
          completedTermCourses.length / termRequiredCourses.length >= 0.5) {
        highestTerm = term;
      }
    }
    
    return highestTerm;
  };

  const getPassedCourses = (): Set<string> => {
    const passed = new Set<string>();
    progress.forEach((prog, courseId) => {
      if (prog.status === 'passed') {
        passed.add(courseId);
      }
    });
    return passed;
  };

  const getPlannedCourses = (): Set<string> => {
    const planned = new Set<string>();
    progress.forEach((prog, courseId) => {
      if (prog.status === 'planned' || prog.status === 'in_progress') {
        planned.add(courseId);
      }
    });
    return planned;
  };

  const getTotalCredits = (courses: Course[]): { passed: number; planned: number; total: number } => {
    let passedCredits = 0;
    let plannedCredits = 0;
    let totalCredits = 0;

    courses.forEach(course => {
      totalCredits += course.credits;
      const courseProgress = progress.get(course.id);
      
      if (courseProgress?.status === 'passed') {
        passedCredits += course.credits;
      } else if (courseProgress?.status === 'planned' || courseProgress?.status === 'in_progress') {
        plannedCredits += course.credits;
      }
    });

    return { passed: passedCredits, planned: plannedCredits, total: totalCredits };
  };

  const calculateGPA = (): number => {
    let totalPoints = 0;
    let totalCredits = 0;

    progress.forEach((prog) => {
      if (prog.status === 'passed' && prog.grade) {
        const gradePoints = getGradePoints(prog.grade);
        if (gradePoints !== null) {
          totalPoints += gradePoints * getCourseCredits(prog.courseId);
          totalCredits += getCourseCredits(prog.courseId);
        }
      }
    });

    return totalCredits > 0 ? totalPoints / totalCredits : 0;
  };

  // Update courses when needed (to be called from components that have course data)
  const updateCourses = (courses: Course[]) => {
    setAllCourses(courses);
  };

  const getCourseCredits = (courseId: string): number => {
    const course = allCourses.find(c => c.id === courseId);
    return course?.credits || 3; // fallback to 3 if course not found
  };

  const getGradePoints = (grade: string): number | null => {
    const gradeMap: { [key: string]: number } = {
      'A': 4.0,
      'B': 3.0,
      'C': 2.0,
      'D': 1.0,
      'F': 0.0
    };
    return gradeMap[grade] ?? null;
  };

  // Reactive values that trigger re-renders when progress changes
  const passedCourses = useMemo(() => {
    console.log('[passedCourses useMemo] Recalculating with progress size:', progress.size);
    const passed = new Set<string>();
    progress.forEach((prog, courseId) => {
      if (prog.status === 'passed') {
        passed.add(courseId);
      }
    });
    console.log('[passedCourses useMemo] Passed courses:', Array.from(passed));
    return passed;
  }, [progress]);

  const plannedCourses = useMemo(() => {
    const planned = new Set<string>();
    progress.forEach((prog, courseId) => {
      if (prog.status === 'planned' || prog.status === 'in_progress') {
        planned.add(courseId);
      }
    });
    return planned;
  }, [progress]);

  const value = {
    progress,
    passedCourses,
    plannedCourses,
    markCoursePassed,
    markCourseInProgress,
    markCoursePlanned,
    removeCourseProgress,
    getCourseStatus,
    getPassedCourses,
    getPlannedCourses,
    getTotalCredits,
    calculateGPA,
    updateCourses
  };

  return (
    <StudentProgressContext.Provider value={value}>
      {children}
    </StudentProgressContext.Provider>
  );
}