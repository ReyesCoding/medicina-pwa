import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle,DialogDescription  } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Check, X, Save, RotateCcw, FolderOpen, ArrowLeft, Edit } from 'lucide-react';
import { Course } from '@/types';
import { useCourseData } from '@/hooks/use-course-data';
import { useStudentProgress } from '@/contexts/student-progress-context';
import { processSectionsData, hasScheduleConflict, formatScheduleDisplay, ProcessedSection, ProcessedCourse } from '@/utils/sections-processor';

interface ComprehensivePlanModalProps {
  open: boolean;
  onClose: () => void;
}

interface SelectedSection {
  courseId: string;
  sectionCrn: string;
  section: ProcessedSection;
}

// Helper function to format CRN with hyphens (e.g., MED100001 -> MED-100-001)
const formatCRN = (crn: string): string => {
  // Match pattern: 3 letters + 3 digits + 3 digits
  const match = crn.match(/^([A-Z]{3})(\d{3})(\d{3})$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return crn; // Return as-is if pattern doesn't match
};

export function ComprehensivePlanModal({ open, onClose }: ComprehensivePlanModalProps) {
  const { courses, getAllTerms } = useCourseData();
  const { getCourseStatus, getPassedCourses } = useStudentProgress();
  
  const [selectedSections, setSelectedSections] = useState<SelectedSection[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [loadSavedPlan, setLoadSavedPlan] = useState(false);
  const [viewMode, setViewMode] = useState<'plan' | 'saved'>('plan'); // New state for view mode
  const passedCourses = getPassedCourses();

  const [sections, setSections] = useState<any[] | null>(null);

useEffect(() => {
  let cancelled = false;

  (async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/sections.json`);
      const json = await res.json();
      if (!cancelled) setSections(json);
    } catch (err) {
      console.error('Error cargando sections.json', err);
      if (!cancelled) setSections([]);
    }
  })();

  return () => { cancelled = true; };
}, []);

const processedSections = useMemo(
  () => (sections ? processSectionsData(sections as any) : null),
  [sections]
);

  // Load saved plan on mount if requested
  useEffect(() => {
    if (open && loadSavedPlan) {
      const savedPlan = localStorage.getItem('savedCoursePlan');
      if (savedPlan) {
        try {
          const planData = JSON.parse(savedPlan);
          setSelectedSections(planData.selectedSections || []);
        } catch (error) {
          console.error('Error loading saved plan:', error);
        }
      }
      setLoadSavedPlan(false);
    }
  }, [open, loadSavedPlan]);

  // Reset view mode when modal closes
  useEffect(() => {
    if (!open) {
      setViewMode('plan');
    }
  }, [open]);

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
  if (!processedSections || !processedSections.courses) return [];

  const courseData = processedSections.courses.find(
    (c) =>
      c.name === courseName ||
      c.name.toLowerCase() === courseName.toLowerCase()
  );

  return courseData?.sections.filter((section) => !section.closed) || [];
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
      alert('⚠️ No se puede guardar el plan debido a conflictos de horario.\n\nPor favor resuelve los conflictos primero.');
      return;
    }
    
    if (totalCredits > 31) {
      alert('⚠️ No se puede guardar el plan.\n\nEl límite de créditos es 31.');
      return;
    }
    
    // Save to localStorage
    const planData = {
      selectedSections,
      totalCredits,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('savedCoursePlan', JSON.stringify(planData));
    
    console.log('Saving plan:', selectedSections);
    alert('✅ Plan guardado exitosamente!');
    onClose();
  };

  const handleClearPlan = () => {
    setSelectedSections([]);
  };

  const handleLoadSavedPlan = () => {
    const savedPlan = localStorage.getItem('savedCoursePlan');
    if (savedPlan) {
      try {
        const planData = JSON.parse(savedPlan);
        setSelectedSections(planData.selectedSections || []);
        setViewMode('saved'); // Switch to saved plan view
      } catch (error) {
        console.error('Error loading saved plan:', error);
        alert('Error al cargar el plan guardado.');
      }
    } else {
      alert('No hay plan guardado disponible.');
    }
  };

  const handleBackToPlan = () => {
    setViewMode('plan');
  };

  const canSave = conflicts.length === 0 && totalCredits <= 31 && selectedSections.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {viewMode === 'saved' ? 'Plan Guardado' : 'Mi Plan de Estudios Completo'}
          </DialogTitle> 
            <DialogDescription className="sr-only">
              Planificador de materias y secciones para generar tu horario sin conflictos.
             </DialogDescription>
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
              {viewMode === 'saved' ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleBackToPlan}
                    data-testid="button-back-to-plan"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver a Todas las Materias
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setViewMode('plan')}
                    data-testid="button-edit-schedule"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Horario
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleLoadSavedPlan}
                    data-testid="button-load-saved-plan"
                  >
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Ver Plan Guardado
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearPlan}
                    disabled={selectedSections.length === 0}
                    data-testid="button-clear-plan"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Limpiar
                  </Button>
                  <Button 
                    onClick={handleSavePlan} 
                    size="sm"
                    disabled={!canSave}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-save-plan"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Guardar Plan
                  </Button>
                </>
              )}
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
            {viewMode === 'saved' ? (
              // Saved Plan View - Only show selected subjects
              selectedSections.length > 0 ? (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Materias y Secciones Seleccionadas</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      {selectedSections.map(selection => {
                        const course = courses.find(c => c.id === selection.courseId);
                        if (!course) return null;
                        
                        return (
                          <div key={selection.courseId} className="border rounded-lg p-4 bg-muted/50" data-testid={`saved-course-${selection.courseId}`}>
                            <div className="space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium text-base">
                                    {course.id} - {course.name}
                                  </h4>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {course.credits} créditos • HT {course.theoreticalHours} • HP {course.practicalHours}
                                  </div>
                                </div>
                                {course.isElective && (
                                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
                                    Electiva • {course.electiveType === 'general' ? 'General' : 'Profesionalizante'}
                                  </Badge>
                                )}
                              </div>
                              <Separator />
                              <div className="bg-background rounded-md p-3">
                                <div className="font-medium text-sm mb-1">{formatCRN(selection.sectionCrn)} • {course.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {formatScheduleDisplay(selection.section)} • {selection.section.room}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    No hay materias seleccionadas en el plan guardado.
                  </CardContent>
                </Card>
              )
            ) : (
              // Full Plan View - Show all available courses
              coursesByTerm.map(({ term, termInfo, courses: termCourses }) => (
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
                          <div key={course.id} className="border rounded-lg p-4 space-y-3" data-testid={`course-card-${course.id}`}>
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
                                    data-testid={`button-remove-${course.id}`}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                              
                              {course.isElective && (
                                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs">
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
                                  <SelectTrigger className="mt-1 h-8 text-xs" data-testid={`select-section-${course.id}`}>
                                    <SelectValue placeholder="Elige una sección..." />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[400px]">
                                    {sections.map(section => (
                                      <SelectItem key={section.crn} value={section.crn} data-testid={`section-option-${section.crn}`}>
                                        <div className="max-w-full py-1">
                                          <div className="font-medium truncate">
                                            {formatCRN(section.crn)} • {course.name}
                                          </div>
                                          <div className="text-xs text-muted-foreground">
                                            {formatScheduleDisplay(section)} • {section.room}
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
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}