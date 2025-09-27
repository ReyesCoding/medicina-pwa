import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useCourseData } from '@/hooks/use-course-data';
import { useStudentProgress } from '@/contexts/student-progress-context';

export function ProgressHeader() {
  const { courses, loading } = useCourseData();
  const { passedCourses, updateCourses } = useStudentProgress();
  
  // Update courses in context when they're loaded
  useEffect(() => {
    if (courses.length > 0) {
      updateCourses(courses);
    }
  }, [courses, updateCourses]);
  
  console.log('[ProgressHeader] Rendering with passedCourses size:', passedCourses.size, 'courses loaded:', courses.length, 'loading:', loading);
  console.log('[ProgressHeader] Passed course IDs:', Array.from(passedCourses));
  
  // Early return if courses not loaded yet
  if (loading || courses.length === 0) {
    console.log('[ProgressHeader] Courses not loaded yet, showing default state');
    return (
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Planificador del Currículo de Medicina</h1>
            <p className="text-sm text-muted-foreground">Programa UTESA 2013 • 18 Semestres + Proyecto Final</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              <span data-testid="courses-passed">0</span> de <span data-testid="total-courses">42</span> materias aprobadas
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32 bg-muted rounded-full h-2">
                <div 
                  className="bg-success h-2 rounded-full transition-all duration-300" 
                  style={{ width: `0%` }}
                  data-testid="progress-bar"
                />
              </div>
              <span className="text-sm font-medium text-foreground" data-testid="progress-percentage">
                0%
              </span>
            </div>
          </div>
        </div>
      </header>
    );
  }
  
  // Calculate totals consistently using reactive passedCourses
  const passedCount = passedCourses.size;
  const totalCourses = courses.length;
  
  // Calculate passed credits from reactive passedCourses
  const passedCredits = courses
    .filter(course => passedCourses.has(course.id))
    .reduce((sum, course) => sum + course.credits, 0);
  
  const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
  const progressPercentage = totalCredits > 0 ? Math.round((passedCredits / totalCredits) * 100) : 0;
  
  console.log('[ProgressHeader] FINAL VALUES - passedCount:', passedCount, 'totalCourses:', totalCourses, 'passedCredits:', passedCredits, 'totalCredits:', totalCredits, 'progressPercentage:', progressPercentage);

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planificador del Currículo de Medicina</h1>
          <p className="text-sm text-muted-foreground">Programa UTESA 2013 • 18 Semestres + Proyecto Final</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span data-testid="courses-passed">{passedCount}</span> de <span data-testid="total-courses">{courses.length}</span> materias aprobadas
          </div>
          <div className="flex items-center gap-2">
            <div className="w-32 bg-muted rounded-full h-2">
              <div 
                className="bg-success h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progressPercentage}%` }}
                data-testid="progress-bar"
              />
            </div>
            <span className="text-sm font-medium text-foreground" data-testid="progress-percentage">
              {progressPercentage}%
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
