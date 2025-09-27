import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Check, X, Save, RotateCcw } from 'lucide-react';
import { Course } from '@/types';
import { useCourseData } from '@/hooks/use-course-data';
import { useStudentProgress } from '@/contexts/student-progress-context';
import { processSectionsData, hasScheduleConflict, formatScheduleDisplay, ProcessedSection, ProcessedCourse } from '@/utils/sections-processor';
import sectionsData from '@assets/../attached_assets/medicine-2013-sections_1759011415431.json';

interface ComprehensivePlanModalProps {
  open: boolean;
  onClose: () => void;
}

interface SelectedSection {
  courseId: string;
  sectionCrn: string;
  section: ProcessedSection;
}

const processedSections = processSectionsData(sectionsData as any);

export function ComprehensivePlanModal({ open, onClose }: ComprehensivePlanModalProps) {
  const { courses, getAllTerms } = useCourseData();
  const { getCourseStatus, getPassedCourses } = useStudentProgress();
  
  const [selectedSections, setSelectedSections] = useState<SelectedSection[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const passedCourses = getPassedCourses();

  // Get term information
  const terms = getAllTerms();

  // Group courses by term and get available courses
  const coursesByTerm = useMemo(() => {
    const grouped = new Map<number, Course[]>();
    
    courses.forEach(course => {
      const status = getCourseStatus(course, passedCourses);
      
      // Only show available courses (not passed or blocked)
      if (status === 'available') {
        if (!grouped.has(course.term)) {
          grouped.set(course.term, []);
        }
        grouped.get(course.term)!.push(course);
      }
    });
    
    // Convert to array and sort by term
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([term, courses]) => ({
        term,
        termInfo: terms.find((t: any) => t.term === term),
        courses: courses.sort((a, b) => a.name.localeCompare(b.name))
      }));
  }, [courses, terms, passedCourses, getCourseStatus]);

  // Get sections for a course by matching course name
  const getSectionsForCourse = (courseName: string): ProcessedSection[] => {
    const courseData = processedSections.courses.find(c => 
      c.name === courseName || c.name.toLowerCase() === courseName.toLowerCase()
    );
    return courseData?.sections.filter(section => !section.closed) || [];
  };

  // Calculate total credits
  const totalCredits = selectedSections.reduce((sum, selection) => {
    const course = courses.find(c => c.id === selection.courseId);
    return sum + (course?.credits || 0);
  }, 0);

  // Check for schedule conflicts
  useEffect(() => {
    const conflictMessages: string[] = [];
    
    for (let i = 0; i < selectedSections.length; i++) {
      for (let j = i + 1; j < selectedSections.length; j++) {
        const section1 = selectedSections[i];
        const section2 = selectedSections[j];
        
        if (hasScheduleConflict(section1.section, section2.section)) {
          const course1 = courses.find(c => c.id === section1.courseId);
          const course2 = courses.find(c => c.id === section2.courseId);
          
          if (course1 && course2) {
            conflictMessages.push(
              `Conflicto de horario: ${course1.name} y ${course2.name}`
            );
          }
        }
      }
    }
    
    setConflicts(conflictMessages);
  }, [selectedSections, courses]);

  const handleSectionSelect = (courseId: string, sectionCrn: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    
    const sections = getSectionsForCourse(course.name);
    const section = sections.find(s => s.crn === sectionCrn);
    if (!section) return;

    setSelectedSections(prev => {
      // Remove existing selection for this course
      const filtered = prev.filter(sel => sel.courseId !== courseId);
      
      // Add new selection
      return [...filtered, { courseId, sectionCrn, section }];
    });
  };

  const handleRemoveSelection = (courseId: string) => {
    setSelectedSections(prev => prev.filter(sel => sel.courseId !== courseId));
  };

  const handleSavePlan = () => {
    if (conflicts.length > 0) {
      alert('No se puede guardar el plan debido a conflictos de horario. Por favor resuelve los conflictos primero.');
      return;
    }
    
    if (totalCredits > 31) {
      alert('No se puede guardar el plan. El límite de créditos es 31.');
      return;
    }
    
    // Here you would typically save to your backend or local storage
    console.log('Saving plan:', selectedSections);
    alert('Plan guardado exitosamente!');
    onClose();
  };

  const handleClearPlan = () => {
    setSelectedSections([]);
  };

  const canSave = conflicts.length === 0 && totalCredits <= 31 && selectedSections.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Mi Plan de Estudios Completo</DialogTitle>
          <div className="flex items-center justify-between mt-4 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-6">
              <div className="text-sm">
                <span className="font-medium">Créditos Seleccionados:</span>
                <span className={`ml-2 font-bold ${totalCredits > 31 ? 'text-destructive' : 'text-foreground'}`}>
                  {totalCredits} / 31
                </span>
              </div>
              <div className="text-sm">
                <span className="font-medium">Materias Seleccionadas:</span>
                <span className="ml-2 font-bold">{selectedSections.length}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearPlan}
                disabled={selectedSections.length === 0}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Limpiar
              </Button>
              <Button 
                onClick={handleSavePlan} 
                size="sm"
                disabled={!canSave}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Plan
              </Button>
            </div>
          </div>
          
          {/* Conflicts Alert */}
          {conflicts.length > 0 && (
            <Alert className="border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium text-destructive mb-2">Conflictos de Horario:</div>
                <ul className="list-disc list-inside space-y-1">
                  {conflicts.map((conflict, index) => (
                    <li key={index} className="text-sm">{conflict}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Credit Limit Alert */}
          {totalCredits > 31 && (
            <Alert className="border-destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-destructive">
                Has excedido el límite de 31 créditos. Reduce la selección para continuar.
              </AlertDescription>
            </Alert>
          )}
        </DialogHeader>
        
        <ScrollArea className="flex-1 max-h-[65vh]">
          <div className="p-6 space-y-6">
            {coursesByTerm.map(({ term, termInfo, courses: termCourses }) => (
              <Card key={term}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {term}
                    </span>
                    <div>
                      <div>{termInfo?.name || `Semestre ${term}`}</div>
                      <div className="text-sm font-normal text-muted-foreground">
                        {termInfo?.block} • {termCourses.length} materias disponibles
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {termCourses.map(course => {
                      const sections = getSectionsForCourse(course.name);
                      const selectedSection = selectedSections.find(sel => sel.courseId === course.id);
                      const isSelected = !!selectedSection;
                      
                      return (
                        <div key={course.id} className="border rounded-lg p-4 space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm leading-tight break-words">
                                  {course.id} - {course.name}
                                </h4>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {course.credits} créditos • HT {course.theoreticalHours} • HP {course.practicalHours}
                                </div>
                              </div>
                              {isSelected && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="ml-2 h-6 w-6 p-0"
                                  onClick={() => handleRemoveSelection(course.id)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            
                            {course.isElective && (
                              <Badge variant="secondary" className="text-xs">
                                Electiva • {course.electiveType === 'general' ? 'General' : 'Profesionalizante'}
                              </Badge>
                            )}
                          </div>
                          
                          {sections.length > 0 ? (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">
                                Seleccionar Sección:
                              </label>
                              <Select 
                                value={selectedSection?.sectionCrn || ""} 
                                onValueChange={(sectionCrn) => handleSectionSelect(course.id, sectionCrn)}
                              >
                                <SelectTrigger className="mt-1 h-8 text-xs">
                                  <SelectValue placeholder="Elige una sección..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {sections.map(section => (
                                    <SelectItem key={section.crn} value={section.crn}>
                                      <div className="space-y-1">
                                        <div className="font-medium">
                                          {section.crn} - {section.room}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {formatScheduleDisplay(section)}
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                              No hay secciones disponibles
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}