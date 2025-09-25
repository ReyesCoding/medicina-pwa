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
  getCourseStatus: (course: Course, passedCourses: Set<string>) => CourseStatus;
  getPassedCourses: () => Set<string>;
  getPlannedCourses: () => Set<string>;
  getTotalCredits: (courses: Course[]) => { passed: number; planned: number; total: number };
  calculateGPA: () => number;
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

  const getCourseStatus = (course: Course, passedCourses: Set<string>): CourseStatus => {
    // Use the passed Set directly instead of accessing progress Map
    if (passedCourses.has(course.id)) {
      return 'passed';
    }

    // Check prerequisites
    for (const prereq of course.prerequisites) {
      if (!passedCourses.has(prereq)) {
        return 'blocked';
      }
    }

    // Check corequisites (if any are passed, course is available)
    if (course.corequisites.length > 0) {
      const hasPassedCoreq = course.corequisites.some(coreq => passedCourses.has(coreq));
      const hasPlannedCoreq = course.corequisites.some(coreq => {
        const coreqProgress = progress.get(coreq);
        return coreqProgress?.status === 'planned' || coreqProgress?.status === 'in_progress';
      });
      
      if (!hasPassedCoreq && !hasPlannedCoreq) {
        return 'blocked';
      }
    }

    return 'available';
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

  const getCourseCredits = (courseId: string): number => {
    // This would need access to courses data
    // For now, return a default value
    return 3;
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
    calculateGPA
  };

  return (
    <StudentProgressContext.Provider value={value}>
      {children}
    </StudentProgressContext.Provider>
  );
}