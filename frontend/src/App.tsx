import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import { OrganizationProvider, useOrganization } from './context/OrganizationContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { API_BASE, buildApiUrl } from './api/client';

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
import { MeetingsView } from './features/meetings/MeetingsView';
import { DiscussionsView } from './features/discussions/DiscussionsView';
import { CalendarView } from './features/calendar/CalendarView';
import { FinanceView } from './features/finance/FinanceView';
import { EmailView } from './features/email/EmailView';

const ModuleRouter: React.FC = () => {
  const { activeModule } = useOrganization();

  switch (activeModule) {
    case 'dashboard':
      return <DashboardView />;
    case 'chat':
      return <CompanyChatView />;
    case 'finance':
      return <FinanceView />;
    case 'email':
      return <EmailView />;
    case 'knowledge':
      return <KnowledgeVaultView />;
    case 'teams':
      return <TeamsView />;
    case 'projects':
      return <ProjectsView />;
    case 'tasks':
      return <TasksView />;
    case 'meetings':
      return <MeetingsView />;
    case 'discussions':
      return <DiscussionsView />;
    case 'calendar':
      return <CalendarView />;
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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Monitor network status for mobile resilience
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Global backend keep-warm ping to eliminate cold-starts across all company views
  useEffect(() => {
    const keepWarm = () => {
      fetch(buildApiUrl('/health')).catch(() => {});
    };
    keepWarm();
    const interval = setInterval(keepWarm, 3.5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen h-[100dvh] bg-solian-obsidian text-slate-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {isOffline && (
          <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-300 px-3 py-1.5 text-xs flex items-center justify-center gap-2 font-medium z-30">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Offline Mode: Working from local cache. Changes will synchronize upon reconnection.</span>
          </div>
        )}
        <Topbar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <ModuleRouter />
        </main>
        <MobileBottomNav />
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
