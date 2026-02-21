import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Pipeline from './pages/Pipeline';
import Team from './pages/Team';
import Financials from './pages/Financials';
import Reports from './pages/Reports';
import HarvestSync from './pages/HarvestSync';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/team" element={<Team />} />
          <Route path="/financials" element={<Financials />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/harvest" element={<HarvestSync />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
