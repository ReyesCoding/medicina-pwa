import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCourseData } from '@/hooks/use-course-data';

export function AdminPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('11');
  const [sectionsData, setSectionsData] = useState('');
  
  const { courses, sections, getAllTerms } = useCourseData();
  const terms = getAllTerms();

  useEffect(() => {
    // Show admin panel if admin parameter is present
    const urlParams = new URLSearchParams(window.location.search);
    setIsVisible(urlParams.has('admin'));
  }, []);

  const handlePasteSections = () => {
    try {
      const parsedSections = JSON.parse(sectionsData);
      console.log('Parsed sections:', parsedSections);
      // In a real app, this would save to the backend
      alert('Sections data would be saved to the system');
    } catch (error) {
      alert('Invalid JSON format');
    }
  };

  const handleClearSections = () => {
    if (confirm('Are you sure you want to clear all sections data?')) {
      setSectionsData('');
      console.log('Sections cleared');
    }
  };

  const handleExportJSON = () => {
    const data = {
      courses: courses.filter(c => c.term === parseInt(selectedTerm)),
      sections: sections.filter(s => {
        const course = courses.find(c => c.id === s.courseId);
        return course?.term === parseInt(selectedTerm);
      })
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `term-${selectedTerm}-data.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg z-50" data-testid="admin-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Admin Panel</CardTitle>
          <span className="text-xs text-muted-foreground">?admin=true</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Manage Sections
          </label>
          <div className="space-y-2">
            <Textarea
              placeholder="Paste sections JSON data here..."
              value={sectionsData}
              onChange={(e) => setSectionsData(e.target.value)}
              className="text-xs h-20"
              data-testid="sections-textarea"
            />
            <div className="flex gap-2">
              <Button 
                size="sm" 
                className="flex-1 text-xs"
                onClick={handlePasteSections}
                disabled={!sectionsData.trim()}
                data-testid="paste-sections-btn"
              >
                Save Sections
              </Button>
              <Button 
                size="sm" 
                variant="destructive"
                className="text-xs"
                onClick={handleClearSections}
                data-testid="clear-sections-btn"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
        
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Course Term
          </label>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="text-xs" data-testid="admin-term-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {terms.map(term => (
                <SelectItem key={term.term} value={term.term.toString()}>
                  Term {term.term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button 
          size="sm" 
          className="w-full text-xs"
          onClick={handleExportJSON}
          data-testid="export-json-btn"
        >
          Export JSON
        </Button>
      </CardContent>
    </Card>
  );
}
