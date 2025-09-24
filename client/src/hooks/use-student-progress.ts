import { useState, useEffect } from 'react';
import { StudentProgress, CourseStatus, Course } from '@/types';

const STORAGE_KEY = 'medicina-student-progress';

export function useStudentProgress() {
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
    setProgress(newProgress);
    const data = Object.fromEntries(newProgress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const markCoursePassed = (courseId: string, grade?: string) => {
    const newProgress = new Map(progress);
    newProgress.set(courseId, {
      courseId,
      status: 'passed',
      grade,
      completedAt: new Date().toISOString()
    });
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
    const courseProgress = progress.get(course.id);
    
    if (courseProgress?.status === 'passed') {
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

  return {
    progress,
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
}
