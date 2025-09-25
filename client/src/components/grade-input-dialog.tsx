import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface GradeInputDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (grade: string) => void;
  courseName: string;
}

const grades = [
  { value: 'A+', label: 'A+ (4.0)' },
  { value: 'A', label: 'A (4.0)' },
  { value: 'A-', label: 'A- (3.7)' },
  { value: 'B+', label: 'B+ (3.3)' },
  { value: 'B', label: 'B (3.0)' },
  { value: 'B-', label: 'B- (2.7)' },
  { value: 'C+', label: 'C+ (2.3)' },
  { value: 'C', label: 'C (2.0)' },
  { value: 'C-', label: 'C- (1.7)' },
  { value: 'D+', label: 'D+ (1.3)' },
  { value: 'D', label: 'D (1.0)' },
  { value: 'D-', label: 'D- (0.7)' },
  { value: 'F', label: 'F (0.0)' }
];

export function GradeInputDialog({ open, onClose, onConfirm, courseName }: GradeInputDialogProps) {
  const [selectedGrade, setSelectedGrade] = useState<string>('');

  const handleConfirm = () => {
    if (selectedGrade) {
      onConfirm(selectedGrade);
      setSelectedGrade('');
      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedGrade('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Grade for {courseName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="grade-select">Grade</Label>
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger id="grade-select" data-testid="grade-select">
                <SelectValue placeholder="Select a grade" />
              </SelectTrigger>
              <SelectContent>
                {grades.map((grade) => (
                  <SelectItem key={grade.value} value={grade.value} data-testid={`grade-${grade.value}`}>
                    {grade.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} data-testid="grade-cancel">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedGrade}
            data-testid="grade-confirm"
          >
            Mark as Passed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}