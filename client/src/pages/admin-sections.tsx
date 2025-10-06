import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const sectionFormSchema = z.object({
  courseId: z.string().min(1, "Course ID is required"),
  sectionNumber: z.string().min(1, "Section number is required"),
  instructor: z.string().min(1, "Instructor is required"),
  room: z.string().min(1, "Room is required"),
  crn: z.string().min(1, "CRN is required"),
  schedule: z.string().min(1, "Schedule is required"),
  maxCapacity: z.coerce.number().min(1, "Max capacity must be at least 1"),
  currentEnrollment: z.coerce.number().min(0, "Enrollment must be non-negative"),
});

type SectionFormData = z.infer<typeof sectionFormSchema>;

interface Section {
  id: string;
  courseId: string;
  sectionNumber: string;
  instructor: string;
  room: string;
  crn: string;
  schedule: { day: string; startTime: string; endTime: string }[];
  maxCapacity: number;
  currentEnrollment: number;
}

interface Course {
  id: string;
  name: string;
}

export function AdminSections() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const { toast } = useToast();

  const { data: sections = [], isLoading } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/admin/sections", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      setIsOpen(false);
      toast({ title: "Section created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create section", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/admin/sections/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      setIsOpen(false);
      setEditingSection(null);
      toast({ title: "Section updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update section", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/sections/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      toast({ title: "Section deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete section", variant: "destructive" });
    },
  });

  const form = useForm<SectionFormData>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: {
      courseId: "",
      sectionNumber: "",
      instructor: "",
      room: "",
      crn: "",
      schedule: "",
      maxCapacity: 30,
      currentEnrollment: 0,
    },
  });

  const onSubmit = (data: SectionFormData) => {
    try {
      const scheduleData = JSON.parse(data.schedule);
      if (!Array.isArray(scheduleData)) {
        toast({ title: "Schedule must be a JSON array", variant: "destructive" });
        return;
      }
      
      const payload = {
        ...data,
        schedule: scheduleData,
      };

      if (editingSection) {
        updateMutation.mutate({ id: editingSection.id, data: payload });
      } else {
        createMutation.mutate(payload);
      }
    } catch (error) {
      toast({ title: "Invalid JSON format for schedule", variant: "destructive" });
    }
  };

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    form.reset({
      courseId: section.courseId,
      sectionNumber: section.sectionNumber,
      instructor: section.instructor,
      room: section.room,
      crn: section.crn,
      schedule: JSON.stringify(section.schedule),
      maxCapacity: section.maxCapacity,
      currentEnrollment: section.currentEnrollment,
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this section?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingSection(null);
    form.reset();
  };

  const getCourseNameById = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    return course ? `${course.id} - ${course.name}` : courseId;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Section Management
            </h1>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/courses">
              <Button variant="outline" data-testid="button-courses">
                Manage Courses
              </Button>
            </Link>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingSection(null); form.reset(); }} data-testid="button-add-section">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingSection ? "Edit Section" : "Add New Section"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="courseId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-course">
                                <SelectValue placeholder="Select a course" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {courses.map((course) => (
                                <SelectItem key={course.id} value={course.id}>
                                  {course.id} - {course.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="sectionNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Section Number</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-section-number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="crn"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CRN</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-crn" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="instructor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instructor</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-instructor" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="room"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Room</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-room" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="schedule"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Schedule (JSON format)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder='[{"day":"Monday","startTime":"08:00","endTime":"10:00"}]'
                              data-testid="input-schedule"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="maxCapacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Capacity</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-max-capacity" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="currentEnrollment"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Enrollment</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-current-enrollment" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                        {editingSection ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-gray-500 dark:text-gray-400">Loading sections...</p>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>CRN</TableHead>
                  <TableHead>Instructor</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((section) => (
                  <TableRow key={section.id} data-testid={`row-section-${section.id}`}>
                    <TableCell className="text-gray-900 dark:text-gray-100" data-testid={`text-course-${section.id}`}>
                      {getCourseNameById(section.courseId)}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100" data-testid={`text-section-number-${section.id}`}>
                      {section.sectionNumber}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100" data-testid={`text-crn-${section.id}`}>
                      {section.crn}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100" data-testid={`text-instructor-${section.id}`}>
                      {section.instructor}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100" data-testid={`text-room-${section.id}`}>
                      {section.room}
                    </TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100" data-testid={`text-capacity-${section.id}`}>
                      {section.currentEnrollment}/{section.maxCapacity}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(section)}
                          data-testid={`button-edit-${section.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(section.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${section.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
