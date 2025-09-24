import { Card } from '@/components/ui/card';
import { useCourseData } from '@/hooks/use-course-data';
import { useStudentProgress } from '@/hooks/use-student-progress';

export function ProgressHeader() {
  const { courses } = useCourseData();
  const { getTotalCredits, getPassedCourses } = useStudentProgress();
  
  const totalCredits = getTotalCredits(courses);
  const passedCount = getPassedCourses().size;
  const progressPercentage = Math.round((totalCredits.passed / totalCredits.total) * 100);

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Medicine Curriculum Planner</h1>
          <p className="text-sm text-muted-foreground">UTESA 2013 Program • 18 Terms + Capstone</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            <span data-testid="courses-passed">{passedCount}</span> of <span data-testid="total-courses">{courses.length}</span> courses passed
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
