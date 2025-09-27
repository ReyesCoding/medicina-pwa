import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Course, FilterState, CourseStatus } from '@/types';
import { useCourseData } from '@/hooks/use-course-data';
import { useStudentProgress } from '@/contexts/student-progress-context';
import { useSchedule } from '@/hooks/use-schedule';
import { cn } from '@/lib/utils';

interface CourseListProps {
  filters: FilterState;
  onCourseSelect: (course: Course) => void;
  selectedCourse?: Course;
  onShowPlanModal: () => void;
}

export function CourseList({ filters, onCourseSelect, selectedCourse, onShowPlanModal }: CourseListProps) {
  const { courses, getAllTerms } = useCourseData();
  const { getCourseStatus, passedCourses, getPlannedCourses } = useStudentProgress();
  const { getCoursesInPlan } = useSchedule();

  const plannedCourses = getCoursesInPlan();
  const progressPlannedCourses = getPlannedCourses();
  const terms = getAllTerms();

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      // Term filter
      if (filters.term && course.term !== filters.term) return false;
      
      // Status filter
      if (filters.status) {
        const status = getCourseStatus(course, passedCourses, progressPlannedCourses);
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
  }, [courses, filters, passedCourses, plannedCourses, progressPlannedCourses]);

  const groupedCourses = useMemo(() => {
    const groups = new Map();
    const electiveGroups = new Map();
    
    filteredCourses.forEach(course => {
      if (course.isElective) {
        // Handle electives - group by elective type and place after their base term
        const baseTerms = {
          'general': 6,  // Electivas Generales after Term 6
          'professional': course.term > 11 ? 15 : 11  // Professional electives: Basic Sciences (11) or Clinical (15)
        };
        const baseTerm = baseTerms[course.electiveType as keyof typeof baseTerms] || course.term;
        
        if (!electiveGroups.has(baseTerm)) {
          const electiveName = course.electiveType === 'general' ? 'Electivas Generales' : 
                              baseTerm === 11 ? 'Electivas Profesionalizantes - Ciencias Básicas' :
                              'Electivas Profesionalizantes - Ciencias Clínicas';
          
          electiveGroups.set(baseTerm, {
            term: baseTerm,
            name: electiveName,
            block: 'ELECTIVAS',
            courses: [],
            isElective: true,
            electiveType: course.electiveType
          });
        }
        electiveGroups.get(baseTerm).courses.push(course);
      } else {
        // Handle regular courses
        if (!groups.has(course.term)) {
          const termInfo = terms.find(t => t.term === course.term);
          groups.set(course.term, {
            term: course.term,
            name: termInfo?.name || `Cuatrimestre ${course.term}`,
            block: termInfo?.block || course.block,
            courses: [],
            isElective: false
          });
        }
        groups.get(course.term).courses.push(course);
      }
    });
    
    // Merge regular courses and electives, maintaining order
    const allGroups = [...Array.from(groups.values()), ...Array.from(electiveGroups.values())]
      .sort((a, b) => {
        if (a.term !== b.term) return a.term - b.term;
        // Electives come after regular courses for the same term
        return a.isElective ? 1 : -1;
      });
    
    return allGroups;
  }, [filteredCourses, terms]);

  const getStatusBadge = (course: Course) => {
    const status = getCourseStatus(course, passedCourses, progressPlannedCourses);
    
    switch (status) {
      case 'available':
        return <Badge variant="default" className="pill ok">Disponible</Badge>;
      case 'blocked':
        return <Badge variant="destructive" className="pill bad">Bloqueada</Badge>;
      case 'passed':
        return <Badge variant="secondary" className="pill passed">Aprobada</Badge>;
    }
  };

  const getElectiveTag = (course: Course) => {
    if (!course.isElective) return null;
    
    const tagClass = course.electiveType === 'general' ? 'tag-elec gen' : 'tag-elec professional';
    const displayText = course.electiveType === 'general' ? 'General' : 'Profesionalizante';
    
    return (
      <span className={`tag ${tagClass}`}>
        Electiva • {displayText}
      </span>
    );
  };

  const handleSuggestPlan = () => {
    onShowPlanModal();
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border bg-background">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Catálogo de Materias</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground" data-testid="course-count">
              {filteredCourses.length} materias
            </span>
            <Button 
              size="sm" 
              onClick={handleSuggestPlan}
              data-testid="suggest-plan-btn"
            >
              Sugerir Plan
            </Button>
          </div>
        </div>
      </div>
      
      {/* Course Grid */}
      <div className="flex-1 p-6 space-y-8">
          {groupedCourses.map(group => (
            <div key={`${group.term}-${group.isElective ? 'elective' : 'regular'}`} className="space-y-6">
              {/* Sticky Semester Header */}
              <div className={cn(
                "sticky-header mobile-sticky-header py-4 px-6 -mx-6 bg-background/95 backdrop-blur-sm border-b border-border",
                group.isElective && "bg-orange-50/80 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
              )}>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    group.isElective 
                      ? "bg-orange-500 text-white" 
                      : "bg-primary text-primary-foreground"
                  )}>
                    {group.isElective ? '⭐' : group.term}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {group.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {group.block} • {group.courses.length} materias • {group.courses.reduce((sum: number, c: Course) => sum + c.credits, 0)} créditos
                      {group.isElective && " • Elige tus electivas"}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Course Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.courses.map((course: Course) => {
                  const status = getCourseStatus(course, passedCourses, progressPlannedCourses);
                  const isPassed = status === 'passed';
                  const isBlocked = status === 'blocked';
                  const isSelected = selectedCourse?.id === course.id;
                  
                  return (
                    <div key={course.id} className="space-y-0">
                      {/* Course Card */}
                      <Card 
                        className={cn(
                          "cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02]",
                          isPassed && "ring-2 ring-green-200 bg-green-50/50 dark:ring-green-800 dark:bg-green-950/20",
                          isBlocked && "opacity-60 bg-muted/30",
                          isSelected && "ring-2 ring-primary bg-accent",
                          group.isElective && !isPassed && "border-orange-200 dark:border-orange-800"
                        )}
                        onClick={() => onCourseSelect(course)}
                        data-testid={`course-item-${course.id}`}
                      >
                        <CardHeader className="pb-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm font-semibold text-primary truncate flex-1 min-w-0">
                                {course.id}
                              </CardTitle>
                              <div className="flex-shrink-0">
                                {getStatusBadge(course)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-foreground font-medium line-clamp-3 leading-tight break-words">
                                {course.name}
                              </p>
                              {getElectiveTag(course)}
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0 space-y-3">
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>{course.credits} créditos</div>
                            <div>HT: {course.theoreticalHours} • HP: {course.practicalHours}</div>
                          </div>
                        </CardContent>
                      </Card>
                      
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
