import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@vercel/analytics/react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Programs from "./pages/Programs";
import ProgramDetail from "./pages/ProgramDetail";
import Partner from "./pages/Partner";
import Contact from "./pages/Contact";
import Register from "./pages/Register";
import { ProgramSelectionProvider } from "./contexts/ProgramSelection";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/partner" component={Partner} />
      <Route path="/contact" component={Contact} />
      <Route path="/register" component={Register} />
      <Route path="/programs" component={Programs} />
      <Route path="/programs/:slug" component={ProgramDetail} />
      <Route path="/auth" component={Auth} />
      <Route path="/auth/signup/:token" component={Auth} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin/invite/:token" component={Admin} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" />
          <ProgramSelectionProvider>
            <Router />
          </ProgramSelectionProvider>
          <Analytics />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
