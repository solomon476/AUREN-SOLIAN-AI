import {
  UserProfile,
  Organization,
  Department,
  Team,
  HierarchyNode,
  CompanyOperatingInfo,
  KnowledgeItem,
  TeamMember,
  Project,
  TaskItem,
  ClientAccount,
  CorporateDocument,
  WorkflowRule,
  DashboardStats,
  CompanyActivityEvent,
  UserRole,
  Meeting,
  MeetingCreate,
  MeetingUpdate,
  DiscussionMessage,
  DiscussionMessageCreate,
  DiscussionChannel,
  NotificationItem,
  CalendarEvent,
  UnifiedSearchResults,
  MemberInviteCreate,
  FinancialAccount,
  FinancialTransaction,
  Invoice,
  AccountsPayable,
  FinancialBudget,
  ExpenseRequest,
  FinancialOverviewStats,
  ProjectFinancialSummary,
} from '../types';

function resolveApiBase(): string {
  const envUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '') as string;
  const trimmed = envUrl.trim();
  if (!trimmed) {
    return '/api/v1';
  }
  let base = trimmed;
  while (base.endsWith('/')) {
    base = base.slice(0, -1);
  }
  if (!base.endsWith('/api/v1')) {
    if (base.endsWith('/api')) {
      base = `${base}/v1`;
    } else {
      base = `${base}/api/v1`;
    }
  }
  return base;
}

export const API_BASE = resolveApiBase();

export function buildApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let url = `${API_BASE}${cleanEndpoint}`;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    const base = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:8000';
    try {
      url = new URL(url, base).toString();
    } catch {
      url = `http://localhost:8000${url}`;
    }
  }
  return url;
}

export class SolianApiClient {
  private static currentUserId: string = 'usr-1';
  private static authToken: string | null = null;

  static buildUrl(endpoint: string): string {
    return buildApiUrl(endpoint);
  }

  static setCurrentUserId(userId: string) {
    this.currentUserId = userId;
  }

  static getCurrentUserId(): string {
    return this.currentUserId;
  }

  static setAuthToken(token: string | null) {
    this.authToken = token;
  }

  static getAuthToken(): string | null {
    return this.authToken;
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    } else {
      headers['X-User-Id'] = this.currentUserId;
    }

    const url = buildApiUrl(endpoint);

    const res = await fetch(url, {
      headers,
      ...options,
    });

