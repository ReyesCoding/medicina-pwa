import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Course, Section } from '@/types';
import { useCourseData } from '@/hooks/use-course-data';
import { useStudentProgress } from '@/contexts/student-progress-context';
import { useSchedule } from '@/hooks/use-schedule';

interface CourseDetailProps {
  course?: Course;
}

export function CourseDetail({ course }: CourseDetailProps) {
  const { getSectionsByCourse, getCourseById } = useCourseData();
  const { getCourseStatus, getPassedCourses, markCoursePassed, removeCourseProgress } = useStudentProgress();
  const { detectScheduleConflicts, updateSectionSelection, coursePlan } = useSchedule();

  if (!course) {
    return null; // Return nothing when no course is selected (inline mode)
  }

  const passedCourses = getPassedCourses();
  const status = getCourseStatus(course, passedCourses);
  const sections = getSectionsByCourse(course.id);
  const conflicts = detectScheduleConflicts(sections);
  
  const selectedPlan = coursePlan.find(plan => plan.courseId === course.id);
  const selectedSectionId = selectedPlan?.sectionId;

  const getStatusBadge = () => {
    switch (status) {
      case 'available':
        return <Badge variant="default" className="pill ok">Available</Badge>;
      case 'blocked':
        return <Badge variant="destructive" className="pill bad">Blocked</Badge>;
      case 'passed':
        return <Badge variant="secondary" className="pill passed">Passed</Badge>;
    }
  };

  const getElectiveTag = () => {
    if (!course.isElective) return null;
    
    const tagClass = course.electiveType === 'general' ? 'tag-elec gen' : 'tag-elec professional';
    const displayText = course.electiveType === 'general' ? 'General' : 'Profesionalizante';
    
    return (
      <span className={`tag ${tagClass}`}>
        Electiva • {displayText}
      </span>
    );
  };

  const handleMarkPassed = () => {
    markCoursePassed(course.id);
  };

  const handleUndoPassed = () => {
    removeCourseProgress(course.id);
  };

  const handleSectionChange = (sectionId: string) => {
    updateSectionSelection(course.id, sectionId);
  };

  const formatSchedule = (schedule: Section['schedule']) => {
    return schedule.map(slot => 
      `${slot.day.slice(0, 3)} ${slot.startTime}-${slot.endTime}`
    ).join(', ');
  };

  const getCourseConflicts = () => {
    return conflicts.filter(conflict => 
      conflict.course1 === course.id || conflict.course2 === course.id
    );
  };

  const courseConflicts = getCourseConflicts();

  return (
    <div className="space-y-4 p-4 h-full overflow-y-auto">
      {/* Course Header */}
      <div className="space-y-3">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground leading-tight break-words">
            {course.id}
          </h3>
          <h4 className="text-sm font-medium text-foreground leading-tight break-words">
            {course.name}
          </h4>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {getStatusBadge()}
          {getElectiveTag()}
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <div>{course.block}</div>
          <div>{course.credits} créditos • HT {course.theoreticalHours} • HP {course.practicalHours}</div>
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
          {course.description || 'Sin descripción disponible.'}
        </p>
      </div>
      
      {/* Prerequisites & Corequisites */}
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-foreground mb-2 text-sm">Prerrequisitos</h4>
          <div className="space-y-2">
            {course.prerequisites.length > 0 ? (
              course.prerequisites.map(prereq => {
                const prereqCourse = getCourseById(prereq);
                return (
                  <div key={prereq} className="text-xs" data-testid={`prereq-${prereq}`}>
                    <Badge variant="outline" className="text-xs mr-2">
                      {prereq}
                    </Badge>
                    {prereqCourse && (
                      <span className="text-muted-foreground break-words">{prereqCourse.name}</span>
                    )}
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-muted-foreground">Ninguno</span>
            )}
          </div>
          {course.prerequisites.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Debes completar estas materias antes de tomar esta.
            </p>
          )}
        </div>
        
        <div>
          <h4 className="font-medium text-foreground mb-2 text-sm">Correquisitos</h4>
          <div className="space-y-2">
            {course.corequisites.length > 0 ? (
              course.corequisites.map(coreq => {
                const coreqCourse = getCourseById(coreq);
                return (
                  <div key={coreq} className="text-xs" data-testid={`coreq-${coreq}`}>
                    <Badge variant="outline" className="text-xs mr-2">
                      {coreq}
                    </Badge>
                    {coreqCourse && (
                      <span className="text-muted-foreground break-words">{coreqCourse.name}</span>
                    )}
                  </div>
                );
              })
            ) : (
              <span className="text-xs text-muted-foreground">Ninguno</span>
            )}
          </div>
          {course.corequisites.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Debes tomar estas materias al mismo tiempo.
            </p>
          )}
        </div>
      </div>

      {/* Sections - if available */}
      {sections.length > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <h4 className="font-medium text-foreground text-sm">Secciones Disponibles</h4>
          <div className="space-y-2">
            {sections.map(section => (
              <div key={section.id} className="p-2 bg-muted/50 rounded-md border border-border">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-xs text-foreground">
                    Sección {section.sectionNumber}
                  </div>
                  <span className="text-xs text-muted-foreground">CRN: {section.crn}</span>
                </div>
                <div className="text-xs text-muted-foreground break-words">{section.instructor} • {section.room}</div>
                <div className="text-xs text-muted-foreground break-words">
                  {formatSchedule(section.schedule)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Inscritos: {section.currentEnrollment}/{section.maxCapacity}
                </div>
              </div>
            ))}
          </div>
          
          {selectedPlan && (
            <div className="space-y-2">
              <Select value={selectedSectionId || ""} onValueChange={handleSectionChange}>
                <SelectTrigger data-testid="section-select" className="text-xs">
                  <SelectValue placeholder="Selecciona una sección..." />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id} className="text-xs">
                      Sec {section.sectionNumber} ({section.instructor})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {courseConflicts.length > 0 && selectedSectionId && (
                <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md" data-testid="conflict-warning">
                  <p className="text-xs text-destructive">⚠️ Conflicto de horario detectado</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
