// client/src/App.tsx
import { Switch, Route, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StudentProgressProvider } from "@/contexts/student-progress-context";
import { Dashboard } from "@/pages/dashboard";
import { AdminCourses } from "@/pages/admin-courses";
import { AdminSections } from "@/pages/admin-sections";
import NotFound from "@/pages/not-found";

function App() {
  // wouter necesita conocer la base "/medicina-pwa"
  // import.meta.env.BASE_URL en producción vale "/medicina-pwa/"
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, ""); // => "/medicina-pwa"

  return (
    <QueryClientProvider client={queryClient}>
      <StudentProgressProvider>
        <TooltipProvider>
          <Toaster />
          <WouterRouter base={base}>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/admin/courses" component={AdminCourses} />
              <Route path="/admin/sections" component={AdminSections} />
              <Route component={NotFound} />
            </Switch>
          </WouterRouter>
        </TooltipProvider>
      </StudentProgressProvider>
    </QueryClientProvider>
  );
}

export default App;
