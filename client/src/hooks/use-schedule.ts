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
    passedCourses: Set<string>,
    getCourseStatus: (course: any, passedCourses: Set<string>, plannedCourses?: Set<string>) => string,
    maxCredits = 22
  ): string[] => {
    const currentCredits = getPlannedTermCredits(term, availableCourses);
    const remainingCredits = maxCredits - currentCredits;
    
    const suggestions: string[] = [];
    let creditsToAdd = 0;
    
    // Get courses already in plan to avoid duplicates
    const plannedCourseIds = new Set(coursePlan.map(plan => plan.courseId));
    
    // Build corequisite clusters
    const corequisiteClusters = buildCorequisiteClusters(availableCourses, passedCourses, plannedCourseIds);
    
    const usedCourseIds = new Set<string>();
    
    // Process clusters by priority: required term, electives, catch-up
    const processClustersByPriority = (filterFn: (course: any) => boolean) => {
      for (const cluster of corequisiteClusters) {
        // Skip if any course in cluster is already used
        if (cluster.some(courseId => usedCourseIds.has(courseId))) {
          continue;
        }
        
        const clusterCourses = cluster.map(id => availableCourses.find(c => c.id === id)).filter(Boolean);
        if (clusterCourses.length === 0) continue;
        
        // Check if cluster matches filter criteria
        if (!clusterCourses.some(filterFn)) continue;
        
        // Calculate total credits for the cluster
        const clusterCredits = clusterCourses.reduce((sum, course) => sum + course.credits, 0);
        
        if (creditsToAdd + clusterCredits > remainingCredits) continue;
        
        // Check availability for the entire cluster
        let allAvailable = false;
        
        if (clusterCourses.length === 1) {
          // Single course - check normally
          const course = clusterCourses[0];
          allAvailable = getCourseStatus(course, passedCourses, plannedCourseIds) === 'available' &&
                        (!course.isElective || isElectiveAvailableForTerm(course, term));
        } else {
          // Corequisite cluster - simulate planning them together
          const clusterPlannedSet = new Set([...Array.from(plannedCourseIds), ...cluster]);
          allAvailable = clusterCourses.every(course => {
            const status = getCourseStatus(course, passedCourses, clusterPlannedSet);
            return status === 'available' && (!course.isElective || isElectiveAvailableForTerm(course, term));
          });
        }
        
        if (allAvailable) {
          cluster.forEach(courseId => {
            suggestions.push(courseId);
            usedCourseIds.add(courseId);
          });
          creditsToAdd += clusterCredits;
        }
      }
    };
    
    // 1. Process required courses for the exact term
    processClustersByPriority(course => course.term === term && !course.isElective);
    
    // 2. Process electives available for this term
    processClustersByPriority(course => course.isElective && isElectiveAvailableForTerm(course, term));
    
    // 3. Process catch-up required courses from earlier terms
    processClustersByPriority(course => course.term < term && !course.isElective);

    return suggestions;
  };

  // Helper function to build corequisite clusters
  const buildCorequisiteClusters = (
    allCourses: any[], 
    passedCourses: Set<string>, 
    plannedCourseIds: Set<string>
  ): string[][] => {
    const clusters: string[][] = [];
    const processedCourses = new Set<string>();
    
    for (const course of allCourses) {
      if (processedCourses.has(course.id) || 
          passedCourses.has(course.id) || 
          plannedCourseIds.has(course.id)) {
        continue;
      }
      
      if (!course.corequisites || course.corequisites.length === 0) {
        // Single course cluster
        clusters.push([course.id]);
        processedCourses.add(course.id);
      } else {
        // Build corequisite cluster
        const cluster = new Set([course.id]);
        const toProcess = [...course.corequisites];
        
        while (toProcess.length > 0) {
          const coreqId = toProcess.shift()!;
          if (!cluster.has(coreqId) && 
              !passedCourses.has(coreqId) && 
              !plannedCourseIds.has(coreqId)) {
            cluster.add(coreqId);
            
            // Find the corequisite course and add its corequisites too
            const coreqCourse = allCourses.find(c => c.id === coreqId);
            if (coreqCourse && coreqCourse.corequisites) {
              coreqCourse.corequisites.forEach((nestedCoreq: string) => {
                if (!cluster.has(nestedCoreq)) {
                  toProcess.push(nestedCoreq);
                }
              });
            }
          }
        }
        
        const clusterArray = Array.from(cluster);
        clusters.push(clusterArray);
        clusterArray.forEach(id => processedCourses.add(id));
      }
    }
    
    return clusters;
  };

  // Helper function to determine if an elective is available for a specific term
  const isElectiveAvailableForTerm = (course: any, currentTerm: number): boolean => {
    if (!course.isElective) return false;
    
    // General electives are available after term 6
    if (course.electiveType === 'general' && currentTerm >= 6) {
      return true;
    }
    
    // Professional electives for basic sciences (available after term 11)
    if (course.electiveType === 'professional' && course.term <= 11 && currentTerm >= 11) {
      return true;
    }
    
    // Professional electives for clinical sciences (available after term 15)  
    if (course.electiveType === 'professional' && course.term > 11 && currentTerm >= 15) {
      return true;
    }
    
    return false;
  };

  return {
    coursePlan,
    addCourseToPlan,
    removeCourseFromPlan,
    updateSectionSelection,
    detectScheduleConflicts,
    getCoursesInPlan,
    getPlannedTermCredits,
    suggestCoursesForTerm,
    isElectiveAvailableForTerm,
    buildCorequisiteClusters
  };
}
