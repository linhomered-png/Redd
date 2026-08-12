import { useEffect, useState } from "react";
import "./App.css";
import { LandingPage } from "./components/LandingPage";
import { ShortDramaTool } from "./components/ShortDramaTool";

type View = "landing" | "tool";

function viewFromHash(): View {
  return window.location.hash === "#tool" ? "tool" : "landing";
}

function App() {
  const [view, setView] = useState<View>(viewFromHash);

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function goToTool() {
    window.location.hash = "tool";
    setView("tool");
  }

  function goToLanding() {
    window.location.hash = "";
    setView("landing");
  }

  return view === "tool" ? (
    <ShortDramaTool onBack={goToLanding} />
  ) : (
    <LandingPage onStart={goToTool} />
  );
}

export default App;
