import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Layout from "./Layout";
import AppShell from "./components/AppShell";
import IncidentsOverview from "./pages/app/IncidentsOverview";
import IncidentDetail from "./pages/app/IncidentDetail";
import Postmortem from "./pages/app/Postmortem";
import Settings from "./pages/app/Settings";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="app" element={<AppShell />}>
            <Route index element={<IncidentsOverview />} />
            <Route path="incidents/:id" element={<IncidentDetail />} />
            <Route path="incidents/:id/postmortem" element={<Postmortem />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
