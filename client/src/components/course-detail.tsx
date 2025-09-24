import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Course, Section } from '@/types';
import { useCourseData } from '@/hooks/use-course-data';
import { useStudentProgress } from '@/hooks/use-student-progress';
import { useSchedule } from '@/hooks/use-schedule';

interface CourseDetailProps {
  course?: Course;
}

export function CourseDetail({ course }: CourseDetailProps) {
  const { getSectionsByCourse, getCourseById } = useCourseData();
  const { getCourseStatus, getPassedCourses, markCoursePassed, removeCourseProgress } = useStudentProgress();
  const { detectScheduleConflicts, updateSectionSelection, coursePlan } = useSchedule();

  if (!course) {
    return (
      <div className="w-1/3 bg-card border-l border-border">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Course Details</h2>
        </div>
        <div className="p-6 flex items-center justify-center h-96">
          <p className="text-muted-foreground">Select a course to view details</p>
        </div>
      </div>
    );
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
    
    const tagClass = course.electiveType === 'GEN' ? 'tag-elec gen' : 
                    course.electiveType === 'BASICAS' ? 'tag-elec basicas' :
                    'tag-elec clinicas';
    
    return (
      <span className={`tag ${tagClass}`}>
        Elective • {course.electiveType}
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
    <div className="w-1/3 bg-card border-l border-border">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Course Details</h2>
      </div>
      
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-6">
          <div>
            <div className="title-line flex items-center gap-2 mb-2">
              <span className="text-xl font-bold text-foreground">{course.id}</span>
              <span className="text-muted-foreground">—</span>
              <span className="text-xl text-foreground">{course.name}</span>
              {getElectiveTag()}
            </div>
            <div className="text-muted-foreground">
              {course.block} • {course.credits} credits • HT {course.theoreticalHours} • HP {course.practicalHours}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-foreground mb-2">Status</div>
            {getStatusBadge()}
          </div>
          
          <div>
            <div className="text-sm font-medium text-foreground mb-2">Prerequisites</div>
            <div className="flex flex-wrap gap-2">
              {course.prerequisites.length > 0 ? (
                course.prerequisites.map(prereq => {
                  const prereqCourse = getCourseById(prereq);
                  return (
                    <span key={prereq} className="pill" data-testid={`prereq-${prereq}`}>
                      {prereq} {prereqCourse && `(${prereqCourse.name})`}
                    </span>
                  );
                })
              ) : (
                <span className="pill">—</span>
              )}
            </div>
            {course.prerequisites.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                You must complete these courses before taking this one.
              </div>
            )}
          </div>
          
          <div>
            <div className="text-sm font-medium text-foreground mb-2">Corequisites</div>
            <div className="flex flex-wrap gap-2">
              {course.corequisites.length > 0 ? (
                course.corequisites.map(coreq => {
                  const coreqCourse = getCourseById(coreq);
                  return (
                    <span key={coreq} className="pill" data-testid={`coreq-${coreq}`}>
                      {coreq} {coreqCourse && `(${coreqCourse.name})`}
                    </span>
                  );
                })
              ) : (
                <span className="pill">—</span>
              )}
            </div>
            {course.corequisites.length > 0 && (
              <div className="mt-2 text-xs text-muted-foreground">
                You must take these courses at the same time.
              </div>
            )}
          </div>
          
          <div>
            <div className="text-sm font-medium text-foreground mb-2">Course Description</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {course.description || 'No description available.'}
            </p>
          </div>
          
          {sections.length > 0 && (
            <div>
              <div className="text-sm font-medium text-foreground mb-2">Available Sections</div>
              <div className="space-y-2">
                {sections.map(section => (
                  <div key={section.id} className="p-3 bg-muted rounded-md border border-border">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm text-foreground">
                        Section {section.sectionNumber}
                      </div>
                      <span className="text-xs text-muted-foreground">CRN: {section.crn}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{section.instructor} • {section.room}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatSchedule(section.schedule)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Enrolled: {section.currentEnrollment}/{section.maxCapacity}
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedPlan && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-foreground mb-2">Select Section</div>
                  <Select value={selectedSectionId || ""} onValueChange={handleSectionChange}>
                    <SelectTrigger data-testid="section-select">
                      <SelectValue placeholder="Choose a section..." />
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
                    <div className="conflict-warning mt-2" data-testid="conflict-warning">
                      ⚠️ Schedule conflict detected with other selected courses
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="pt-4 border-t border-border">
            {status !== 'passed' ? (
              <Button 
                className="w-full" 
                disabled={status === 'blocked'}
                onClick={handleMarkPassed}
                data-testid="mark-passed-detail"
              >
                Mark as passed
              </Button>
            ) : (
              <Button 
                className="w-full" 
                variant="destructive"
                onClick={handleUndoPassed}
                data-testid="undo-passed-detail"
              >
                Undo passed
              </Button>
            )}
            {status === 'blocked' && (
              <div className="text-xs text-muted-foreground mt-2 text-center">
                Complete prerequisites to enable this action
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