    if (!res.ok) {
      const errText = await res.text();
      let errorMsg = `API Error [${res.status}]: ${res.statusText}`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.detail) errorMsg = parsed.detail;
      } catch {}
      throw new Error(errorMsg);
    }
    return res.json();
  }

  // Current Authenticated User Profile (Server-Side Role Resolution)
  static async getCurrentUserProfile(): Promise<UserProfile> {
    const data = await this.request<any>('/auth/me');
    return {
      id: data.id,
      userId: data.userId,
      email: data.email,
      fullName: data.fullName,
      title: data.title,
      role: data.role as UserRole,
      department: data.department,
      responsibilities: data.responsibilities || [],
      reportsTo: data.reportsTo || null,
    };
  }

  // Organization & Profile
  static async getOrganizationProfile(): Promise<Organization> {
    try {
      const org = await this.request<any>('/auth/org');
      return {
        id: org.id,
        name: org.name,
        code: org.code,
        tagline: org.tagline,
        mission: org.mission,
        vision: org.vision,
        operating_model: org.operating_model,
        headquarters: org.headquarters,
        founded_year: org.founded_year,
        primary_timezone: org.primary_timezone,
        fiscal_year: org.fiscal_year,
        tier: org.tier || 'enterprise',
        totalMembers: org.total_members || 5,
      };
    } catch {
      return {
        id: 'org-solian-wolves',
        name: 'Solian Wolves',
        code: 'SLN-WLV',
        tagline: 'Organizational Intelligence & High-Trust Autonomous Operations',
        tier: 'enterprise',
        totalMembers: 5,
      };
    }
  }

  static async updateOrganizationProfile(profile: Partial<Organization>): Promise<Organization> {
    return await this.request<Organization>('/auth/org/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  }

  static async getOperatingInfo(): Promise<CompanyOperatingInfo> {
    return await this.request<CompanyOperatingInfo>('/auth/operating-info');
  }

  static async getAvailableUsers(): Promise<UserProfile[]> {
    try {
      const users = await this.request<any[]>('/auth/users');
      return users.map((u) => ({
        id: u.id,
        userId: u.userId,
        email: u.email,
        fullName: u.name,
        title: u.title,
        role: u.role,
        department: u.department,
        responsibilities: u.responsibilities,
        reportsTo: u.reportsTo,
        isDemo: u.isDemo,
      }));
    } catch {
      return [
        { id: 'tm-1', userId: 'usr-1', email: 'ian.nyakundi@solianwolves.co', fullName: 'Ian Momanyi Nyakundi', title: 'Chief Executive Officer', role: 'owner', department: 'Executive Leadership & Governance', isDemo: false },
        { id: 'tm-2', userId: 'usr-2', email: 'hillary.isaiah@solianwolves.co', fullName: 'Hillary Onchwati Isaiah', title: 'Chief Operating Officer', role: 'admin', department: 'Operations & Delivery', isDemo: false },
        { id: 'tm-3', userId: 'usr-3', email: 'alice.moraa@solianwolves.co', fullName: 'Alice Moraa Nyakundi', title: 'Chief Financial Officer', role: 'admin', department: 'Finance & Corporate Treasury', isDemo: false },
        { id: 'tm-4', userId: 'usr-4', email: 'noella.maraka@solianwolves.co', fullName: 'Noella Maraka Kaatho', title: 'Executive Director / Finance & Administration', role: 'manager', department: 'Administration & Corporate Services', isDemo: false },
        { id: 'tm-5', userId: 'usr-5', email: 'solomon.omwenga@solianwolves.co', fullName: 'Solomon Nyangweso Omwenga', title: 'Chief Technology Officer', role: 'admin', department: 'Technology & AI Systems', isDemo: false },
      ];
    }
  }

  // Departments, Teams & Hierarchy
  static async getDepartments(): Promise<Department[]> {
    try {
      return await this.request<Department[]>('/teams/departments');
    } catch {
      return [];
    }
  }

  static async getTeams(departmentId?: string): Promise<Team[]> {
    try {
      const q = departmentId ? `?department_id=${encodeURIComponent(departmentId)}` : '';
      return await this.request<Team[]>(`/teams/teams${q}`);
    } catch {
      return [];
    }
  }

  static async getHierarchy(): Promise<HierarchyNode[]> {
    try {
      return await this.request<HierarchyNode[]>('/teams/hierarchy');
    } catch {
      return [];
    }
  }

  static async getTeamMembers(): Promise<TeamMember[]> {
    try {
      return await this.request<TeamMember[]>('/teams/members');
    } catch {
      return [];
    }
  }

  static async updateMemberRole(memberId: string, role: UserRole): Promise<{ id: string; role: string; message: string }> {
    return await this.request<{ id: string; role: string; message: string }>(`/teams/members/${memberId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }

  // Dashboard & Activities
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      return await this.request<DashboardStats>('/dashboard/stats');
    } catch {
      return {
        activeStaffCount: 5,
        activeProjectsCount: 0,
        openOperationsCount: 0,
        knowledgeEntitiesCount: 0,
        departmentsCount: 5,
        operationsVelocity: '0%',
        urgentTasksCount: 0,
        pendingReviewsCount: 0,
        hasDemoData: false,
        verifiedKnowledgeCount: 0,
        recentActivities: [],
        operationalInsights: [
          {
            id: 'ins-init',
            category: 'alignment',
            title: 'Platform Operational & Ready',
            description: 'Solian Wolves operating environment online. Track company initiatives, operations, and treasury records.',
            severity: 'info',
            metricSource: 'Platform Core',
            isDemoInsight: false,
          },
        ],
      };
    }
  }

  static async getRecentActivities(limit: number = 10): Promise<CompanyActivityEvent[]> {
    try {
      return await this.request<CompanyActivityEvent[]>(`/dashboard/activities?limit=${limit}`);
    } catch {
      return [];
    }
  }

  // Knowledge Vault
  static async getKnowledgeItems(query?: string, category?: string): Promise<KnowledgeItem[]> {
    try {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (category && category !== 'All') params.append('category', category);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return await this.request<KnowledgeItem[]>(`/knowledge/items${qs}`);
    } catch {
      return [];
    }
  }

  static async getKnowledgeItem(itemId: string): Promise<KnowledgeItem> {
    return await this.request<KnowledgeItem>(`/knowledge/items/${itemId}`);
  }

  static async createKnowledgeItem(item: {
    title: string;
    category: string;
    snippet: string;
    content: string;
    classification: string;
    department?: string;
    tags?: string[];
  }): Promise<KnowledgeItem> {
    return await this.request<KnowledgeItem>('/knowledge/items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  // Projects
  static async getProjects(): Promise<Project[]> {
    try {
      return await this.request<Project[]>('/projects');
    } catch {
      return [];
    }
  }

  static async createProject(project: {
    name: string;
    client?: string;
    status: string;
    progress: number;
    lead: string;
    due_date: string;
    priority: string;
    department?: string;
    description?: string;
  }): Promise<Project> {
    return await this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  static async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    return await this.request<Project>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  // Tasks
  static async getTasks(status?: string): Promise<TaskItem[]> {
    try {
      const q = status ? `?status=${encodeURIComponent(status)}` : '';
      return await this.request<TaskItem[]>(`/tasks${q}`);
    } catch {
      return [];
    }
  }

  static async createTask(task: {
    title: string;
    description?: string;
    project_id?: string;
    project_name?: string;
    status?: string;
    priority: string;
    assignee: string;
    due_date: string;
    department?: string;
  }): Promise<TaskItem> {
    return await this.request<TaskItem>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  static async updateTask(
    taskId: string,
    update: {
      status?: string;
      priority?: string;
      assignee?: string;
      due_date?: string;
    }
  ): Promise<TaskItem> {
    return await this.request<TaskItem>(`/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  // Clients
  static async getClients(): Promise<ClientAccount[]> {
    try {
      return await this.request<ClientAccount[]>('/clients');
    } catch {
      return [];
    }
  }

  static async createClient(client: {
    company_name: string;
    contact_person: string;
    email: string;
    status: string;
    contract_value: string;
    lead_account_manager: string;
    notes?: string;
  }): Promise<ClientAccount> {
    return await this.request<ClientAccount>('/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    });
  }

  // Documents
  static async getDocuments(): Promise<CorporateDocument[]> {
    return await this.request<CorporateDocument[]>('/documents');
  }

  // Workflows
  static async getWorkflows(): Promise<WorkflowRule[]> {
    return await this.request<WorkflowRule[]>('/workflows');
  }

  static async createWorkflow(workflow: {
    title: string;
    trigger: string;
    action: string;
    status?: string;
    department?: string;
  }): Promise<WorkflowRule> {
    return await this.request<WorkflowRule>('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  // Analytics
  static async getAnalyticsMetrics(): Promise<any> {
    try {
      return await this.request<any>('/analytics/metrics');
    } catch {
      return {};
    }
  }

  // Chat Action Proposal Execution
  static async executeChatAction(
    proposalId: string,
    actionType: string,
    payload: Record<string, any>
  ): Promise<{ success: boolean; message: string; entity_id?: string; entity_type?: string; already_executed?: boolean }> {
    return await this.request<{ success: boolean; message: string; entity_id?: string; entity_type?: string; already_executed?: boolean }>(
      '/chat/execute-action',
      {
        method: 'POST',
        body: JSON.stringify({
          proposal_id: proposalId,
          action_type: actionType,
          payload,
        }),
      }
    );
  }

  // Member Management & Roster
  static async inviteMember(invite: MemberInviteCreate): Promise<TeamMember> {
    return await this.request<TeamMember>('/teams/members/invite', {
      method: 'POST',
      body: JSON.stringify(invite),
    });
  }

  static async updateMemberStatus(memberId: string, status: string): Promise<{ id: string; status: string; message: string }> {
    return await this.request<{ id: string; status: string; message: string }>(`/teams/members/${memberId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  // Meetings & Governance Minutes
  static async getMeetings(status?: string, meetingType?: string): Promise<Meeting[]> {
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (meetingType) params.append('meeting_type', meetingType);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return await this.request<Meeting[]>(`/meetings${qs}`);
    } catch {
      return [];
    }
  }

  static async getMeeting(meetingId: string): Promise<Meeting> {
    return await this.request<Meeting>(`/meetings/${meetingId}`);
  }

  static async createMeeting(meeting: MeetingCreate): Promise<{ id: string; title: string; message: string }> {
    return await this.request<{ id: string; title: string; message: string }>('/meetings', {
      method: 'POST',
      body: JSON.stringify(meeting),
    });
  }

  static async updateMeeting(meetingId: string, update: MeetingUpdate): Promise<{ id: string; title: string; status: string; message: string }> {
    return await this.request<{ id: string; title: string; status: string; message: string }>(`/meetings/${meetingId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  static async convertMeetingActionToTask(meetingId: string, actionItemId: string): Promise<{ taskId: string; title: string; message: string }> {
    return await this.request<{ taskId: string; title: string; message: string }>(`/meetings/${meetingId}/action-items/${actionItemId}/convert-to-task`, {
      method: 'POST',
    });
  }

  static async publishMeetingDecisionToKnowledge(meetingId: string, decisionId: string): Promise<{ knowledgeItemId: string; title: string; message: string }> {
    return await this.request<{ knowledgeItemId: string; title: string; message: string }>(`/meetings/${meetingId}/decisions/${decisionId}/publish-to-knowledge`, {
      method: 'POST',
    });
  }

  // Discussions & Threads
  static async getDiscussionChannels(): Promise<DiscussionChannel[]> {
    return await this.request<DiscussionChannel[]>('/discussions/channels');
  }

  static async getDiscussionMessages(channelId?: string, channelType?: string, parentId?: string): Promise<DiscussionMessage[]> {
    const params = new URLSearchParams();
    if (channelId) params.append('channel_id', channelId);
    if (channelType) params.append('channel_type', channelType);
    if (parentId !== undefined) params.append('parent_id', parentId);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return await this.request<DiscussionMessage[]>(`/discussions/messages${qs}`);
  }

  static async createDiscussionMessage(msg: DiscussionMessageCreate): Promise<{ id: string; content: string; message: string }> {
    return await this.request<{ id: string; content: string; message: string }>('/discussions/messages', {
      method: 'POST',
      body: JSON.stringify(msg),
    });
  }

  // Notifications
  static async getNotifications(unreadOnly: boolean = false): Promise<NotificationItem[]> {
    try {
      const qs = unreadOnly ? '?unread_only=true' : '';
      return await this.request<NotificationItem[]>(`/notifications${qs}`);
    } catch {
      return [];
    }
  }

  static async markNotificationRead(notificationId: string): Promise<{ id: string; isRead: boolean }> {
    return await this.request<{ id: string; isRead: boolean }>(`/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  static async markAllNotificationsRead(): Promise<{ markedCount: number; message: string }> {
    return await this.request<{ markedCount: number; message: string }>('/notifications/read-all', {
      method: 'POST',
    });
  }

  // Operational Calendar
  static async getCalendarEvents(startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return await this.request<CalendarEvent[]>(`/calendar/events${qs}`);
    } catch {
      return [];
    }
  }

  // Unified Search (Command Palette)
  static async searchUnified(query: string): Promise<UnifiedSearchResults> {
    return await this.request<UnifiedSearchResults>(`/search/unified?q=${encodeURIComponent(query)}`);
  }

  // =========================================================================
  // Phase 4: Finance & Company Records API
  // =========================================================================

  // Overview
  static async getFinancialOverview(): Promise<FinancialOverviewStats> {
    return await this.request<FinancialOverviewStats>('/finance/overview');
  }

  // Accounts
  static async getFinancialAccounts(includeArchived: boolean = false): Promise<FinancialAccount[]> {
    try {
      return await this.request<FinancialAccount[]>(`/finance/accounts?include_archived=${includeArchived}`);
    } catch {
      return [];
    }
  }

  static async getFinancialAccount(accountId: string): Promise<FinancialAccount> {
    return await this.request<FinancialAccount>(`/finance/accounts/${accountId}`);
  }

  static async createFinancialAccount(account: {
    name: string;
    account_type: string;
    account_number?: string;
    currency?: string;
    opening_balance?: number;
    description?: string;
  }): Promise<FinancialAccount> {
    return await this.request<FinancialAccount>('/finance/accounts', {
      method: 'POST',
      body: JSON.stringify(account),
    });
  }

  static async updateFinancialAccount(accountId: string, update: Partial<FinancialAccount>): Promise<FinancialAccount> {
    return await this.request<FinancialAccount>(`/finance/accounts/${accountId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  // Transactions
  static async getFinancialTransactions(params?: {
    accountId?: string;
    transactionType?: string;
    category?: string;
    projectId?: string;
    clientId?: string;
    limit?: number;
  }): Promise<FinancialTransaction[]> {
    try {
      const sp = new URLSearchParams();
      if (params?.accountId) sp.append('account_id', params.accountId);
      if (params?.transactionType) sp.append('transaction_type', params.transactionType);
      if (params?.category) sp.append('category', params.category);
      if (params?.projectId) sp.append('project_id', params.projectId);
      if (params?.clientId) sp.append('client_id', params.clientId);
      if (params?.limit) sp.append('limit', String(params.limit));
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return await this.request<FinancialTransaction[]>(`/finance/transactions${qs}`);
    } catch {
      return [];
    }
  }

  static async createFinancialTransaction(tx: {
    transaction_type: string;
    date: string;
    description: string;
    amount: number;
    currency?: string;
    account_id: string;
    destination_account_id?: string;
    category: string;
    project_id?: string;
    client_id?: string;
    invoice_id?: string;
    payable_id?: string;
    payment_method?: string;
    supporting_document_url?: string;
    notes?: string;
  }): Promise<FinancialTransaction> {
    return await this.request<FinancialTransaction>('/finance/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
  }

  static async reverseFinancialTransaction(txId: string, reason: string): Promise<FinancialTransaction> {
    return await this.request<FinancialTransaction>(`/finance/transactions/${txId}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Invoices (Accounts Receivable)
  static async getInvoices(params?: {
    status?: string;
    clientId?: string;
    projectId?: string;
  }): Promise<Invoice[]> {
    try {
      const sp = new URLSearchParams();
      if (params?.status) sp.append('status', params.status);
      if (params?.clientId) sp.append('client_id', params.clientId);
      if (params?.projectId) sp.append('project_id', params.projectId);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return await this.request<Invoice[]>(`/finance/invoices${qs}`);
    } catch {
      return [];
    }
  }

  static async getInvoice(invoiceId: string): Promise<Invoice> {
    return await this.request<Invoice>(`/finance/invoices/${invoiceId}`);
  }

  static async createInvoice(invoice: {
    invoice_number?: string;
    client_id: string;
    client_name?: string;
    project_id?: string;
    project_name?: string;
    issue_date: string;
    due_date: string;
    items: { description: string; quantity: number; unit_price: number; subtotal: number }[];
    tax_rate?: number;
    currency?: string;
    notes?: string;
    terms?: string;
  }): Promise<Invoice> {
    return await this.request<Invoice>('/finance/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  }

  static async updateInvoice(invoiceId: string, update: Partial<Invoice>): Promise<Invoice> {
    return await this.request<Invoice>(`/finance/invoices/${invoiceId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  static async recordInvoicePayment(invoiceId: string, payment: {
    amount: number;
    account_id: string;
    payment_method?: string;
    payment_reference?: string;
    date: string;
    notes?: string;
  }): Promise<Invoice> {
    return await this.request<Invoice>(`/finance/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  // Accounts Payable (Bills)
  static async getPayables(params?: {
    status?: string;
    category?: string;
    projectId?: string;
  }): Promise<AccountsPayable[]> {
    try {
      const sp = new URLSearchParams();
      if (params?.status) sp.append('status', params.status);
      if (params?.category) sp.append('category', params.category);
      if (params?.projectId) sp.append('project_id', params.projectId);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return await this.request<AccountsPayable[]>(`/finance/payables${qs}`);
    } catch {
      return [];
    }
  }

  static async getPayable(payableId: string): Promise<AccountsPayable> {
    return await this.request<AccountsPayable>(`/finance/payables/${payableId}`);
  }

  static async createPayable(payable: {
    reference?: string;
    supplier_name: string;
    description: string;
    category?: string;
    amount_due: number;
    currency?: string;
    due_date: string;
    project_id?: string;
    supporting_document_url?: string;
    notes?: string;
  }): Promise<AccountsPayable> {
    return await this.request<AccountsPayable>('/finance/payables', {
      method: 'POST',
      body: JSON.stringify(payable),
    });
  }

  static async updatePayable(payableId: string, update: Partial<AccountsPayable>): Promise<AccountsPayable> {
    return await this.request<AccountsPayable>(`/finance/payables/${payableId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  static async recordPayablePayment(payableId: string, payment: {
    amount: number;
    account_id: string;
    payment_method?: string;
    payment_reference?: string;
    date: string;
    notes?: string;
  }): Promise<AccountsPayable> {
    return await this.request<AccountsPayable>(`/finance/payables/${payableId}/payments`, {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  // Budgets
  static async getBudgets(params?: {
    status?: string;
    period?: string;
    projectId?: string;
  }): Promise<FinancialBudget[]> {
    try {
      const sp = new URLSearchParams();
      if (params?.status) sp.append('status', params.status);
      if (params?.period) sp.append('period', params.period);
      if (params?.projectId) sp.append('project_id', params.projectId);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return await this.request<FinancialBudget[]>(`/finance/budgets${qs}`);
    } catch {
      return [];
    }
  }

  static async getBudget(budgetId: string): Promise<FinancialBudget> {
    return await this.request<FinancialBudget>(`/finance/budgets/${budgetId}`);
  }

  static async createBudget(budget: {
    name: string;
    period?: string;
    start_date: string;
    end_date: string;
    category?: string;
    project_id?: string;
    department?: string;
    allocated_amount: number;
    currency?: string;
    notes?: string;
  }): Promise<FinancialBudget> {
    return await this.request<FinancialBudget>('/finance/budgets', {
      method: 'POST',
      body: JSON.stringify(budget),
    });
  }

  static async updateBudget(budgetId: string, update: Partial<FinancialBudget>): Promise<FinancialBudget> {
    return await this.request<FinancialBudget>(`/finance/budgets/${budgetId}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  // Expense Requests
  static async getExpenseRequests(params?: {
    status?: string;
    urgency?: string;
    requestedById?: string;
  }): Promise<ExpenseRequest[]> {
    try {
      const sp = new URLSearchParams();
      if (params?.status) sp.append('status', params.status);
      if (params?.urgency) sp.append('urgency', params.urgency);
      if (params?.requestedById) sp.append('requested_by_id', params.requestedById);
      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return await this.request<ExpenseRequest[]>(`/finance/requests${qs}`);
    } catch {
      return [];
    }
  }

  static async getExpenseRequest(requestId: string): Promise<ExpenseRequest> {
    return await this.request<ExpenseRequest>(`/finance/requests/${requestId}`);
  }

  static async createExpenseRequest(req: {
    title: string;
    description: string;
    category?: string;
    amount: number;
    currency?: string;
    project_id?: string;
    department?: string;
    urgency?: string;
    supporting_document_url?: string;
  }): Promise<ExpenseRequest> {
    return await this.request<ExpenseRequest>('/finance/requests', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  static async reviewExpenseRequest(requestId: string, review: { action: 'approve' | 'reject'; comments?: string }): Promise<ExpenseRequest> {
    return await this.request<ExpenseRequest>(`/finance/requests/${requestId}/review`, {
      method: 'POST',
      body: JSON.stringify(review),
    });
  }

  static async payExpenseRequest(requestId: string, payment: {
    account_id: string;
    payment_method?: string;
    payment_reference?: string;
    date: string;
    notes?: string;
  }): Promise<ExpenseRequest> {
    return await this.request<ExpenseRequest>(`/finance/requests/${requestId}/pay`, {
      method: 'POST',
      body: JSON.stringify(payment),
    });
  }

  // Project Financials
  static async getProjectFinancials(projectId: string): Promise<ProjectFinancialSummary> {
    return await this.request<ProjectFinancialSummary>(`/finance/projects/${projectId}`);
  }
}
