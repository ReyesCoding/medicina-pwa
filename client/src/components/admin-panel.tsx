import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export function AdminPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setIsVisible(urlParams.has('admin'));
  }, []);

  const handleSeedDatabase = async () => {
    if (!confirm('This will load all courses and sections from the JSON files into the database. Continue?')) {
      return;
    }

    setIsSeeding(true);
    try {
      const response = await apiRequest('POST', '/api/admin/seed-database');
      const data = await response.json() as any;
      toast({
        title: 'Success!',
        description: data.message,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to seed database. Check console for details.',
        variant: 'destructive',
      });
      console.error('Seed error:', error);
    } finally {
      setIsSeeding(false);
    }
  };

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
          <Button 
            size="sm" 
            variant="secondary"
            className="w-full text-xs"
            onClick={handleSeedDatabase}
            disabled={isSeeding}
            data-testid="admin-seed-btn"
          >
            <Database className="h-3 w-3 mr-1" />
            {isSeeding ? 'Seeding...' : 'Seed Database'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
