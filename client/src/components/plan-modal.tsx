import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useCourseData } from '@/hooks/use-course-data';
import { useSchedule } from '@/hooks/use-schedule';
import { useStudentProgress } from '@/contexts/student-progress-context';
import { X, Plus } from 'lucide-react';

interface PlanModalProps {
  open: boolean;
  onClose: () => void;
}

export function PlanModal({ open, onClose }: PlanModalProps) {
  const { courses, getSectionsByCourse } = useCourseData();
  const { 
    coursePlan, 
    addCourseToPlan,
    removeCourseFromPlan, 
    updateSectionSelection, 
    detectScheduleConflicts,
    getPlannedTermCredits,
    suggestCoursesForTerm
  } = useSchedule();
  const { getCourseStatus, getPassedCourses } = useStudentProgress();

  const [selectedTerm, setSelectedTerm] = useState<number>(1);
  
  const passedCourses = getPassedCourses();
  const plannedCourses = coursePlan.map(plan => {
    const course = courses.find(c => c.id === plan.courseId);
    return course ? { ...course, ...plan } : null;
  }).filter(Boolean);

  const conflicts = detectScheduleConflicts(
    coursePlan
      .map(plan => getSectionsByCourse(plan.courseId))
      .flat()
      .filter(section => coursePlan.some(plan => plan.sectionId === section.id))
  );

  const termCredits = getPlannedTermCredits(selectedTerm, courses);
  
  const formatSchedule = (schedule: any[]) => {
    return schedule.map(slot => 
      `${slot.day.slice(0, 3)} ${slot.startTime}-${slot.endTime}`
    ).join(', ');
  };

  const handleRemoveCourse = (courseId: string) => {
    removeCourseFromPlan(courseId);
  };

  const handleSectionChange = (courseId: string, sectionId: string) => {
    updateSectionSelection(courseId, sectionId);
  };

  const handleSuggestCourses = () => {
    const plannedCourseIds = new Set(coursePlan.map(plan => plan.courseId));
    const suggestions = suggestCoursesForTerm(selectedTerm, courses, passedCourses, getCourseStatus);
    
    console.log('Suggested courses for term', selectedTerm, ':', suggestions);
    
    // Add suggested courses to plan
    suggestions.forEach(courseId => {
      const course = courses.find(c => c.id === courseId);
      if (course && !plannedCourseIds.has(courseId)) {
        addCourseToPlan(courseId, selectedTerm);
      }
    });
  };

  const getCourseConflicts = (courseId: string) => {
    return conflicts.filter(conflict => 
      conflict.course1 === courseId || conflict.course2 === courseId
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Mi Plan de Estudios</DialogTitle>
          <div className="flex items-center gap-4 mt-2">
            <div className="text-sm text-muted-foreground" data-testid="plan-info">
              Créditos planificados: {plannedCourses.reduce((sum, course) => sum + (course?.credits || 0), 0)} / 22
            </div>
            <Button size="sm" onClick={handleSuggestCourses} data-testid="suggest-courses">
              Sugerir materias
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] p-4">
          <div className="space-y-6">
            {plannedCourses.map(course => {
              if (!course) return null;
              
              const sections = getSectionsByCourse(course.id);
              const selectedSection = sections.find(s => s.id === course.sectionId);
              const courseConflicts = getCourseConflicts(course.id);
              
              return (
                <div key={course.id} className="p-4 bg-muted rounded-md border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-foreground">
                        {course.id} — {course.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {course.credits} créditos • Semestre {course.term}
                      </div>
                      {course.isElective && (
                        <Badge variant="secondary" className="mt-1">
                          Electiva • {course.electiveType}
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleRemoveCourse(course.id)}
                      data-testid={`remove-course-${course.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {sections.length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-foreground">Seleccionar Sección</label>
                        <Select 
                          value={course.sectionId || ""} 
                          onValueChange={(sectionId) => handleSectionChange(course.id, sectionId)}
                        >
                          <SelectTrigger className="mt-1" data-testid={`section-select-${course.id}`}>
                            <SelectValue placeholder="Elige una sección..." />
                          </SelectTrigger>
                          <SelectContent>
                            {sections.map(section => (
                              <SelectItem key={section.id} value={section.id}>
                                Sec {section.sectionNumber} ({section.instructor}) {formatSchedule(section.schedule)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {courseConflicts.length > 0 && course.sectionId && (
                          <div className="conflict-warning mt-2" data-testid={`conflict-${course.id}`}>
                            ⚠️ Schedule conflict with other selected courses
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {plannedCourses.length === 0 && (
              <div className="p-8 text-center">
                <div className="text-muted-foreground mb-4">No courses in your plan yet</div>
                <Button data-testid="browse-courses">
                  <Plus className="w-4 h-4 mr-2" />
                  Browse Available Courses
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
