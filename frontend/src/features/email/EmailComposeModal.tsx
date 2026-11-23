import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Save,
  Trash2,
  Sparkles,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2,
  Wand2,
} from 'lucide-react';
import { EmailDraft, EmailSendRequest, EmailAttachmentMeta } from '../../types';
import { SolianApiClient } from '../../api/client';

interface EmailComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDraftSaved?: () => void;
  onEmailSent?: () => void;
  initialDraft?: EmailDraft | null;
  replyToMessage?: {
    id: string;
    from: string;
    subject: string;
    body: string;
  } | null;
}

export const EmailComposeModal: React.FC<EmailComposeModalProps> = ({
  isOpen,
  onClose,
  onDraftSaved,
  onEmailSent,
  initialDraft,
  replyToMessage,
}) => {
  const [to, setTo] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [cc, setCc] = useState('');
  const [showBcc, setShowBcc] = useState(false);
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);

  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAiToolbar, setShowAiToolbar] = useState(false);
  const [aiTone, setAiTone] = useState<'executive' | 'concise' | 'diplomatic' | 'assertive'>('executive');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (replyToMessage) {
      setTo(replyToMessage.from);
      setSubject(replyToMessage.subject.startsWith('Re:') ? replyToMessage.subject : `Re: ${replyToMessage.subject}`);
      setBody(`\n\n--- Original Message ---\nFrom: ${replyToMessage.from}\n${replyToMessage.body}`);
      setDraftId(null);
    } else if (initialDraft) {
      setTo(initialDraft.to_addresses.join(', '));
      if (initialDraft.cc_addresses && initialDraft.cc_addresses.length > 0) {
        setShowCc(true);
        setCc(initialDraft.cc_addresses.join(', '));
      }
      if (initialDraft.bcc_addresses && initialDraft.bcc_addresses.length > 0) {
        setShowBcc(true);
        setBcc(initialDraft.bcc_addresses.join(', '));
      }
      setSubject(initialDraft.subject);
      setBody(initialDraft.body);
      setDraftId(initialDraft.id);
    } else {
      setTo('');
      setCc('');
      setBcc('');
      setShowCc(false);
      setShowBcc(false);
      setSubject('');
      setBody('');
      setDraftId(null);
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [isOpen, initialDraft, replyToMessage]);

  if (!isOpen) return null;

  const parseAddresses = (str: string): string[] => {
    return str
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.includes('@'));
  };

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setErrorMsg(null);
    try {
      const payload = {
        to_addresses: parseAddresses(to),
        cc_addresses: parseAddresses(cc),
        bcc_addresses: parseAddresses(bcc),
        subject,
        body,
      };

      if (draftId) {
        await SolianApiClient.updateEmailDraft(draftId, payload);
      } else {
        const saved = await SolianApiClient.createEmailDraft(payload);
        setDraftId(saved.id);
      }

      setSuccessMsg('Draft saved successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
      onDraftSaved?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSend = async () => {
    const toAddrs = parseAddresses(to);
    if (toAddrs.length === 0) {
      setErrorMsg('Please specify at least one valid recipient email address.');
      return;
    }
    if (!subject.trim()) {
      setErrorMsg('Please enter an email subject.');
      return;
    }

    setIsSending(true);
    setErrorMsg(null);

    try {
      const req: EmailSendRequest = {
        to_addresses: toAddrs,
        cc_addresses: parseAddresses(cc),
        bcc_addresses: parseAddresses(bcc),
        subject,
        body,
        draft_id: draftId || undefined,
        reply_to_id: replyToMessage?.id || undefined,
      };

      const res = await SolianApiClient.sendEmail(req);
      if (res.success) {
        setSuccessMsg('Email dispatched successfully.');
        onEmailSent?.();
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Outbound email failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Transmission failed.');
    } finally {
      setIsSending(false);
    }
  };

  const handleAiDraft = async () => {
    if (!aiPrompt.trim()) {
      setErrorMsg('Please enter a description for the email you want AUREN AI to draft.');
      return;
    }
    setIsAiLoading(true);
    setErrorMsg(null);
    try {
      const res = await SolianApiClient.getAIEmailAssist({
        action: 'draft',
        prompt: aiPrompt,
        tone: aiTone,
        subject: subject || undefined,
      });
      if (res.subject_suggestion && !subject) {
        setSubject(res.subject_suggestion);
      }
      setBody(res.content);
      setSuccessMsg('Draft generated by AUREN AI. Review and edit before sending.');
      setShowAiToolbar(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI assistance failed.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiImprove = async () => {
    if (!body.trim()) {
      setErrorMsg('Please write some email text first to improve wording.');
      return;
    }
    setIsAiLoading(true);
    setErrorMsg(null);
    try {
      const res = await SolianApiClient.getAIEmailAssist({
        action: 'improve',
        email_text: body,
        tone: aiTone,
      });
      setBody(res.content);
      setSuccessMsg(`Email wording refined with ${aiTone} tone.`);
      setShowAiToolbar(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'AI tone improvement failed.');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-solian-obsidian/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-solian-card border border-solian-border rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-solian-border bg-solian-darkest/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gold-500/15 text-gold-400 flex items-center justify-center font-bold text-xs border border-gold-500/30">
              <Send className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {replyToMessage ? 'Reply to Message' : initialDraft ? 'Edit Draft' : 'New Company Communication'}
              </h3>
              <p className="text-[10px] text-graphite-400">
                Official Solian Wolves Outbound Communications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowAiToolbar(!showAiToolbar)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showAiToolbar
                  ? 'bg-gold-500 text-solian-darkest border-gold-400 shadow-glow-subtle'
                  : 'bg-solian-surface text-gold-400 border-gold-500/30 hover:bg-gold-500/15'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AUREN AI</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-graphite-400 hover:text-white hover:bg-solian-surface transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* AI Assistance Toolbar Drawer */}
        {showAiToolbar && (
          <div className="bg-solian-surface/90 border-b border-gold-500/30 p-4 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gold-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Wand2 className="w-3.5 h-3.5" /> AUREN AI Email Intelligence
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-graphite-400">Tone:</span>
                <select
                  value={aiTone}
                  onChange={(e: any) => setAiTone(e.target.value)}
                  className="bg-solian-darkest border border-solian-border rounded px-2 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="executive">Executive</option>
                  <option value="concise">Concise</option>
                  <option value="diplomatic">Diplomatic</option>
                  <option value="assertive">Assertive</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="What should this email convey? (e.g. Schedule Q4 delivery milestone review)"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiDraft()}
                className="flex-1 bg-solian-darkest border border-solian-border rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/50"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAiDraft}
                  disabled={isAiLoading || !aiPrompt.trim()}
                  className="px-3 py-2 rounded-lg bg-gold-500 text-solian-darkest text-xs font-bold hover:bg-gold-400 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Generate Draft
                </button>
                {body.trim().length > 10 && (
                  <button
                    type="button"
                    onClick={handleAiImprove}
                    disabled={isAiLoading}
                    className="px-3 py-2 rounded-lg bg-solian-card border border-solian-border text-xs text-slate-200 hover:text-white hover:border-gold-500/40 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    Refine Text
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] text-graphite-400">
              Generated text will load into the composer for your review. AUREN never sends emails automatically.
            </p>
          </div>
        )}

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mx-5 mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-5 mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Composer Fields */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 scrollbar-thin">
          {/* TO Field */}
          <div className="flex items-center border-b border-solian-border/80 pb-2 gap-2 text-xs">
            <span className="w-12 text-graphite-400 font-medium">To:</span>
            <input
              type="text"
              placeholder="recipients@example.com (comma separated)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-graphite-500 focus:outline-none"
            />
            <div className="flex items-center gap-1.5 text-[11px] text-graphite-400">
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="hover:text-gold-400 transition cursor-pointer"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  className="hover:text-gold-400 transition cursor-pointer"
                >
                  Bcc
                </button>
              )}
            </div>
          </div>

          {/* CC Field */}
          {showCc && (
            <div className="flex items-center border-b border-solian-border/80 pb-2 gap-2 text-xs animate-fade-in">
              <span className="w-12 text-graphite-400 font-medium">Cc:</span>
              <input
                type="text"
                placeholder="cc@example.com"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-graphite-500 focus:outline-none"
              />
            </div>
          )}

          {/* BCC Field */}
          {showBcc && (
            <div className="flex items-center border-b border-solian-border/80 pb-2 gap-2 text-xs animate-fade-in">
              <span className="w-12 text-graphite-400 font-medium">Bcc:</span>
              <input
                type="text"
                placeholder="bcc@example.com"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder-graphite-500 focus:outline-none"
              />
            </div>
          )}

          {/* Subject Field */}
          <div className="flex items-center border-b border-solian-border/80 pb-2 gap-2 text-xs">
            <span className="w-12 text-graphite-400 font-medium">Subject:</span>
            <input
              type="text"
              placeholder="Official subject header"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-graphite-500 font-semibold focus:outline-none"
            />
          </div>

          {/* Body Textarea */}
          <textarea
            placeholder="Compose your message here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="w-full bg-solian-surface/40 border border-solian-border/50 rounded-xl p-3.5 text-xs text-slate-100 placeholder-graphite-500 focus:outline-none focus:border-gold-500/50 resize-y leading-relaxed font-sans"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-solian-border bg-solian-darkest/60">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft}
              className="px-3 py-1.5 rounded-lg bg-solian-surface border border-solian-border text-xs text-slate-300 hover:text-white hover:bg-solian-border transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSavingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Draft
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-graphite-400 hover:text-white transition cursor-pointer"
            >
              Discard
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="px-4 py-1.5 rounded-lg bg-gold-500 text-solian-darkest text-xs font-bold hover:bg-gold-400 transition flex items-center gap-1.5 shadow-glow-subtle cursor-pointer disabled:opacity-50"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Message
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

