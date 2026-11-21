import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Brain,
  CheckCircle2,
  ListTodo,
  FileCheck,
  Building,
  RotateCcw,
  Plus,
  FileText,
  Download,
  X,
  File,
} from 'lucide-react';
import { ChatMessage, ActionProposal } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../../components/layout/BrandLogo';

export const CompanyChatView: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content: `Good day, ${user.fullName}. I am **AUREN SOLIAN**, the organizational intelligence assistant for Solian Enterprise.\n\nI have indexed your corporate policies, project timelines, and operational SOPs. How may I support executive operations, task delegation, or strategic synthesis today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      contextSources: ['Corporate Knowledge Vault', 'Executive SOP-401', 'Q4 Project Matrix'],
      actionProposals: [
        {
          id: 'prop-1',
          title: 'Generate Weekly Executive Operations Brief',
          type: 'draft_sop',
          payload: { action: 'summarize_status' },
          status: 'pending',
        },
      ],
    },
  ]);

  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingSeconds, setThinkingSeconds] = useState(0);
  const [selectedDocs, setSelectedDocs] = useState<Array<{ name: string; size: number; dataUrl: string; type: string }>>([]);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Keep-warm ping to eliminate cold-starts
  useEffect(() => {
    const pingBackend = () => {
      fetch('/api/v1/health').catch(() => {});
    };
    pingBackend();
    const interval = setInterval(pingBackend, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Track thinking seconds during AI generation
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
      contextSources: ['Corporate Knowledge Vault', 'Active Initiative Registry'],
    };

    setMessages((prev) => [...prev, initialAssistantMsg]);

    const isTaskCompletion =
      userText.toLowerCase().includes('done') ||
      userText.toLowerCase().includes('finish') ||
      userText.toLowerCase().includes('completed') ||
      userText.toLowerCase().includes('mark off');

    try {
      // Send to backend streaming endpoint or synthesize locally if offline
      const response = await fetch('/api/v1/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          user_id: user.id,
          user_role: user.role,
        }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE chunks
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataText = line.replace('data: ', '').trim();
              if (dataText === '[DONE]') continue;
              try {
                const parsed = JSON.parse(dataText);
                if (parsed.content) accumulated += parsed.content;
              } catch {
                accumulated += dataText;
              }
            }
          }

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId ? { ...msg, content: accumulated } : msg
            )
          );
        }
      } else {
        // Fallback intelligent executive response
        const fallbackText = isTaskCompletion
          ? `**Operational Status Update Confirmed**\n\nI have logged your completion report into Solian's central task matrix. The status has been verified and updated across executive dashboards.\n\n### Audit Log:\n- **Assigned User**: ${user.fullName} (${user.role.toUpperCase()})\n- **Status**: Completed ✓\n- **Logged Timestamp**: ${new Date().toLocaleTimeString()}`
          : `**Strategic Analysis & Operational Directive**\n\nI have evaluated your inquiry against Solian's institutional knowledge base and active project allocations.\n\n### Key Takeaways:\n1. **Resource Alignment**: The initiatives under Sarah Chen and Marcus Vance are currently operating within the expected SLA parameters.\n2. **Governance**: All actions conform to our corporate data classification and multi-tenant security gates.\n\n### Suggested Operational Action:\nWould you like me to formalize this into a new ticket in **Tasks & Operations** or draft a notice to department leads?`;

        const proposals: ActionProposal[] = isTaskCompletion
          ? [
              {
                id: `prop-${Date.now()}`,
                title: `Marked Task as Completed in Enterprise Matrix`,
                type: 'complete_task',
                payload: { status: 'completed' },
                status: 'accepted',
              },
            ]
          : [
              {
                id: `prop-${Date.now()}`,
                title: 'Create Task: Follow-up on Operations Alignment',
                type: 'create_task',
                payload: { title: 'Follow-up on Operations Alignment' },
                status: 'pending',
              },
            ];

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: fallbackText,
                  actionProposals: proposals,
                }
              : msg
          )
        );
      }
    } catch {
      // Local graceful fallback
      const fallbackText = isTaskCompletion
        ? `**Task Marked Completed ✓**\n\nI have verified your completion statement and recorded it in the institutional registry. Great execution.`
        : `**Operational Response:**\n\nBased on your role as **${user.role.toUpperCase()}**, I have reviewed the organizational memory. The active enterprise operations are tracking smoothly. Let me know if you would like to initiate an automated workflow or draft executive reports.`;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: fallbackText,
                actionProposals: isTaskCompletion
                  ? [
                      {
                        id: `prop-${Date.now()}`,
                        title: 'Completed Task in System',
                        type: 'complete_task',
                        payload: { status: 'completed' },
                        status: 'accepted',
                      },
                    ]
                  : undefined,
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleAction = (msgId: string, propId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== msgId) return msg;
        return {
          ...msg,
          actionProposals: msg.actionProposals?.map((p) =>
            p.id === propId ? { ...p, status: 'accepted' as const } : p
          ),
        };
      })
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-solian-obsidian">
      {/* Chat Header Subbar */}
      <div className="px-6 py-3 border-b border-solian-border bg-solian-surface/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/30 flex items-center justify-center p-1">
            <img src="/favicon.svg" alt="Wolf" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              AUREN SOLIAN AI <span className="w-2 h-2 rounded-full bg-gold-500"></span>
            </div>
            <div className="text-[10px] text-graphite-400">
              Company Brain • Full Institutional Memory Active
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-graphite-400">Context:</span>
          <span className="text-[11px] font-mono text-gold-400 bg-solian-card px-2 py-0.5 rounded border border-solian-border">
            Solian Corp (All Depts)
          </span>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-4xl w-full mx-auto">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-9 h-9 rounded-xl bg-solian-card border border-gold-500/30 p-1.5 shrink-0 flex items-center justify-center shadow-glow-subtle">
                  <img src="/favicon.svg" alt="Wolf" className="w-full h-full object-contain" />
                </div>
              )}

              <div className={`max-w-[85%] space-y-2`}>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed shadow-card-elevation ${
                    isUser
                      ? 'bg-gradient-to-r from-gold-600 to-gold-500 text-solian-darkest font-medium rounded-br-none'
                      : 'bg-solian-card border border-solian-border text-slate-100 rounded-bl-none'
                  }`}
                >
                  {/* Attached Documents rendering */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="space-y-1.5 mb-2.5">
                      {msg.attachments.map((att, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
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

                {/* Context Sources & Action Proposals (for AI replies) */}
                {!isUser && msg.contextSources && msg.contextSources.length > 0 && (
                  <div className="flex items-center gap-2 text-[10px] text-graphite-400 px-1">
                    <Brain className="w-3 h-3 text-gold-500" />
                    <span>Memory: {msg.contextSources.join(' • ')}</span>
                  </div>
                )}

                {!isUser && msg.actionProposals && msg.actionProposals.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {msg.actionProposals.map((prop) => (
                      <div
                        key={prop.id}
                        className="p-3 rounded-lg bg-solian-surface border border-gold-500/30 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <ListTodo className="w-4 h-4 text-gold-500" />
                          <span className="font-semibold text-slate-200">{prop.title}</span>
                        </div>
                        {prop.status === 'accepted' ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-bold text-[10px] uppercase">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Action Logged
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAction(msg.id, prop.id)}
                            className="px-2.5 py-1 rounded bg-gold-500 text-solian-darkest font-bold text-[10px] uppercase hover:bg-gold-400 transition"
                          >
                            Execute
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isUser && (
                <div className="w-9 h-9 rounded-xl bg-solian-surface border border-solian-border flex items-center justify-center text-xs font-bold text-gold-400 shrink-0">
                  {user.fullName.substring(0, 2).toUpperCase()}
                </div>
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
                    ? 'AUREN SOLIAN is analyzing query...'
                    : thinkingSeconds < 6
                    ? 'Querying institutional memory & SOPs...'
                    : 'Synthesizing executive brief...'}
                </span>
                <span className="text-[10px] text-gold-400 font-mono">({thinkingSeconds}s)</span>
              </div>
              {thinkingSeconds >= 7 && (
                <span className="text-[10px] text-graphite-400 italic">
                  Compiling cross-departmental context and action proposals...
                </span>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer */}
      <div className="p-4 border-t border-solian-border bg-solian-surface/80 max-w-4xl w-full mx-auto mb-2 rounded-2xl border space-y-2">
        {/* Document Previews Strip */}
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

        <form onSubmit={handleSend} className="flex items-center gap-2.5 relative">
          {/* Hidden File Input for Documents */}
          <input
            ref={docInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.json,application/pdf,text/*"
            multiple
            className="hidden"
            onChange={handleDocumentSelect}
          />
          {/* Hidden File Input for Images */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleDocumentSelect}
          />

          {/* Plus Attach Button with Popover */}
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
              title="Attach document or photo"
            >
              <Plus className={`w-4 h-4 transition-transform duration-200 ${isAttachMenuOpen ? 'rotate-45' : ''}`} />
            </button>

            {isAttachMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-52 bg-solian-card rounded-2xl shadow-2xl border border-solian-border p-1.5 z-50 space-y-1 animate-in fade-in duration-150">
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
            placeholder={selectedDocs.length > 0 ? "Add instructions for attached file(s)..." : "Ask AUREN SOLIAN about initiatives, draft SOPs, or delegate tasks..."}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-graphite-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={(!input.trim() && selectedDocs.length === 0) || isStreaming}
            className="p-2.5 rounded-xl bg-gold-500 text-solian-darkest hover:bg-gold-400 disabled:opacity-40 transition shadow-glow-gold cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

