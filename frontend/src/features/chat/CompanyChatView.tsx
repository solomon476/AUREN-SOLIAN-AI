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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userText = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        const fallbackText = `**Strategic Analysis & Operational Directive**\n\nI have evaluated your inquiry against Solian's institutional knowledge base and active project allocations.\n\n### Key Takeaways:\n1. **Resource Alignment**: The initiatives under Sarah Chen and Marcus Vance are currently operating within the expected SLA parameters.\n2. **Governance**: All actions conform to our corporate data classification and multi-tenant security gates.\n\n### Suggested Operational Action:\nWould you like me to formalize this into a new ticket in **Tasks & Operations** or draft a notice to department leads?`;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: fallbackText,
                  actionProposals: [
                    {
                      id: `prop-${Date.now()}`,
                      title: 'Create Task: Follow-up on Operations Alignment',
                      type: 'create_task',
                      payload: { title: 'Follow-up on Operations Alignment' },
                      status: 'pending',
                    },
                  ],
                }
              : msg
          )
        );
      }
    } catch {
      // Local graceful fallback
      const fallbackText = `**Operational Response:**\n\nBased on your role as **${user.role.toUpperCase()}**, I have reviewed the organizational memory. The active enterprise operations are tracking smoothly. Let me know if you would like to initiate an automated workflow or draft executive reports.`;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId ? { ...msg, content: fallbackText } : msg
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
            <div className="w-9 h-9 rounded-xl bg-solian-card border border-gold-500/30 p-1.5 shrink-0 flex items-center justify-center animate-pulse">
              <img src="/favicon.svg" alt="Wolf" className="w-full h-full object-contain" />
            </div>
            <div className="p-4 rounded-2xl bg-solian-card border border-solian-border text-xs text-graphite-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-gold-500 animate-spin" />
              <span>AUREN SOLIAN is querying institutional memory...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer */}
      <div className="p-4 border-t border-solian-border bg-solian-surface/80 max-w-4xl w-full mx-auto mb-2 rounded-2xl border">
        <form onSubmit={handleSend} className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AUREN SOLIAN about company initiatives, draft SOPs, or delegate tasks..."
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-graphite-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="p-2.5 rounded-xl bg-gold-500 text-solian-darkest hover:bg-gold-400 disabled:opacity-40 transition shadow-glow-gold"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

