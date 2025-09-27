import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { FilterState, CourseStatus } from '@/types';
import { useCourseData } from '@/hooks/use-course-data';
import { useStudentProgress } from '@/contexts/student-progress-context';
import { List, ClipboardList, TrendingUp } from 'lucide-react';

interface NavigationProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  activeView: string;
  onViewChange: (view: string) => void;
  onShowPlanModal: () => void;
}

export function Navigation({ 
  filters, 
  onFiltersChange, 
  activeView, 
  onViewChange, 
  onShowPlanModal 
}: NavigationProps) {
  const { getAllTerms, courses } = useCourseData();
  const { calculateGPA, getTotalCredits } = useStudentProgress();
  
  const terms = getAllTerms();
  const gpa = calculateGPA();

  const handleStatusFilter = (status: CourseStatus | 'all') => {
    onFiltersChange({
      ...filters,
      status: status === 'all' ? null : status
    });
  };

  return (
    <nav className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="space-y-2">
          <Button 
            variant={activeView === 'courses' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => onViewChange('courses')}
            data-testid="nav-course-list"
          >
            <List className="w-4 h-4" />
            Lista de Materias
          </Button>
          <Button 
            variant="ghost"
            className="w-full justify-start gap-3"
            onClick={onShowPlanModal}
            data-testid="nav-my-plan"
          >
            <ClipboardList className="w-4 h-4" />
            Mi Plan
          </Button>
          <Button 
            variant={activeView === 'progress' ? 'default' : 'ghost'}
            className="w-full justify-start gap-3"
            onClick={() => onViewChange('progress')}
            data-testid="nav-progress"
          >
            <TrendingUp className="w-4 h-4" />
            Progreso
          </Button>
        </div>
      </div>
      
      <div className="p-4 flex-1">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Filtros
            </label>
            <div className="mt-2 space-y-2">
              <Select 
                value={filters.term?.toString() || ""} 
                onValueChange={(value) => onFiltersChange({
                  ...filters,
                  term: value && value !== "all" ? parseInt(value) : null
                })}
              >
                <SelectTrigger data-testid="filter-term">
                  <SelectValue placeholder="Todos los Semestres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Semestres</SelectItem>
                  {terms.map(term => (
                    <SelectItem key={term.term} value={term.term.toString()}>
                      Semestre {term.term} - {term.block}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant={filters.status === null ? "default" : "outline"}
                  className="text-xs"
                  onClick={() => handleStatusFilter('all')}
                  data-testid="filter-all"
                >
                  Todas
                </Button>
                <Button
                  size="sm"
                  variant={filters.status === 'available' ? "default" : "outline"}
                  className="text-xs"
                  onClick={() => handleStatusFilter('available')}
                  data-testid="filter-available"
                >
                  Disponibles
                </Button>
                <Button
                  size="sm"
                  variant={filters.status === 'blocked' ? "default" : "outline"}
                  className="text-xs"
                  onClick={() => handleStatusFilter('blocked')}
                  data-testid="filter-blocked"
                >
                  Bloqueadas
                </Button>
                <Button
                  size="sm"
                  variant={filters.status === 'passed' ? "default" : "outline"}
                  className="text-xs"
                  onClick={() => handleStatusFilter('passed')}
                  data-testid="filter-passed"
                >
                  Aprobadas
                </Button>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="electives" 
                    checked={filters.electivesOnly}
                    onCheckedChange={(checked) => onFiltersChange({
                      ...filters,
                      electivesOnly: !!checked
                    })}
                    data-testid="filter-electives-only"
                  />
                  <label htmlFor="electives" className="text-sm text-foreground">
                    Solo electivas
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="in-plan" 
                    checked={filters.inPlanOnly}
                    onCheckedChange={(checked) => onFiltersChange({
                      ...filters,
                      inPlanOnly: !!checked
                    })}
                    data-testid="filter-in-plan"
                  />
                  <label htmlFor="in-plan" className="text-sm text-foreground">
                    En mi plan
                  </label>
                </div>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-border">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Buscar
            </label>
            <Input 
              type="text" 
              placeholder="Código o nombre de materia..." 
              className="mt-2"
              value={filters.searchTerm}
              onChange={(e) => onFiltersChange({
                ...filters,
                searchTerm: e.target.value
              })}
              data-testid="search-input"
            />
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-1">
          <div data-testid="nav-credits">
            Créditos del Plan: <span className="font-medium text-foreground">0/22</span>
          </div>
          <div data-testid="nav-gpa">
            Índice: <span className="font-medium text-foreground">{gpa.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
