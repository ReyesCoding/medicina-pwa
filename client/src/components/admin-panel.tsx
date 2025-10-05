import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export function AdminPanel() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsVisible(urlParams.has('admin'));
  }, []);

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg z-50" data-testid="admin-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Admin Panel
          </CardTitle>
          <span className="text-xs text-muted-foreground">?admin=true</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground mb-4">
          Manage courses and sections in the system
        </p>
        <div className="space-y-2">
          <Link href="/admin/courses">
            <Button 
              size="sm" 
              className="w-full text-xs"
              data-testid="admin-courses-btn"
            >
              Manage Courses
            </Button>
          </Link>
          <Link href="/admin/sections">
            <Button 
              size="sm" 
              variant="outline"
              className="w-full text-xs"
              data-testid="admin-sections-btn"
            >
              Manage Sections
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
