import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  Brain,
  CheckCircle2,
  ListTodo,
  FileCheck,
  Plus,
  FileText,
  Download,
  X,
  Shield,
  Layers,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { ChatMessage, ActionProposal } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useOrganization } from '../../context/OrganizationContext';
import { SolianApiClient, API_BASE, buildApiUrl } from '../../api/client';
import { UserAvatar } from '../../components/common/UserAvatar';

export const CompanyChatView: React.FC = () => {
  const { user } = useAuth();
  const { currentOrg, setActiveModule } = useOrganization();
  const isGuest = user.role === 'guest';

  const getWelcomeMessage = (): ChatMessage => {
    if (isGuest) {
      return {
        id: 'msg-welcome-guest',
        role: 'assistant',
        content: `Welcome to **AUREN SOLIAN**, the organizational operating system for **${currentOrg.name}**.\n\nI am currently operating in **Visitor Mode** with public access.\n\nTo consult internal operations, project matrices, institutional knowledge, or executive decision support, please sign in with your corporate account.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        contextSources: [],
        actionProposals: [],
      };
    }
    return {
      id: 'msg-welcome',
      role: 'assistant',
      content: `Good day, ${user.fullName}. I am **AUREN SOLIAN**, the organizational intelligence assistant for **${currentOrg.name}**.\n\nI operate across your corporate policies, operational playbooks, and active project matrices under strict **${user.role.toUpperCase()}** clearance.\n\nHow may I support executive decision-making, strategic synthesis, or operational delegation today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contextSources: [
        'Solian Wolves Institutional Memory',
        'Corporate SOP-401 & POL-202',
        'Active Strategic Initiatives Matrix',
      ],
      actionProposals: [
        {
          id: 'prop-init-1',
          title: 'Review Active Strategic Initiatives Progress',
          type: 'create_task',
          payload: {
            title: 'Q4 Operational Initiatives Audit',
            priority: 'high',
            due_date: 'Tomorrow',
          },
          status: 'pending',
        },
      ],
    };
  };

  const [messages, setMessages] = useState<ChatMessage[]>([getWelcomeMessage()]);

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const [selectedDocs, setSelectedDocs] = useState<Array<{ name: string; size: number; dataUrl: string; type: string }>>([]);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [executingProposalId, setExecutingProposalId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = isGuest
    ? [
        'What is Solian Wolves?',
        'What services does Solian Enterprise provide?',
        'How do I sign in with a corporate account?',
      ]
    : [
        'Summarize active strategic initiatives and project progress',
        'Review SOP-401 enterprise incident escalation protocol',
        'What operations currently require urgent attention?',
        'Explain corporate data classification under POL-202',
      ];

  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setSelectedDocs((prev) => [
            ...prev,
            {
              name: file.name,
              size: file.size,
              dataUrl: reader.result as string,
              type: file.type || 'application/octet-stream',
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
    setIsAttachMenuOpen(false);
  };

  const handleRemoveDoc = (index: number) => {
    setSelectedDocs((prev) => prev.filter((_, i) => i !== index));
  };

  // Keep-warm ping
  useEffect(() => {
    const pingBackend = () => {
      fetch(buildApiUrl('/health')).catch(() => {});
    };
    pingBackend();
    const interval = setInterval(pingBackend, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Track thinking timer
  useEffect(() => {
    let timer: any = null;
    if (isStreaming) {
      timer = setInterval(() => {
        setThinkingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setThinkingSeconds(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isStreaming]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleResetConversation = () => {
    setMessages([{ ...getWelcomeMessage(), id: `msg-welcome-${Date.now()}` }]);
  };

  const handleSendPrompt = (promptText: string) => {
    setInput(promptText);
    setTimeout(() => {
      const form = document.getElementById('company-chat-form') as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 50);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const hasAttachments = selectedDocs.length > 0;
    if ((!input.trim() && !hasAttachments) || isStreaming) return;

    const userText = input.trim();
    const docsToSend = [...selectedDocs];
    setInput('');
    setSelectedDocs([]);

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: userText || `📎 Attached ${docsToSend.length} document(s): ${docsToSend.map((d) => d.name).join(', ')}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: docsToSend.map((d) => ({ type: 'document', url: d.dataUrl, name: d.name, size: d.size })),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const assistantMsgId = `asst-${Date.now()}`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contextSources: ['Solian Wolves Knowledge Vault', 'Operational Task Backlog'],
    };

    setMessages((prev) => [...prev, initialAssistantMsg]);

    try {
      const authToken = SolianApiClient.getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      } else {
        headers['X-User-Id'] = user.userId || user.id;
      }

      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(buildApiUrl('/chat/stream'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userText,
          user_id: user.userId || user.id,
          user_role: user.role,
          history: historyPayload,
          workspace_context: 'Company Command Center',
        }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let extractedProposals: ActionProposal[] = [];
        let extractedSources: string[] = [];
        let sseBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          // Retain trailing incomplete line segment in buffer
          sseBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              const dataText = trimmedLine.slice(6).trim();
              if (dataText === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataText);
                if (parsed.content) {
                  accumulated += parsed.content;
                }
                if (parsed.action_proposals) {
                  extractedProposals = parsed.action_proposals;
                }
                if (parsed.context_sources) {
                  extractedSources = parsed.context_sources;
                }
              } catch {
                accumulated += dataText;
              }
            }
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? {
                    ...msg,
                    content: accumulated,
                    actionProposals: extractedProposals.length > 0 ? extractedProposals : msg.actionProposals,
                    contextSources: extractedSources.length > 0 ? extractedSources : msg.contextSources,
                  }
                : msg
            )
          );
        }

        // Process any remainder in sseBuffer after stream completion
        if (sseBuffer.trim().startsWith('data: ')) {
          const dataText = sseBuffer.trim().slice(6).trim();
          if (dataText && dataText !== '[DONE]') {
            try {
              const parsed = JSON.parse(dataText);
              if (parsed.content) accumulated += parsed.content;
            } catch {
              accumulated += dataText;
            }
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      content: accumulated,
                      actionProposals: extractedProposals.length > 0 ? extractedProposals : msg.actionProposals,
                      contextSources: extractedSources.length > 0 ? extractedSources : msg.contextSources,
                    }
                  : msg
              )
            );
          }
        }
      } else {
        const errorText = await response.text().catch(() => '');
        let errorDetail = `HTTP ${response.status} ${response.statusText}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.detail) errorDetail = parsed.detail;
        } catch {}
        const errorNotice = `### ⚠️ AI Intelligence Service Offline\n\nUnable to generate response from Solian Wolves AI backend (${errorDetail}).\n\nPlease check network or click below to retry.`;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: errorNotice, isError: true } : msg
          )
        );
      }
    } catch (err: any) {
      const errorNotice = `### ⚠️ Operational Stream Offline\n\nUnable to establish real-time SSE streaming stream with Solian Wolves backend: ${err?.message || 'Network disconnected'}.\n\nPlease check connection or click below to retry.`;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId ? { ...msg, content: errorNotice, isError: true } : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleExecuteAction = async (msgId: string, prop: ActionProposal) => {
    setExecutingProposalId(prop.id);
    try {
      const res = await SolianApiClient.executeChatAction(prop.id, prop.type, prop.payload);
      if (res.success || res.already_executed) {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== msgId) return msg;
            return {
              ...msg,
              actionProposals: msg.actionProposals?.map((p) =>
                p.id === prop.id ? { ...p, status: 'executed' as const } : p
              ),
            };
          })
        );
      } else {
        alert(`Action rejected by enterprise governance: ${res.message}`);
      }
    } catch (err: any) {
      alert(`Execution failed: ${err.message || 'Unknown error'}`);
    } finally {
      setExecutingProposalId(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-7.5rem)] md:h-[calc(100vh-4rem)] bg-solian-obsidian">
      {/* Chat Sub-bar */}
      <div className="px-4 md:px-6 py-2.5 border-b border-solian-border bg-solian-surface/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/30 flex items-center justify-center p-1">
            <img src="/favicon.svg" alt="Wolf" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              AUREN SOLIAN AI <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            </div>
            <div className="text-[10px] text-slate-500">
              Organizational Intelligence • Solian Wolves Knowledge Mesh
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetConversation}
            title="Reset current conversation thread"
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-[11px] text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden xs:inline">New Thread</span>
          </button>
          {isGuest ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Visitor Mode
              </span>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gold-500 text-slate-950 hover:bg-gold-400 transition cursor-pointer"
              >
                Sign In
              </button>
            </div>
          ) : (
            <>
              <span className="text-[11px] text-slate-500 hidden sm:inline">Clearance:</span>
              <span className="text-[10px] font-mono font-bold uppercase text-amber-800 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                {user.role} {user.department ? `(${user.department})` : ''}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl w-full mx-auto">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 md:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-9 h-9 rounded-xl bg-white border border-amber-500/30 p-1.5 shrink-0 flex items-center justify-center shadow-sm mt-1">
                  <img src="/favicon.svg" alt="Wolf" className="w-full h-full object-contain" />
                </div>
              )}

              <div className="max-w-[88%] md:max-w-[82%] space-y-2">
                <div
                  className={`p-4 md:p-5 rounded-2xl text-xs md:text-sm leading-relaxed shadow-sm ${
                    isUser
                      ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-slate-950 font-semibold rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="space-y-1.5 mb-2.5">
                      {msg.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                            isUser
                              ? 'bg-solian-darkest/20 border-solian-darkest/30 text-solian-darkest'
                              : 'bg-solian-surface border-solian-border text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 shrink-0 text-gold-500" />
                            <span className="font-semibold truncate">{att.name || 'Document'}</span>
                          </div>
                          {att.url && (
                            <a
                              href={att.url}
                              download={att.name || 'document'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded hover:bg-gold-500/20 transition shrink-0"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{msg.content || 'Synthesizing response...'}</div>
                </div>

                {/* Context Sources */}
                {!isUser && msg.contextSources && msg.contextSources.length > 0 && (
                  <div className="flex items-center gap-2 text-[10px] text-graphite-400 px-1 flex-wrap">
                    <Brain className="w-3 h-3 text-gold-500 shrink-0" />
                    <span>Memory: {msg.contextSources.join(' • ')}</span>
                  </div>
                )}

                {/* Real Action Proposals (Restricted to Authenticated Personnel) */}
                {!isUser && !isGuest && msg.actionProposals && msg.actionProposals.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {msg.actionProposals.map((prop) => (
                      <div
                        key={prop.id}
                        className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
                      >
                        <div className="flex items-start sm:items-center gap-2 min-w-0">
                          <ListTodo className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                          <span className="font-semibold text-slate-900 break-words leading-relaxed">{prop.title}</span>
                        </div>
                        {prop.status === 'executed' ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] uppercase shrink-0">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Action Executed ✓
                          </span>
                        ) : (
                          <button
                            onClick={() => handleExecuteAction(msg.id, prop)}
                            disabled={executingProposalId === prop.id}
                            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gold-500 text-slate-950 font-bold text-xs uppercase hover:bg-gold-400 transition cursor-pointer shrink-0 disabled:opacity-50 min-h-[38px] flex items-center justify-center shadow-xs"
                          >
                            {executingProposalId === prop.id ? 'Executing...' : 'Execute Action'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {msg.isError && (
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      onClick={() => {
                        const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
                        if (lastUserMsg) {
                          handleSendPrompt(lastUserMsg.content);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-gold-500/20 hover:bg-gold-500/30 border border-gold-500/40 text-gold-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-gold-400" />
                      <span>Retry Request</span>
                    </button>
                  </div>
                )}
              </div>

              {isUser && (
                <UserAvatar
                  name={user.fullName}
                  avatarUrl={user.avatarUrl}
                  role={user.role}
                  size="sm"
                  className="mt-1 shrink-0"
                />
              )}
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-xl bg-solian-card border border-gold-500/30 p-1.5 shrink-0 flex items-center justify-center animate-pulse shadow-glow-subtle">
              <img src="/favicon.svg" alt="Wolf" className="w-full h-full object-contain" />
            </div>
            <div className="p-4 rounded-2xl bg-solian-card border border-solian-border text-xs text-graphite-300 flex flex-col space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-gold-500 animate-spin" />
                <span className="font-semibold text-slate-100">
                  {thinkingSeconds < 3
                    ? (isGuest ? 'AUREN SOLIAN is analyzing public knowledge...' : 'AUREN SOLIAN is evaluating company memory...')
                    : thinkingSeconds < 6
                    ? (isGuest ? 'Structuring visitor response...' : 'Querying SOP-401, projects & task matrices...')
                    : 'Synthesizing response...'}
                </span>
                <span className="text-[10px] text-gold-400 font-mono">({thinkingSeconds}s)</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Strip */}
      <div className="max-w-4xl w-full mx-auto px-4 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendPrompt(qp)}
              disabled={isStreaming}
              className="px-2.5 py-1 rounded-lg bg-solian-card hover:bg-solian-surface border border-solian-border text-[11px] text-graphite-300 hover:text-gold-400 transition whitespace-nowrap cursor-pointer shrink-0"
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box Footer */}
      <div className="p-3 md:p-4 border-t border-solian-border bg-solian-surface/90 max-w-4xl w-full mx-auto mb-3 rounded-2xl border space-y-2">
        {selectedDocs.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {selectedDocs.map((doc, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 bg-solian-card border border-gold-500/40 rounded-xl text-xs text-slate-200 shrink-0"
              >
                <FileText className="w-4 h-4 text-gold-500 shrink-0" />
                <span className="font-semibold truncate max-w-[140px]">{doc.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc(idx)}
                  className="p-1 rounded-full text-graphite-400 hover:text-rose-400 hover:bg-solian-surface transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form id="company-chat-form" onSubmit={handleSend} className="flex items-center gap-2.5 relative">
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.json,application/pdf,text/*"
            multiple
            className="hidden"
            onChange={handleDocumentSelect}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleDocumentSelect}
          />

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setIsAttachMenuOpen((prev) => !prev)}
              disabled={isStreaming}
              className={`p-2 rounded-xl transition cursor-pointer flex items-center justify-center ${
                isAttachMenuOpen
                  ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40'
                  : 'text-graphite-400 hover:text-white hover:bg-solian-card'
              }`}
              title="Attach document or asset"
            >
              <Plus className={`w-4 h-4 transition-transform duration-200 ${isAttachMenuOpen ? 'rotate-45' : ''}`} />
            </button>

            {isAttachMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-52 bg-solian-card rounded-2xl shadow-2xl border border-solian-border p-1.5 z-50 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsAttachMenuOpen(false);
                    docInputRef.current?.click();
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:text-gold-400 hover:bg-solian-surface transition cursor-pointer"
                >
                  <span className="p-1.5 rounded-lg bg-gold-500/20 text-gold-400">
                    <FileText className="w-3.5 h-3.5" />
                  </span>
                  <span>Document / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAttachMenuOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-slate-200 hover:text-gold-400 hover:bg-solian-surface transition cursor-pointer"
                >
                  <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Sparkles className="w-3.5 h-3.5" />
                  </span>
                  <span>Photo / Image</span>
                </button>
              </div>
            )}
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              selectedDocs.length > 0
                ? 'Add instructions for attached file(s)...'
                : (isGuest
                    ? 'Ask AUREN SOLIAN a public question...'
                    : 'Consult AUREN SOLIAN on initiatives, SOPs, or delegate tasks...')
            }
            disabled={isStreaming}
            className="flex-1 bg-transparent text-xs md:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={(!input.trim() && selectedDocs.length === 0) || isStreaming}
            className="p-2.5 rounded-xl bg-gold-500 text-solian-darkest hover:bg-gold-400 disabled:opacity-40 transition shadow-glow-gold cursor-pointer shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Send message to company AI"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
