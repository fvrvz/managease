import { Router, Route, Navigate } from '@solidjs/router';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { CallbackPage } from '@/pages/auth/CallbackPage';
import { ProjectsPage } from '@/pages/projects/ProjectsPage';
import { BoardPage } from '@/pages/board/BoardPage';
import { BacklogPage } from '@/pages/backlog/BacklogPage';
import { SprintsPage } from '@/pages/sprints/SprintsPage';
import { RoadmapPage } from '@/pages/roadmap/RoadmapPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { ImportPage } from '@/pages/settings/ImportPage';
import { WorkflowPage } from '@/pages/workflow/WorkflowPage';
import { SettingsPage } from '@/pages/settings/SettingsPage';

export function App() {
  return (
    <Router>
      {/* Public Auth Routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/auth/callback" component={CallbackPage} />

      {/* Authenticated Routes with Jira AppLayout */}
      <Route path="/" component={AppLayout}>
        <Route path="" component={() => <Navigate href="/projects" />} />
        <Route path="projects" component={ProjectsPage} />
        <Route path="projects/:projectKey" component={() => <Navigate href="board" />} />
        <Route path="projects/:projectKey/board" component={BoardPage} />
        <Route path="projects/:projectKey/backlog" component={BacklogPage} />
        <Route path="projects/:projectKey/sprints" component={SprintsPage} />
        <Route path="projects/:projectKey/roadmap" component={RoadmapPage} />
        <Route path="projects/:projectKey/workflow" component={WorkflowPage} />
        <Route path="projects/:projectKey/reports" component={ReportsPage} />
        <Route path="projects/:projectKey/import" component={ImportPage} />
        <Route path="projects/:projectKey/settings" component={SettingsPage} />
      </Route>

      {/* Fallback */}
      <Route path="*404" component={() => <Navigate href="/projects" />} />
    </Router>
  );
}
export default App;

