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
    <div className="space-y-4">
      {/* Course Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {course.id} - {course.name}
          </h3>
          <div className="text-sm text-muted-foreground mb-2">
            {course.block} • {course.credits} créditos • HT {course.theoreticalHours} • HP {course.practicalHours}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-3">
            {course.description || 'Sin descripción disponible.'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {getStatusBadge()}
          {getElectiveTag()}
        </div>
      </div>
      
      {/* Prerequisites & Corequisites */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium text-foreground mb-2">Prerrequisitos</h4>
          <div className="flex flex-wrap gap-2">
            {course.prerequisites.length > 0 ? (
              course.prerequisites.map(prereq => {
                const prereqCourse = getCourseById(prereq);
                return (
                  <Badge key={prereq} variant="outline" className="text-xs" data-testid={`prereq-${prereq}`}>
                    {prereq} {prereqCourse && `(${prereqCourse.name})`}
                  </Badge>
                );
              })
            ) : (
              <span className="text-sm text-muted-foreground">Ninguno</span>
            )}
          </div>
          {course.prerequisites.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Debes completar estas materias antes de tomar esta.
            </p>
          )}
        </div>
        
        <div>
          <h4 className="font-medium text-foreground mb-2">Correquisitos</h4>
          <div className="flex flex-wrap gap-2">
            {course.corequisites.length > 0 ? (
              course.corequisites.map(coreq => {
                const coreqCourse = getCourseById(coreq);
                return (
                  <Badge key={coreq} variant="outline" className="text-xs" data-testid={`coreq-${coreq}`}>
                    {coreq} {coreqCourse && `(${coreqCourse.name})`}
                  </Badge>
                );
              })
            ) : (
              <span className="text-sm text-muted-foreground">Ninguno</span>
            )}
          </div>
          {course.corequisites.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Debes tomar estas materias al mismo tiempo.
            </p>
          )}
        </div>
      </div>

      {/* Sections - if available */}
      {sections.length > 0 && (
        <div className="space-y-3 border-t border-border pt-4">
          <h4 className="font-medium text-foreground">Secciones Disponibles</h4>
          <div className="space-y-2">
            {sections.map(section => (
              <div key={section.id} className="p-3 bg-muted/50 rounded-md border border-border">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-sm text-foreground">
                    Sección {section.sectionNumber}
                  </div>
                  <span className="text-xs text-muted-foreground">CRN: {section.crn}</span>
                </div>
                <div className="text-xs text-muted-foreground">{section.instructor} • {section.room}</div>
                <div className="text-xs text-muted-foreground">
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
                <SelectTrigger data-testid="section-select">
                  <SelectValue placeholder="Selecciona una sección..." />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      Sec {section.sectionNumber} ({section.instructor}) {formatSchedule(section.schedule)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {courseConflicts.length > 0 && selectedSectionId && (
                <div className="p-2 bg-destructive/10 border border-destructive/20 rounded-md" data-testid="conflict-warning">
                  <p className="text-sm text-destructive">⚠️ Conflicto de horario detectado</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
