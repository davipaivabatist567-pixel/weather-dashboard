import { DiagnosticsPanel } from "./components/Diagnostics";
import { Particles } from "./components/Particles";
import { PinchCursor, Sidebar, SpecialEffect, Toasts, TopBar } from "./components/Shell";
import { useRing } from "./lib/ring";
import { ativarOrion } from "./lib/actions";
import { useClapActivation } from "./lib/clap";
import { HologramOverlay, PhotoOverlay } from "./components/VisionOverlays";
import { useGestureActions, useHashNavigation, useReminderScheduler, useServerStatus } from "./lib/systemEffects";
import { AssistantPage } from "./pages/Assistant";
import { HomePage } from "./pages/Home";
import { LabPage } from "./pages/Lab";
import { MemoryPage } from "./pages/Memory";
import { ProjectsPage } from "./pages/Projects";
import { ResearchPage } from "./pages/Research";
import { SettingsPage } from "./pages/Settings";
import { VisionPage } from "./pages/Vision";
import { useOrion } from "./store";
import { useCameraAutoStart } from "./vision/permission";

const PAGES = {
  inicio: HomePage,
  assistente: AssistantPage,
  visao: VisionPage,
  laboratorio: LabPage,
  projetos: ProjectsPage,
  pesquisa: ResearchPage,
  memoria: MemoryPage,
  configuracoes: SettingsPage,
};

export function App() {
  useServerStatus();
  useGestureActions();
  useReminderScheduler();
  useHashNavigation();
  useCameraAutoStart();
  useRing();
  useClapActivation(ativarOrion);
  const page = useOrion((s) => s.page);
  const showDiag = useOrion((s) => s.settings.showDiagnostics);
  const particles = useOrion((s) => s.settings.appearance.particles && !s.settings.performance.economy && !s.settings.appearance.reducedMotion);
  const reduced = useOrion((s) => s.settings.appearance.reducedMotion);
  const updateSettings = useOrion((s) => s.updateSettings);
  const Page = PAGES[page];
  return (
    <>
      {particles && <Particles />}
      <div className={`app ${reduced ? "reduced-motion" : ""}`}>
        <Sidebar />
        <TopBar />
        <main className="main" id="conteudo">
          <Page />
        </main>
        {showDiag && <DiagnosticsPanel onClose={() => updateSettings((s) => ({ ...s, showDiagnostics: false }))} />}
      </div>
      <Toasts />
      <PinchCursor />
      <SpecialEffect />
      <HologramOverlay />
      <PhotoOverlay />
    </>
  );
}
