import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Hash,
  Pin,
  Send,
  CornerDownRight,
  Shield,
  Sparkles,
  Users,
  Search,
  MessageCircle,
} from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { DiscussionChannel, DiscussionMessage } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const DiscussionsView: React.FC = () => {
  const { user } = useAuth();
  const [channels, setChannels] = useState<DiscussionChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  // New Post Form
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reply Form
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const loadChannels = async () => {
    try {
      const data = await SolianApiClient.getDiscussionChannels();
      setChannels(data);
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await SolianApiClient.getDiscussionMessages(activeChannelId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    loadMessages();
  }, [activeChannelId]);

  const activeChannel = channels.find((c) => c.id === activeChannelId) || {
    id: activeChannelId,
    name: 'General Announcements',
    type: 'company',
    description: 'Company-wide operational announcements and executive briefings.',
    messageCount: 0,
  };

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    setSubmitting(true);
    try {
      await SolianApiClient.createDiscussionMessage({
        channel_type: activeChannel.type,
        channel_id: activeChannel.id,
        channel_name: activeChannel.name,
        title: postTitle.trim() || undefined,
        content: postContent.trim(),
        is_pinned: isPinned,
      });

      setPostTitle('');
      setPostContent('');
      setIsPinned(false);
      await loadMessages();
      await loadChannels();
    } catch (err) {
      console.error('Failed to post message:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostReply = async (parentId: string) => {
    if (!replyContent.trim()) return;
    setSubmittingReply(true);
    try {
      await SolianApiClient.createDiscussionMessage({
        channel_type: activeChannel.type,
        channel_id: activeChannel.id,
        channel_name: activeChannel.name,
        content: replyContent.trim(),
        parent_id: parentId,
      });

      setReplyContent('');
      setReplyingToId(null);
      await loadMessages();
      await loadChannels();
    } catch (err) {
      console.error('Failed to post reply:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  // Group top-level threads vs replies
  const topLevelMessages = messages.filter((m) => !m.parentId);
  const repliesByParent = messages.reduce<Record<string, DiscussionMessage[]>>((acc, m) => {
    if (m.parentId) {
      acc[m.parentId] = acc[m.parentId] || [];
      acc[m.parentId].push(m);
    }
    return acc;
  }, {});

  const canPin = user.role === 'owner' || user.role === 'admin';

  return (
    <div className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold-400 mb-1">
          <MessageSquare className="w-4 h-4" />
          <span>Internal Communication</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          Internal Discussions & Strategic Threads
        </h2>
        <p className="text-xs md:text-sm text-graphite-400 mt-0.5">
          Contextual discussions across company operations, architectural decisions, and client escalations.
        </p>
      </div>

      {/* Mobile Horizontal Channels Strip (Prevents channel list from pushing chat below the fold) */}
      <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {channels.map((ch) => {
          const isActive = activeChannelId === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChannelId(ch.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer min-h-[40px] shrink-0 ${
                isActive
                  ? 'bg-gold-500 text-solian-darkest font-extrabold shadow-sm'
                  : 'bg-solian-card text-slate-300 border border-solian-border hover:text-white'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>{ch.name}</span>
              {ch.messageCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-black/20 text-black' : 'bg-solian-surface text-gold-400'
                }`}>
                  {ch.messageCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column: Channels Nav (Desktop only) */}
        <div className="hidden lg:block lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-solian-card border border-solian-border space-y-3">
            <div className="text-xs font-bold text-graphite-400 uppercase tracking-wider">
              Communication Channels
            </div>

            <div className="space-y-1">
              {channels.map((ch) => {
                const isActive = activeChannelId === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannelId(ch.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[44px] ${
                      isActive
                        ? 'bg-solian-surface text-gold-400 border border-gold-500/40 shadow-glow-subtle'
                        : 'text-slate-300 hover:bg-solian-surface/60 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Hash className={`w-4 h-4 shrink-0 ${isActive ? 'text-gold-400' : 'text-graphite-400'}`} />
                      <span className="truncate">{ch.name}</span>
                    </div>
                    {ch.messageCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-solian-darkest text-slate-400 border border-solian-border shrink-0">
                        {ch.messageCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Channel Info Card */}
          <div className="p-4 rounded-2xl bg-solian-card/70 border border-solian-border/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200">About #{activeChannel.name}</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gold-500/10 text-gold-400 border border-gold-500/20">
                {activeChannel.type}
              </span>
            </div>
            <p className="text-xs text-graphite-400 leading-relaxed">
              {activeChannel.description}
            </p>
            <div className="pt-2 border-t border-solian-border/60 flex items-center gap-1.5 text-[11px] text-slate-400">
              <Users className="w-3.5 h-3.5 text-gold-400" />
              <span>Full Company Access • Zero-Trust Boundary Grounded</span>
            </div>
          </div>
        </div>

        {/* Right Column: Message Stream & Composer */}
        <div className="lg:col-span-8 space-y-4">
          {/* Post Composer */}
          <div className="p-3.5 sm:p-5 rounded-2xl bg-solian-card border border-solian-border shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-bold text-white">
                Thread in <span className="text-gold-400">#{activeChannel.name}</span>
              </span>
              {canPin && (
                <label className="flex items-center gap-1.5 text-xs text-graphite-400 cursor-pointer min-h-[36px]">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded border-solian-border text-gold-500 focus:ring-0"
                  />
                  <Pin className="w-3.5 h-3.5 text-gold-400" />
                  <span>Pin Announcement</span>
                </label>
              )}
            </div>

            <form onSubmit={handlePostMessage} className="space-y-3">
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                placeholder="Topic or Title (optional)..."
                className="w-full bg-solian-surface border border-solian-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-graphite-400 focus:outline-none focus:border-gold-500/50 min-h-[44px]"
              />
              <textarea
                required
                rows={3}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder={`Write message as ${user.fullName} (${user.role.toUpperCase()})...`}
                className="w-full bg-solian-surface border border-solian-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-graphite-400 focus:outline-none focus:border-gold-500/50 resize-y"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-graphite-400">
                  Visible to verified Solian Wolves members.
                </span>
                <button
                  type="submit"
                  disabled={submitting || !postContent.trim()}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 disabled:opacity-50 text-solian-obsidian font-bold text-xs uppercase tracking-wider transition cursor-pointer min-h-[44px] self-end sm:self-auto"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Posting...' : 'Post Message'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Messages Feed */}
          <div className="space-y-3">
            {loading ? (
              <div className="p-8 text-center text-graphite-400 bg-solian-card rounded-2xl border border-solian-border text-xs">
                Loading messages...
              </div>
            ) : topLevelMessages.length === 0 ? (
              <div className="p-8 sm:p-12 text-center text-graphite-400 bg-solian-card rounded-2xl border border-solian-border text-xs">
                No messages posted in #{activeChannel.name} yet. Be the first to start the discussion!
              </div>
            ) : (
              topLevelMessages.map((msg) => {
                const replies = repliesByParent[msg.id] || [];
                const isReplying = replyingToId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`p-3.5 sm:p-5 rounded-2xl border transition ${
                      msg.isPinned
                        ? 'bg-solian-surface/90 border-gold-500/40 shadow-glow-subtle'
                        : 'bg-solian-card border-solian-border'
                    }`}
                  >
                    {/* Message Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gold-500/20 text-gold-400 flex items-center justify-center font-bold text-xs border border-gold-500/30 shrink-0">
                          {msg.authorName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{msg.authorName}</span>
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-solian-surface text-gold-400 border border-solian-border">
                              {msg.authorRole}
                            </span>
                          </div>
                          <span className="text-[10px] text-graphite-400">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(msg.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {msg.isPinned && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-gold-400 px-2 py-0.5 rounded bg-gold-500/10 border border-gold-500/20">
                          <Pin className="w-3 h-3" />
                          <span>Pinned</span>
                        </span>
                      )}
                    </div>

                    {/* Post Title & Content */}
                    {msg.title && (
                      <h4 className="text-sm font-bold text-white mt-2.5 sm:mt-3">{msg.title}</h4>
                    )}
                    <div className="text-xs text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between text-xs mt-3.5 pt-2.5 border-t border-solian-border/50">
                      <button
                        onClick={() => setReplyingToId(isReplying ? null : msg.id)}
                        className="flex items-center gap-1.5 text-graphite-400 hover:text-gold-400 font-semibold cursor-pointer transition text-xs min-h-[40px] px-2 rounded-lg hover:bg-solian-surface"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-gold-500" />
                        <span>{replies.length > 0 ? `${replies.length} Replies` : 'Reply to Thread'}</span>
                      </button>
                    </div>

                    {/* Replies Stream */}
                    {replies.length > 0 && (
                      <div className="mt-3 pl-3 sm:pl-4 border-l-2 border-gold-500/30 space-y-2">
                        {replies.map((rep) => (
                          <div key={rep.id} className="p-3 rounded-xl bg-solian-surface/70 border border-solian-border/60">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-200">{rep.authorName}</span>
                                <span className="text-[9px] font-extrabold uppercase px-1 rounded bg-solian-darkest text-gold-400 border border-solian-border">
                                  {rep.authorRole}
                                </span>
                              </div>
                              <span className="text-[10px] text-graphite-400">
                                {new Date(rep.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">{rep.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Reply Input */}
                    {isReplying && (
                      <div className="mt-3 pt-3 border-t border-solian-border/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 bg-solian-surface border border-solian-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500/50 min-h-[44px]"
                        />
                        <button
                          onClick={() => handlePostReply(msg.id)}
                          disabled={submittingReply || !replyContent.trim()}
                          className="px-4 py-2 rounded-xl bg-gold-500 hover:bg-gold-400 text-solian-obsidian font-bold text-xs transition cursor-pointer shrink-0 min-h-[44px] flex items-center justify-center"
                        >
                          Send Reply
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
