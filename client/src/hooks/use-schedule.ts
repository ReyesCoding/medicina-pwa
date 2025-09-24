import { useState, useEffect } from 'react';
import { Section, ScheduleConflict, CoursePlan } from '@/types';

const SCHEDULE_STORAGE_KEY = 'medicina-course-plan';

export function useSchedule() {
  const [coursePlan, setCoursePlan] = useState<CoursePlan[]>([]);

  useEffect(() => {
    // Load from localStorage
    const saved = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setCoursePlan(data);
      } catch (error) {
        console.error('Error loading course plan:', error);
      }
    }
  }, []);

  const savePlan = (newPlan: CoursePlan[]) => {
    setCoursePlan(newPlan);
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(newPlan));
  };

  const addCourseToPlan = (courseId: string, plannedTerm: number, sectionId?: string, priority = 1) => {
    const newPlan = [...coursePlan];
    const existingIndex = newPlan.findIndex(item => item.courseId === courseId);
    
    if (existingIndex >= 0) {
      newPlan[existingIndex] = { courseId, plannedTerm, sectionId, priority };
    } else {
      newPlan.push({ courseId, plannedTerm, sectionId, priority });
    }
    
    savePlan(newPlan);
  };

  const removeCourseFromPlan = (courseId: string) => {
    const newPlan = coursePlan.filter(item => item.courseId !== courseId);
    savePlan(newPlan);
  };

  const updateSectionSelection = (courseId: string, sectionId: string) => {
    const newPlan = coursePlan.map(item => 
      item.courseId === courseId 
        ? { ...item, sectionId }
        : item
    );
    savePlan(newPlan);
  };

  const detectScheduleConflicts = (sections: Section[]): ScheduleConflict[] => {
    const conflicts: ScheduleConflict[] = [];
    const selectedSections = coursePlan
      .filter(plan => plan.sectionId)
      .map(plan => sections.find(section => section.id === plan.sectionId))
      .filter(section => section !== undefined) as Section[];

    for (let i = 0; i < selectedSections.length; i++) {
      for (let j = i + 1; j < selectedSections.length; j++) {
        const section1 = selectedSections[i];
        const section2 = selectedSections[j];
        
        const conflict = findTimeConflict(section1, section2);
        if (conflict) {
          conflicts.push({
            course1: section1.courseId,
            course2: section2.courseId,
            conflictTime: conflict
          });
        }
      }
    }

    return conflicts;
  };

  const findTimeConflict = (section1: Section, section2: Section): string | null => {
    for (const schedule1 of section1.schedule) {
      for (const schedule2 of section2.schedule) {
        if (schedule1.day === schedule2.day) {
          const start1 = timeToMinutes(schedule1.startTime);
          const end1 = timeToMinutes(schedule1.endTime);
          const start2 = timeToMinutes(schedule2.startTime);
          const end2 = timeToMinutes(schedule2.endTime);

          if ((start1 < end2 && end1 > start2)) {
            return `${schedule1.day} ${schedule1.startTime}-${schedule1.endTime}`;
          }
        }
      }
    }
    return null;
  };

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const getCoursesInPlan = (): Set<string> => {
    return new Set(coursePlan.map(plan => plan.courseId));
  };

  const getPlannedTermCredits = (term: number, courses: any[]): number => {
    return coursePlan
      .filter(plan => plan.plannedTerm === term)
      .reduce((total, plan) => {
        const course = courses.find(c => c.id === plan.courseId);
        return total + (course?.credits || 0);
      }, 0);
  };

  const suggestCoursesForTerm = (
    term: number, 
    availableCourses: any[], 
    maxCredits = 22
  ): string[] => {
    // Simple suggestion algorithm
    const currentCredits = getPlannedTermCredits(term, availableCourses);
    const remainingCredits = maxCredits - currentCredits;
    
    const suggestions: string[] = [];
    let creditsToAdd = 0;
    
    // Prioritize required courses for the term
    const termCourses = availableCourses
      .filter(course => course.term === term && !course.isElective)
      .filter(course => !coursePlan.some(plan => plan.courseId === course.id))
      .sort((a, b) => a.credits - b.credits); // Start with lower credit courses

    for (const course of termCourses) {
      if (creditsToAdd + course.credits <= remainingCredits) {
        suggestions.push(course.id);
        creditsToAdd += course.credits;
      }
    }

    return suggestions;
  };

  return {
    coursePlan,
    addCourseToPlan,
    removeCourseFromPlan,
    updateSectionSelection,
    detectScheduleConflicts,
    getCoursesInPlan,
    getPlannedTermCredits,
    suggestCoursesForTerm
  };
}
