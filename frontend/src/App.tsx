import React, { useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { OrganizationProvider, useOrganization } from './context/OrganizationContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { API_BASE } from './api/client';

// Feature Views
import { DashboardView } from './features/dashboard/DashboardView';
import { CompanyChatView } from './features/chat/CompanyChatView';
import { KnowledgeVaultView } from './features/knowledge/KnowledgeVaultView';
import { TeamsView } from './features/teams/TeamsView';
import { ProjectsView } from './features/projects/ProjectsView';
import { TasksView } from './features/tasks/TasksView';
import { ClientsView } from './features/clients/ClientsView';
import { DocumentsView } from './features/documents/DocumentsView';
import { AnalyticsView } from './features/analytics/AnalyticsView';
import { WorkflowsView } from './features/workflows/WorkflowsView';
import { OrganizationSettingsView } from './features/settings/OrganizationSettingsView';

const ModuleRouter: React.FC = () => {
  const { activeModule } = useOrganization();

  switch (activeModule) {
    case 'dashboard':
      return <DashboardView />;
    case 'chat':
      return <CompanyChatView />;
    case 'knowledge':
      return <KnowledgeVaultView />;
    case 'teams':
      return <TeamsView />;
    case 'projects':
      return <ProjectsView />;
    case 'tasks':
      return <TasksView />;
    case 'clients':
      return <ClientsView />;
    case 'documents':
      return <DocumentsView />;
    case 'analytics':
      return <AnalyticsView />;
    case 'workflows':
      return <WorkflowsView />;
    case 'settings':
      return <OrganizationSettingsView />;
    default:
      return <DashboardView />;
  }
};

export const AppContent: React.FC = () => {
  // Global backend keep-warm ping to eliminate cold-starts across all company views
  useEffect(() => {
    const keepWarm = () => {
      fetch(`${API_BASE}/health`).catch(() => {});
    };
    keepWarm();
    const interval = setInterval(keepWarm, 3.5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-solian-obsidian text-slate-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <ModuleRouter />
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <AppContent />
      </OrganizationProvider>
    </AuthProvider>
  );
}

export default App;

