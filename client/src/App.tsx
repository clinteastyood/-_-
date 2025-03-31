import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import UploadPage from "@/pages/upload";
import ResultsPage from "@/pages/results";
import Header from "@/components/header";
import Footer from "@/components/footer";
import LoadingOverlay from "@/components/loading-overlay";
import { useState } from "react";

function Router() {
  const [loading, setLoading] = useState<boolean>(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto p-4">
        <Switch>
          <Route path="/" component={() => <UploadPage setLoading={setLoading} />} />
          <Route path="/results/:id" component={ResultsPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      
      <Footer />
      
      {loading && <LoadingOverlay />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
