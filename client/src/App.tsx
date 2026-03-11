import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ChatPage from "@/pages/chat";
import UseCasesPage from "@/pages/use-cases";
import UserGuidePage from "@/pages/user-guide";
import SharingEligibilityPage from "@/pages/sharing-eligibility";
import BiAgentPage from "@/pages/bi-agent";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      <Route path="/use-cases" component={UseCasesPage} />
      <Route path="/nudge"><Redirect to="/" /></Route>
      <Route path="/user-guide" component={UserGuidePage} />
      <Route path="/sharing-eligibility" component={SharingEligibilityPage} />
      <Route path="/bi-agent" component={BiAgentPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
