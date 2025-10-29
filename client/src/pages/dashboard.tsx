  import { useState } from 'react';
  import { ProgressHeader } from '@/components/progress-header';
  import { Navigation } from '@/components/navigation';
  import { CourseList } from '@/components/course-list';
  import { CourseDetail } from '@/components/course-detail';
  import { ComprehensivePlanModal } from '@/components/comprehensive-plan-modal';
  import { AdminPanel } from '@/components/admin-panel';
  import { Course, FilterState } from '@/types';

  export function Dashboard() {
    const [activeView, setActiveView] = useState('courses');
    const [selectedCourse, setSelectedCourse] = useState<Course | undefined>();
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
      term: null,
      status: null,
      electivesOnly: false,
      inPlanOnly: false,
      searchTerm: ''
    });

    const handleCourseSelect = (course: Course) => {
      setSelectedCourse(course);
    };

    const handleShowPlanModal = () => {
      setShowPlanModal(true);
    };

    const handleClosePlanModal = () => {
      setShowPlanModal(false);
    };

    return (
      <div className="min-h-screen bg-background text-foreground font-sans antialiased">
        <ProgressHeader />
        
        <div className="flex min-h-[calc(100vh-80px)]">
          <Navigation 
            filters={filters}
            onFiltersChange={setFilters}
            activeView={activeView}
            onViewChange={setActiveView}
            onShowPlanModal={handleShowPlanModal}
          />
          
          <main className="flex-1 overflow-auto">
            <div className="h-full flex">
              {/* Course List - 2/3 width */}
              <div className="w-2/3 border-r border-border">
                <CourseList 
                  filters={filters}
                  onCourseSelect={handleCourseSelect}
                  selectedCourse={selectedCourse}
                  onShowPlanModal={handleShowPlanModal}
                />
              </div>
              
              {/* Course Detail Sidebar - 1/3 width */}
              <div className="w-1/3 bg-background sticky top-0 h-screen overflow-y-auto">
                {selectedCourse ? (
                  <CourseDetail course={selectedCourse} />
                ) : (
                  <div className="p-6 h-full flex items-center justify-center text-center">
                    <div className="text-muted-foreground">
                      <div className="text-lg font-medium mb-2">Selecciona una materia</div>
                      <p className="text-sm">Haz clic en cualquier materia para ver sus detalles</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>

        <ComprehensivePlanModal 
          open={showPlanModal} 
          onClose={handleClosePlanModal} 
        />
        
        <AdminPanel />
      </div>
    );
  }
