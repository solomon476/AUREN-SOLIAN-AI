import React, { useState, useEffect } from 'react';
import {
  Mail,
  Inbox,
  Send,
  FileEdit,
  Search,
  RefreshCw,
  Plus,
  Server,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { EmailMessage, EmailDraft, EmailProviderStatus } from '../../types';
import { SolianApiClient } from '../../api/client';
import { UserAvatar } from '../../components/common/UserAvatar';
import { EmailComposeModal } from './EmailComposeModal';
import { EmailDetailView } from './EmailDetailView';
import { EmailProviderStatusModal } from './EmailProviderStatusModal';

export const EmailView: React.FC = () => {
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'drafts'>('inbox');
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [providerStatus, setProviderStatus] = useState<EmailProviderStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modals & Active Message State
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [selectedDraftForEdit, setSelectedDraftForEdit] = useState<EmailDraft | null>(null);
  const [replyMessage, setReplyMessage] = useState<EmailMessage | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const statusRes = await SolianApiClient.getEmailStatus().catch(() => null);
      if (statusRes) setProviderStatus(statusRes);

      if (activeFolder === 'drafts') {
        const draftsRes = await SolianApiClient.getEmailDrafts();
        setDrafts(draftsRes || []);
      } else {
        const msgRes = await SolianApiClient.getEmailMessages(activeFolder, searchQuery || undefined);
        setMessages(msgRes?.messages || []);
      }
    } catch (err) {
      console.error('Failed to load email data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeFolder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleDeleteDraft = async (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    if (!window.confirm('Delete this draft?')) return;
    try {
      await SolianApiClient.deleteEmailDraft(draftId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    } catch (err: any) {
      alert(`Failed to delete draft: ${err.message || 'Unknown error'}`);
    }
  };

  const handleOpenDraft = (draft: EmailDraft) => {
    setSelectedDraftForEdit(draft);
    setReplyMessage(null);
    setIsComposeOpen(true);
  };

  const handleStartCompose = () => {
    setSelectedDraftForEdit(null);
    setReplyMessage(null);
    setIsComposeOpen(true);
  };

  const handleReplyFromDetail = (msg: EmailMessage) => {
    setReplyMessage(msg);
    setSelectedDraftForEdit(null);
    setIsComposeOpen(true);
  };

  const handleForwardFromDetail = (msg: EmailMessage) => {
    setSelectedDraftForEdit({
      id: '',
      user_id: '',
      organization_id: '',
      to_addresses: [],
      subject: `Fwd: ${msg.subject}`,
      body: `\n\n--- Forwarded Message ---\nFrom: ${msg.from_address}\nSubject: ${msg.subject}\n\n${msg.body_text}`,
      created_at: '',
      updated_at: '',
    });
    setReplyMessage(null);
    setIsComposeOpen(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-64px)] md:h-[calc(100vh-80px)] flex flex-col space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Mail className="w-5 h-5 text-gold-500" />
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Email & Communications
            </h1>
          </div>
          <p className="text-xs text-graphite-300">
            Outbound corporate communications, AI email composition, and message thread intelligence.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Provider Status Pill */}
          <button
            type="button"
            onClick={() => setIsStatusModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              providerStatus?.is_connected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>
              {providerStatus?.is_connected ? 'Connected: SMTP' : 'No Provider (Draft Mode)'}
            </span>
          </button>

          {/* Primary Compose Button */}
          <button
            type="button"
            onClick={handleStartCompose}
            className="px-4 py-2 rounded-xl bg-gold-500 text-solian-darkest font-bold text-xs uppercase flex items-center gap-1.5 hover:bg-gold-400 transition shadow-glow-gold cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Compose</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
        {/* Navigation Sidebar / Folders */}
        <div className="w-full md:w-56 shrink-0 flex md:flex-col gap-1.5 bg-solian-card border border-solian-border rounded-2xl p-2.5">
          <button
            type="button"
            onClick={() => {
              setActiveFolder('inbox');
              setSelectedMessage(null);
            }}
            className={`flex-1 md:flex-none flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeFolder === 'inbox'
                ? 'bg-solian-surface text-gold-400 border border-gold-500/40 shadow-glow-subtle'
                : 'text-slate-300 hover:bg-solian-surface/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              <span>Inbox</span>
            </div>
            {messages.length > 0 && activeFolder === 'inbox' && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-gold-500/15 text-gold-400">
                {messages.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFolder('sent');
              setSelectedMessage(null);
            }}
            className={`flex-1 md:flex-none flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeFolder === 'sent'
                ? 'bg-solian-surface text-gold-400 border border-gold-500/40 shadow-glow-subtle'
                : 'text-slate-300 hover:bg-solian-surface/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span>Sent</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveFolder('drafts');
              setSelectedMessage(null);
            }}
            className={`flex-1 md:flex-none flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeFolder === 'drafts'
                ? 'bg-solian-surface text-gold-400 border border-gold-500/40 shadow-glow-subtle'
                : 'text-slate-300 hover:bg-solian-surface/60 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileEdit className="w-4 h-4" />
              <span>Drafts</span>
            </div>
            {drafts.length > 0 && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-solian-surface text-slate-300 border border-solian-border">
                {drafts.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Pane */}
        <div className="flex-1 flex flex-col min-w-0 bg-solian-card border border-solian-border rounded-2xl overflow-hidden shadow-sm">
          {selectedMessage ? (
            <EmailDetailView
              message={selectedMessage}
              onBack={() => setSelectedMessage(null)}
              onReply={handleReplyFromDetail}
              onForward={handleForwardFromDetail}
            />
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Search & Refresh Toolbar */}
              <div className="p-3 border-b border-solian-border bg-solian-darkest/40 flex items-center justify-between gap-3 shrink-0">
                <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                  <Search className="w-3.5 h-3.5 text-graphite-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`Search ${activeFolder}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-solian-surface border border-solian-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-graphite-400 focus:outline-none focus:border-gold-500/50"
                  />
                </form>

                <button
                  type="button"
                  onClick={loadData}
                  disabled={isLoading}
                  className="p-2 rounded-xl bg-solian-surface border border-solian-border text-graphite-300 hover:text-white transition cursor-pointer"
                  title="Refresh folder"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto divide-y divide-solian-border/50 scrollbar-thin">
                {activeFolder === 'drafts' ? (
                  drafts.length === 0 ? (
                    <div className="p-10 text-center space-y-2">
                      <FileEdit className="w-8 h-8 text-graphite-500 mx-auto opacity-60" />
                      <div className="text-sm font-semibold text-slate-300">No Drafts Saved</div>
                      <p className="text-xs text-graphite-400 max-w-sm mx-auto">
                        Drafts you create or compose with AUREN AI are saved securely and appear here.
                      </p>
                    </div>
                  ) : (
                    drafts.map((draft) => (
                      <div
                        key={draft.id}
                        onClick={() => handleOpenDraft(draft)}
                        className="p-3.5 hover:bg-solian-surface/50 transition cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-solian-surface border border-solian-border flex items-center justify-center text-graphite-300 shrink-0">
                            <FileEdit className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-200 truncate">
                                {draft.subject || '(Untitled Draft)'}
                              </span>
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-gold-500/10 text-gold-400 border border-gold-500/20 shrink-0">
                                Draft
                              </span>
                            </div>
                            <div className="text-[11px] text-graphite-400 truncate">
                              To: {draft.to_addresses.join(', ') || 'No recipients'}
                            </div>
                            <div className="text-xs text-graphite-300 truncate">
                              {draft.body.substring(0, 100) || 'Empty message body'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-graphite-500 font-mono">
                            {new Date(draft.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteDraft(e, draft.id)}
                            className="p-1 rounded text-graphite-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer opacity-0 group-hover:opacity-100"
                            title="Delete draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )
                ) : messages.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <Mail className="w-8 h-8 text-graphite-500 mx-auto opacity-60" />
                    <div className="text-sm font-semibold text-slate-300">
                      {activeFolder === 'inbox' ? 'Inbox is Clean' : 'No Sent Messages'}
                    </div>
                    <p className="text-xs text-graphite-400 max-w-sm mx-auto">
                      {activeFolder === 'inbox'
                        ? 'External email provider is disconnected. You can draft and compose messages safely with AUREN AI.'
                        : 'No outbound messages have been sent yet.'}
                    </p>
                    {activeFolder === 'inbox' && (
                      <button
                        type="button"
                        onClick={() => setIsStatusModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-lg bg-solian-surface border border-gold-500/40 text-gold-400 text-xs font-semibold hover:bg-gold-500/15 transition cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Server className="w-3.5 h-3.5" /> Configure Provider
                      </button>
                    )}
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => setSelectedMessage(msg)}
                      className="p-3.5 hover:bg-solian-surface/50 transition cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar name={msg.from_address} size="sm" />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200 truncate">
                              {msg.from_address}
                            </span>
                            <span className="text-xs text-white font-medium truncate">
                              • {msg.subject}
                            </span>
                          </div>
                          <div className="text-xs text-graphite-400 truncate">
                            {msg.body_text.substring(0, 120)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-graphite-500 font-mono">
                          {new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-graphite-500 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <EmailComposeModal
        isOpen={isComposeOpen}
        onClose={() => {
          setIsComposeOpen(false);
          setSelectedDraftForEdit(null);
          setReplyMessage(null);
        }}
        onDraftSaved={loadData}
        onEmailSent={() => {
          setActiveFolder('sent');
          loadData();
        }}
        initialDraft={selectedDraftForEdit}
        replyToMessage={replyMessage ? {
          id: replyMessage.id,
          from: replyMessage.from_address,
          subject: replyMessage.subject,
          body: replyMessage.body_text,
        } : null}
      />

      {/* Provider Status Modal */}
      <EmailProviderStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        status={providerStatus}
      />
    </div>
  );
};

