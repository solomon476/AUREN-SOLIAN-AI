import React from 'react';
import { X, Server, Shield, CheckCircle2, AlertTriangle, Key, ExternalLink } from 'lucide-react';
import { EmailProviderStatus } from '../../types';

interface EmailProviderStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: EmailProviderStatus | null;
}

export const EmailProviderStatusModal: React.FC<EmailProviderStatusModalProps> = ({
  isOpen,
  onClose,
  status,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-solian-obsidian/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-solian-card border border-solian-border rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-solian-border bg-solian-darkest/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold-500/15 text-gold-400 flex items-center justify-center font-bold text-sm border border-gold-500/30">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Email Provider Integration Status</h3>
              <p className="text-[11px] text-graphite-400">Enterprise Communications Architecture</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-graphite-400 hover:text-white hover:bg-solian-surface transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Active Status Badge */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              status?.is_connected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            {status?.is_connected ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <div className="font-bold uppercase tracking-wider text-[11px]">
                {status?.is_connected ? 'Active Provider Connected' : 'No Provider Configured (Safe Draft Mode)'}
              </div>
              <p className="leading-relaxed opacity-90">{status?.status_message}</p>
            </div>
          </div>

          {/* Provider Readiness Details */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-gold-500" /> Supported Integration Options
            </h4>

            <div className="p-3 rounded-xl bg-solian-surface/80 border border-solian-border space-y-1.5">
              <div className="font-semibold text-white flex items-center justify-between">
                <span>1. Google Workspace (Gmail API)</span>
                <span className="text-[10px] text-graphite-400 font-mono">OAuth 2.0</span>
              </div>
              <p className="text-[11px] text-graphite-400">
                Requires registering a Google Cloud OAuth Client ID and Secret with the <code>https://mail.google.com/</code> scope.
              </p>
              <div className="text-[10px] text-gold-400 font-mono pt-1">
                Config: GOOGLE_WORKSPACE_CLIENT_ID, GOOGLE_WORKSPACE_CLIENT_SECRET
              </div>
            </div>

            <div className="p-3 rounded-xl bg-solian-surface/80 border border-solian-border space-y-1.5">
              <div className="font-semibold text-white flex items-center justify-between">
                <span>2. Microsoft 365 (Graph API)</span>
                <span className="text-[10px] text-graphite-400 font-mono">Azure AD</span>
              </div>
              <p className="text-[11px] text-graphite-400">
                Requires an Azure AD App Registration with <code>Mail.Send</code> and <code>Mail.ReadWrite</code> application permissions.
              </p>
              <div className="text-[10px] text-gold-400 font-mono pt-1">
                Config: MS_GRAPH_CLIENT_ID, MS_GRAPH_TENANT_ID, MS_GRAPH_CLIENT_SECRET
              </div>
            </div>

            <div className="p-3 rounded-xl bg-solian-surface/80 border border-solian-border space-y-1.5">
              <div className="font-semibold text-white flex items-center justify-between">
                <span>3. Enterprise SMTP / IMAP</span>
                <span className="text-[10px] text-graphite-400 font-mono">Direct Relay</span>
              </div>
              <p className="text-[11px] text-graphite-400">
                Standard TLS-encrypted outbound SMTP relay for corporate email delivery.
              </p>
              <div className="text-[10px] text-gold-400 font-mono pt-1">
                Config: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-solian-darkest/60 border border-solian-border/50 text-[11px] text-graphite-400 space-y-1">
            <p className="font-semibold text-slate-300">Zero-Fabrication Policy:</p>
            <p>
              AUREN SOLIAN adheres to absolute data integrity. In disconnected mode, draft persistence, local composition, and AI writing assistance remain fully functional, while outbound transmission is guarded until authorized credentials are supplied.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-solian-border bg-solian-darkest/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-solian-surface border border-solian-border text-xs text-white hover:bg-solian-border transition cursor-pointer font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

