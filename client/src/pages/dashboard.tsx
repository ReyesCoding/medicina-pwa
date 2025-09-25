import { useState } from 'react';
import { ProgressHeader } from '@/components/progress-header';
import { Navigation } from '@/components/navigation';
import { CourseList } from '@/components/course-list';
import { CourseDetail } from '@/components/course-detail';
import { PlanModal } from '@/components/plan-modal';
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
    <div className="h-screen bg-background text-foreground font-sans antialiased">
      <ProgressHeader />
      
      <div className="flex h-[calc(100vh-80px)]">
        <Navigation 
          filters={filters}
          onFiltersChange={setFilters}
          activeView={activeView}
          onViewChange={setActiveView}
          onShowPlanModal={handleShowPlanModal}
        />
        
        <main className="flex-1">
          <CourseList 
            filters={filters}
            onCourseSelect={handleCourseSelect}
            selectedCourse={selectedCourse}
          />
        </main>
      </div>

      <PlanModal 
        open={showPlanModal} 
        onClose={handleClosePlanModal} 
      />
      
      <AdminPanel />
    </div>
  );
}
