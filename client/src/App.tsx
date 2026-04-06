import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorPopup } from "@/components/error-popup";
import ChatPage from "@/pages/chat";
import UseCasesPage from "@/pages/use-cases";
import UserGuidePage from "@/pages/user-guide";
import SharingEligibilityPage from "@/pages/sharing-eligibility";
import SystemPromptsPage from "@/pages/system-prompts";
import SettingsPage from "@/pages/settings";

function Routes() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      <Route path="/use-cases" component={UseCasesPage} />
      <Route path="/nudge"><Redirect to="/" /></Route>
      <Route path="/user-guide" component={UserGuidePage} />
      <Route path="/sharing-eligibility" component={SharingEligibilityPage} />
      <Route path="/system-prompts" component={SystemPromptsPage} />
      <Route path="/settings" component={SettingsPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ErrorPopup />
        <WouterRouter base="/dataowner">
          <Routes />
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
