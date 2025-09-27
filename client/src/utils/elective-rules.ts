import { Course } from '@/types';

export interface ElectiveAvailabilityContext {
  passedCourses: Set<string>;
  plannedCourses?: Set<string>;
  currentTerm: number;
}

/**
 * Centralized elective availability rules
 */
export class ElectiveRules {
  /**
   * Check if an elective is available based on student progress and term
   */
  static isElectiveAvailable(course: Course, context: ElectiveAvailabilityContext): boolean {
    if (!course.isElective) return false;

    const { passedCourses, plannedCourses = new Set(), currentTerm } = context;
    const allPlannedCourses = new Set([...Array.from(passedCourses), ...Array.from(plannedCourses)]);

    // Check term-based availability
    if (!this.isElectiveAvailableForTerm(course, currentTerm)) {
      return false;
    }

    // Check progress-based availability (75% requirement)
    return this.hasProgressForElectiveType(course.electiveType || 'general', allPlannedCourses);
  }

  /**
   * Check if an elective is available for a specific term based on curriculum structure
   */
  static isElectiveAvailableForTerm(course: Course, currentTerm: number): boolean {
    if (!course.isElective) return false;

    if (course.electiveType === 'general') {
      // General electives available from term 7 onwards
      return currentTerm >= 7;
    } else if (course.electiveType === 'professional') {
      // Professional electives based on their base term
      if (course.term <= 11) {
        // Basic Sciences professional electives - available from term 12
        return currentTerm >= 12;
      } else {
        // Clinical professional electives - available from term 16
        return currentTerm >= 16;
      }
    }

    return false;
  }

  /**
   * Check if student has enough progress for the elective type
   */
  private static hasProgressForElectiveType(electiveType: string, completedCourses: Set<string>): boolean {
    if (electiveType === 'general') {
      // General electives: Need 75% of terms 1-6 basic courses
      return this.calculateTermProgress(completedCourses, [1, 2, 3, 4, 5, 6]) >= 0.75;
    } else if (electiveType === 'professional') {
      // Professional electives: Need 75% of relevant block
      // This is a simplified calculation - in practice you'd want more specific rules
      return this.calculateCurrentTermProgress(completedCourses) >= 0.75;
    }

    return false;
  }

  /**
   * Calculate progress for specific terms
   */
  private static calculateTermProgress(completedCourses: Set<string>, terms: number[]): number {
    // This is a simplified implementation
    // In practice, you'd load actual course data and calculate based on required courses for those terms
    const requiredCoursesInTerms = terms.length * 5; // Assume ~5 courses per term
    const completedCount = Array.from(completedCourses).length;
    return Math.min(completedCount / requiredCoursesInTerms, 1);
  }

  /**
   * Calculate overall current term progress
   */
  private static calculateCurrentTermProgress(completedCourses: Set<string>): number {
    // Simplified calculation based on total completed courses
    const totalRequiredCourses = 180; // Total credits / average credits per course
    const completedCount = Array.from(completedCourses).length;
    return Math.min(completedCount / totalRequiredCourses, 1);
  }
}