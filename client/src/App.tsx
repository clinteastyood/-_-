import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import UploadPage from "@/pages/UploadPage";
import ResultsPage from "@/pages/ResultsPage";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useState } from "react";

function Router() {
  const [activeTab, setActiveTab] = useState<'upload' | 'results'>('upload');

  return (
    <div className="flex flex-col min-h-screen">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Switch>
          <Route path="/">
            <UploadPage setActiveTab={setActiveTab} />
          </Route>
          <Route path="/results/:projectId">
            {(params) => <ResultsPage projectId={params.projectId} />}
          </Route>
          <Route path="/results">
            <ResultsPage />
          </Route>
        </Switch>
      </main>
      
      <Footer />
      <Toaster />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;
