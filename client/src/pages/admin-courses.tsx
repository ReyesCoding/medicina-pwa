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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

const courseFormSchema = z.object({
  id: z.string().min(1, "Course ID is required"),
  name: z.string().min(1, "Course name is required"),
  credits: z.coerce.number().min(0, "Credits must be positive"),
  theoreticalHours: z.coerce.number().min(0, "Hours must be positive"),
  practicalHours: z.coerce.number().min(0, "Hours must be positive"),
  term: z.coerce.number().min(1, "Term must be at least 1"),
  block: z.string().min(1, "Block is required"),
  prerequisites: z.string(),
  corequisites: z.string(),
  isElective: z.boolean(),
  electiveType: z.string().optional(),
  description: z.string().optional(),
});

type CourseFormData = z.infer<typeof courseFormSchema>;

interface Course {
  id: string;
  name: string;
  credits: number;
  theoreticalHours: number;
  practicalHours: number;
  term: number;
  block: string;
  prerequisites: string[];
  corequisites: string[];
  isElective: boolean;
  electiveType: string | null;
  description: string | null;
}

export function AdminCourses() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const { toast } = useToast();

  const { data: courses = [], isLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/admin/courses", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setIsOpen(false);
      toast({ title: "Course created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create course", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest(`/api/admin/courses/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setIsOpen(false);
      setEditingCourse(null);
      toast({ title: "Course updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update course", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/admin/courses/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Course deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete course", variant: "destructive" });
    },
  });

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: {
      id: "",
      name: "",
      credits: 0,
      theoreticalHours: 0,
      practicalHours: 0,
      term: 1,
      block: "",
      prerequisites: "",
      corequisites: "",
      isElective: false,
      electiveType: "",
      description: "",
    },
  });

  const onSubmit = (data: CourseFormData) => {
    const payload = {
      ...data,
      prerequisites: data.prerequisites ? data.prerequisites.split(",").map(s => s.trim()).filter(Boolean) : [],
      corequisites: data.corequisites ? data.corequisites.split(",").map(s => s.trim()).filter(Boolean) : [],
    };

    if (editingCourse) {
      updateMutation.mutate({ id: editingCourse.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    form.reset({
      id: course.id,
      name: course.name,
      credits: course.credits,
      theoreticalHours: course.theoreticalHours,
      practicalHours: course.practicalHours,
      term: course.term,
      block: course.block,
      prerequisites: course.prerequisites.join(", "),
      corequisites: course.corequisites.join(", "),
      isElective: course.isElective,
      electiveType: course.electiveType || "",
      description: course.description || "",
    });
    setIsOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this course?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingCourse(null);
    form.reset();
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
              Course Management
            </h1>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/sections">
              <Button variant="outline" data-testid="button-sections">
                Manage Sections
              </Button>
            </Link>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingCourse(null); form.reset(); }} data-testid="button-add-course">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingCourse ? "Edit Course" : "Add New Course"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course ID</FormLabel>
                          <FormControl>
                            <Input {...field} disabled={!!editingCourse} data-testid="input-course-id" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Course Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-course-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="credits"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Credits</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-credits" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="theoreticalHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Theory Hours</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-theory-hours" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="practicalHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Practical Hours</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-practical-hours" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="term"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Term</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-term" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="block"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Block</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-block" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="prerequisites"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prerequisites (comma-separated)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., MED-100, MED-200" data-testid="input-prerequisites" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="corequisites"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Corequisites (comma-separated)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., MED-010" data-testid="input-corequisites" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="isElective"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-is-elective"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Is Elective</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="electiveType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Elective Type</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., GEN, BASICAS, CLINICAS" data-testid="input-elective-type" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-submit">
                        {editingCourse ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-gray-500 dark:text-gray-400">Loading courses...</p>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>Elective</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id} data-testid={`row-course-${course.id}`}>
                    <TableCell className="font-mono text-gray-900 dark:text-gray-100" data-testid={`text-course-id-${course.id}`}>{course.id}</TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100" data-testid={`text-course-name-${course.id}`}>{course.name}</TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100" data-testid={`text-course-credits-${course.id}`}>{course.credits}</TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100" data-testid={`text-course-term-${course.id}`}>{course.term}</TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100" data-testid={`text-course-block-${course.id}`}>{course.block}</TableCell>
                    <TableCell className="text-gray-900 dark:text-gray-100" data-testid={`text-course-elective-${course.id}`}>
                      {course.isElective ? "Yes" : "No"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(course)}
                          data-testid={`button-edit-${course.id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(course.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${course.id}`}
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
