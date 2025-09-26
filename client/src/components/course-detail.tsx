import { Badge } from '@/components/ui/badge';
import { Course } from '@/types';
import { useCourseData } from '@/hooks/use-course-data';
import { useStudentProgress } from '@/contexts/student-progress-context';

interface CourseDetailProps {
  course?: Course;
}

export function CourseDetail({ course }: CourseDetailProps) {
  const { getCourseById } = useCourseData();
  const { getCourseStatus, getPassedCourses } = useStudentProgress();

  if (!course) {
    return null; // Return nothing when no course is selected (inline mode)
  }

  const passedCourses = getPassedCourses();
  const status = getCourseStatus(course, passedCourses);

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


  return (
    <div className="space-y-4 p-4 h-full overflow-y-auto">
      {/* Course Header */}
      <div className="space-y-3">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground leading-tight break-words">
            {course.id} - {course.name}
          </h3>
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

    </div>
  );
}
