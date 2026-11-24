import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  ExternalLink,
  CheckCheck,
} from 'lucide-react';
import { SolianApiClient } from '../../api/client';
import { NotificationItem } from '../../types';
import { useOrganization } from '../../context/OrganizationContext';

export const NotificationCenter: React.FC = () => {
  const { setActiveModule } = useOrganization();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const loadNotifications = async () => {
    try {
      const data = await SolianApiClient.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (notif: NotificationItem) => {
    try {
      await SolianApiClient.markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      if (notif.linkModule) {
        setActiveModule(notif.linkModule);
        setIsOpen(false);
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await SolianApiClient.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const getIcon = (type: string, priority: string) => {
    if (priority === 'urgent') return <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />;
    if (type === 'task_assigned') return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
    if (type === 'meeting_invite') return <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />;
    return <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        title="Operational Notifications"
        className="relative p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
        aria-label="Operational Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gold-500 text-slate-950 font-bold text-[9px] flex items-center justify-center animate-pulse shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-x-2 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-[calc(100vw-1rem)] bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 z-50 space-y-3 animate-fadeIn text-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Operational Dispatch
                </span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-800 border border-amber-500/30">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    title="Mark all as read"
                    className="text-[10px] font-semibold text-graphite-400 hover:text-gold-400 flex items-center gap-1 cursor-pointer py-1 px-1.5 rounded"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-graphite-400 hover:text-white p-1 rounded-lg"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto space-y-2 scrollbar-thin">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-xs text-graphite-400">
                  No notifications dispatch entries found.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkAsRead(notif)}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-2.5 min-h-[44px] ${
                      notif.isRead
                        ? 'bg-slate-50 border-slate-200 opacity-75'
                        : 'bg-white border-amber-500/40 shadow-sm'
                    }`}
                  >
                    {getIcon(notif.type, notif.priority)}

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">{notif.title}</span>
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">{notif.message}</p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                        <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {notif.linkModule && (
                          <span className="text-amber-700 hover:underline flex items-center gap-0.5">
                            View in {notif.linkModule}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
