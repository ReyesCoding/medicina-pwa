import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StudentProgressProvider } from "@/contexts/student-progress-context";
import { Dashboard } from "@/pages/dashboard";
import { AdminCourses } from "@/pages/admin-courses";
import { AdminSections } from "@/pages/admin-sections";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/admin/courses" component={AdminCourses} />
      <Route path="/admin/sections" component={AdminSections} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StudentProgressProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </StudentProgressProvider>
    </QueryClientProvider>
  );
}

export default App;
