import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Course, FilterState, CourseStatus } from '@/types';
import { useCourseData } from '@/hooks/use-course-data';
import { useStudentProgress } from '@/contexts/student-progress-context';
import { useSchedule } from '@/hooks/use-schedule';
import { GradeInputDialog } from '@/components/grade-input-dialog';
import { cn } from '@/lib/utils';

interface CourseListProps {
  filters: FilterState;
  onCourseSelect: (course: Course) => void;
  selectedCourse?: Course;
}

export function CourseList({ filters, onCourseSelect, selectedCourse }: CourseListProps) {
  const { courses, getAllTerms } = useCourseData();
  const { getCourseStatus, passedCourses, markCoursePassed, removeCourseProgress } = useStudentProgress();
  const { getCoursesInPlan, suggestCoursesForTerm } = useSchedule();
  
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [courseToGrade, setCourseToGrade] = useState<Course | null>(null);

  const plannedCourses = getCoursesInPlan();
  const terms = getAllTerms();

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      // Term filter
      if (filters.term && course.term !== filters.term) return false;
      
      // Status filter
      if (filters.status) {
        const status = getCourseStatus(course, passedCourses);
        if (status !== filters.status) return false;
      }
      
      // Electives only filter
      if (filters.electivesOnly && !course.isElective) return false;
      
      // In plan only filter
      if (filters.inPlanOnly && !plannedCourses.has(course.id)) return false;
      
      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!course.id.toLowerCase().includes(searchLower) && 
            !course.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });
  }, [courses, filters, passedCourses, plannedCourses]);

  const groupedCourses = useMemo(() => {
    const groups = new Map();
    
    filteredCourses.forEach(course => {
      if (!groups.has(course.term)) {
        const termInfo = terms.find(t => t.term === course.term);
        groups.set(course.term, {
          term: course.term,
          name: termInfo?.name || `Term ${course.term}`,
          block: termInfo?.block || course.block,
          courses: []
        });
      }
      groups.get(course.term).courses.push(course);
    });
    
    return Array.from(groups.values()).sort((a, b) => a.term - b.term);
  }, [filteredCourses, terms]);

  const getStatusBadge = (course: Course) => {
    const status = getCourseStatus(course, passedCourses);
    
    switch (status) {
      case 'available':
        return <Badge variant="default" className="pill ok">Available</Badge>;
      case 'blocked':
        return <Badge variant="destructive" className="pill bad">Blocked</Badge>;
      case 'passed':
        return <Badge variant="secondary" className="pill passed">Passed</Badge>;
    }
  };

  const getElectiveTag = (course: Course) => {
    if (!course.isElective) return null;
    
    const tagClass = course.electiveType === 'GEN' ? 'tag-elec gen' : 
                    course.electiveType === 'BASICAS' ? 'tag-elec basicas' :
                    'tag-elec clinicas';
    
    return (
      <span className={`tag ${tagClass}`}>
        Elective • {course.electiveType}
      </span>
    );
  };

  const handleMarkPassed = (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setCourseToGrade(course);
    setGradeDialogOpen(true);
  };

  const handleGradeConfirm = (grade: string) => {
    if (courseToGrade) {
      markCoursePassed(courseToGrade.id, grade);
      setCourseToGrade(null);
    }
  };

  const handleGradeCancel = () => {
    setCourseToGrade(null);
    setGradeDialogOpen(false);
  };

  const handleUndoPassed = (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeCourseProgress(courseId);
  };

  const handleSuggestPlan = () => {
    // This would open a modal or trigger plan suggestions
    console.log('Suggest plan functionality');
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Course Catalog</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground" data-testid="course-count">
              {filteredCourses.length} courses
            </span>
            <Button 
              size="sm" 
              onClick={handleSuggestPlan}
              data-testid="suggest-plan-btn"
            >
              Suggest Plan
            </Button>
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-8">
          {groupedCourses.map(group => (
            <div key={group.term} className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                  {group.term}
                </span>
                {group.name} - {group.block}
                <span className="text-xs text-muted-foreground">
                  ({group.courses.length} courses, {group.courses.reduce((sum: number, c: Course) => sum + c.credits, 0)} credits)
                </span>
              </h3>
              
              <div className="space-y-0">
                {group.courses.map((course: Course) => {
                  const status = getCourseStatus(course, passedCourses);
                  const isPassed = status === 'passed';
                  const isBlocked = status === 'blocked';
                  
                  return (
                    <div 
                      key={course.id}
                      className={cn(
                        "list-item cursor-pointer hover:bg-muted/50 transition-colors",
                        isPassed && "is-passed",
                        selectedCourse?.id === course.id && "bg-accent"
                      )}
                      onClick={() => onCourseSelect(course)}
                      data-testid={`course-item-${course.id}`}
                    >
                      <div className="li-left">
                        <div className="title-line flex items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">{course.id}</span>
                          <span className="text-muted-foreground">—</span>
                          <span className="text-foreground">{course.name}</span>
                          {getElectiveTag(course)}
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">
                          {course.block} • {course.credits} cr • HT {course.theoreticalHours} • HP {course.practicalHours}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Prereqs: {course.prerequisites.length > 0 ? (
                            course.prerequisites.map((prereq: string) => (
                              <span key={prereq} className="pill">{prereq}</span>
                            ))
                          ) : (
                            <span className="pill">—</span>
                          )} • Coreqs: {course.corequisites.length > 0 ? (
                            course.corequisites.map((coreq: string) => (
                              <span key={coreq} className="pill">{coreq}</span>
                            ))
                          ) : (
                            <span className="pill">—</span>
                          )}
                        </div>
                      </div>
                      <div className="li-right">
                        {getStatusBadge(course)}
                        {!isPassed ? (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            disabled={isBlocked}
                            onClick={(e) => handleMarkPassed(course, e)}
                            data-testid={`mark-passed-${course.id}`}
                          >
                            Mark as passed
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={(e) => handleUndoPassed(course.id, e)}
                            data-testid={`undo-passed-${course.id}`}
                          >
                            Undo passed
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <GradeInputDialog
        open={gradeDialogOpen}
        onClose={handleGradeCancel}
        onConfirm={handleGradeConfirm}
        courseName={courseToGrade ? `${courseToGrade.id} - ${courseToGrade.name}` : ''}
      />
    </div>
  );
}
