import { useState, useEffect } from "react";
import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorPopup } from "@/components/error-popup";
import { EntityProvider } from "@/context/entity-context";
import { ThemeProvider } from "@/context/theme-context";
import ChatPage from "@/pages/chat";
import UseCasesPage from "@/pages/use-cases";
import UserGuidePage from "@/pages/user-guide";
import SharingEligibilityPage from "@/pages/sharing-eligibility";
import EntitySettingsPage from "@/pages/entity-settings";
import LoginPage from "@/pages/login";

const SESSION_KEY = "zatca-session-user";

interface SessionUser {
  id: number;
  name: string;
  email: string;
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      <Route path="/use-cases" component={UseCasesPage} />
      <Route path="/nudge"><Redirect to="/" /></Route>
      <Route path="/user-guide" component={UserGuidePage} />
      <Route path="/sharing-eligibility" component={SharingEligibilityPage} />
      <Route path="/entity-settings" component={EntitySettingsPage} />
    </Switch>
  );
}

function App() {
  const [user, setUser] = useState<SessionUser | null>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  function handleLogin(u: SessionUser) {
    setUser(u);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(u));
  }

  function handleLogout() {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  // Expose logout globally so chat page can use it
  useEffect(() => {
    (window as any).__logout = handleLogout;
    return () => { delete (window as any).__logout; };
  }, []);

  return (
    <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <EntityProvider>
          <Toaster />
          <ErrorPopup />
          {user ? (
            <WouterRouter base="/dataowner">
              <Routes />
            </WouterRouter>
          ) : (
            <LoginPage onLogin={handleLogin} />
          )}
        </EntityProvider>
      </TooltipProvider>
    </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
