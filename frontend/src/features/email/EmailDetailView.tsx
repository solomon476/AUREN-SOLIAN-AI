import React, { useState } from 'react';
import {
  ArrowLeft,
  Reply,
  Forward,
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  ListTodo,
  FileText,
  Loader2,
  CheckSquare,
} from 'lucide-react';
import { EmailMessage } from '../../types';
import { UserAvatar } from '../../components/common/UserAvatar';
import { SolianApiClient } from '../../api/client';

interface EmailDetailViewProps {
  message: EmailMessage;
  onBack: () => void;
  onReply: (message: EmailMessage) => void;
  onForward: (message: EmailMessage) => void;
}

export const EmailDetailView: React.FC<EmailDetailViewProps> = ({
  message,
  onBack,
  onReply,
  onForward,
}) => {
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [taskCreatedMsg, setTaskCreatedMsg] = useState<string | null>(null);

  const handleSummarize = async () => {
    setIsAiLoading(true);
    try {
      const res = await SolianApiClient.getAIEmailAssist({
        action: 'summarize',
        email_text: message.body_text,
      });
      setAiSummary(res.content);
    } catch (err: any) {
      alert(`AI summarization failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleExtractActions = async () => {
    setIsAiLoading(true);
    try {
      const res = await SolianApiClient.getAIEmailAssist({
        action: 'extract_action_items',
        email_text: message.body_text,
      });
      setActionItems(res.action_items || []);
    } catch (err: any) {
      alert(`Action item extraction failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleCreateTaskFromAction = async (actionText: string) => {
    try {
      await SolianApiClient.createTask({
        title: actionText,
        description: `Action item derived from email '${message.subject}' (From: ${message.from_address}).`,
        priority: 'medium',
        department: 'Operations',
        assignee: 'Current User',
        due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      });
      setTaskCreatedMsg(`Task created: "${actionText.substring(0, 35)}..."`);
      setTimeout(() => setTaskCreatedMsg(null), 3500);
    } catch (err: any) {
      alert(`Failed to create task: ${err.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="bg-solian-card border border-solian-border rounded-2xl flex flex-col h-full overflow-hidden shadow-sm">
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-solian-border bg-solian-darkest/60">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-graphite-300 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Messages</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSummarize}
            disabled={isAiLoading}
            className="px-2.5 py-1 rounded-lg bg-solian-surface border border-gold-500/30 text-gold-400 hover:bg-gold-500/15 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Summarize with AI
          </button>

          <button
            type="button"
            onClick={handleExtractActions}
            disabled={isAiLoading}
            className="px-2.5 py-1 rounded-lg bg-solian-surface border border-solian-border text-slate-300 hover:text-white hover:bg-solian-border text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ListTodo className="w-3.5 h-3.5" />
            Extract Actions
          </button>

          <button
            type="button"
            onClick={() => onReply(message)}
            className="px-3 py-1 rounded-lg bg-gold-500 text-solian-darkest text-xs font-bold hover:bg-gold-400 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Reply className="w-3.5 h-3.5" />
            Reply
          </button>
        </div>
      </div>

      {/* Task Creation Notification */}
      {taskCreatedMsg && (
        <div className="mx-5 mt-3 p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{taskCreatedMsg}</span>
        </div>
      )}

      {/* AI Summary Banner */}
      {aiSummary && (
        <div className="mx-5 mt-4 p-4 rounded-xl bg-solian-surface/80 border border-gold-500/30 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gold-400 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> AUREN AI Executive Summary
            </span>
            <button
              type="button"
              onClick={() => setAiSummary(null)}
              className="text-[10px] text-graphite-400 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
            {aiSummary}
          </div>
        </div>
      )}

      {/* Action Items Panel */}
      {actionItems.length > 0 && (
        <div className="mx-5 mt-3 p-4 rounded-xl bg-solian-surface/80 border border-blue-500/30 space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
              <ListTodo className="w-3.5 h-3.5" /> Extracted Action Deliverables
            </span>
            <button
              type="button"
              onClick={() => setActionItems([])}
              className="text-[10px] text-graphite-400 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-1.5">
            {actionItems.map((act, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-solian-darkest/60 border border-solian-border/50 text-xs text-slate-200"
              >
                <span>• {act}</span>
                <button
                  type="button"
                  onClick={() => handleCreateTaskFromAction(act)}
                  className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-semibold hover:bg-blue-500/30 transition cursor-pointer flex items-center gap-1"
                >
                  <CheckSquare className="w-3 h-3" /> Convert to Task
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Metadata Header */}
      <div className="p-5 border-b border-solian-border space-y-3">
        <h2 className="text-lg font-bold text-white tracking-tight">{message.subject}</h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserAvatar name={message.from_address} size="md" />
            <div>
              <div className="text-xs font-semibold text-slate-100 flex items-center gap-2">
                <span>{message.from_address}</span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-solian-surface text-graphite-400 border border-solian-border">
                  {message.folder}
                </span>
              </div>
              <div className="text-[11px] text-graphite-400">
                To: {message.to_addresses.join(', ')}
                {message.cc_addresses && message.cc_addresses.length > 0 && (
                  <span className="ml-2 text-graphite-500">
                    | Cc: {message.cc_addresses.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-graphite-400 font-mono shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(message.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Message Body Content */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
        <div className="text-xs md:text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-sans max-w-4xl">
          {message.body_text}
        </div>
      </div>
    </div>
  );
};

