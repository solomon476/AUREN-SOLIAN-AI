import React, { useState } from 'react';
import { User } from 'lucide-react';
import { UserRole } from '../../types';
import { buildApiUrl } from '../../api/client';

export interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  role?: UserRole;
  className?: string;
  showRoleBadge?: boolean;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl font-bold',
};

const ICON_SIZES = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
  xl: 'w-10 h-10',
};

const ROLE_BORDER_COLORS: Record<UserRole, string> = {
  owner: 'border-gold-500/50 text-gold-400 bg-gold-500/10',
  admin: 'border-amber-500/50 text-amber-400 bg-amber-500/10',
  manager: 'border-blue-500/50 text-blue-400 bg-blue-500/10',
  member: 'border-slate-500/40 text-slate-300 bg-slate-500/10',
  guest: 'border-graphite-600/40 text-graphite-400 bg-graphite-800/40',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarUrl,
  size = 'sm',
  role,
  className = '',
  showRoleBadge = false,
}) => {
  const [imgError, setImgError] = useState(false);

  // Extract clean initials
  const getInitials = (fullName?: string | null): string => {
    if (!fullName) return '';
    // Strip [DEMO] tag if present
    const clean = fullName.replace(/\[DEMO\]/gi, '').trim();
    if (!clean) return '';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm;
  const iconSize = ICON_SIZES[size] || ICON_SIZES.sm;
  const roleBorder = role ? ROLE_BORDER_COLORS[role] : 'border-gold-500/30 text-gold-400 bg-gold-500/10';

  // Resolve image source URL safely
  const resolvedSrc = React.useMemo(() => {
    if (!avatarUrl || imgError) return null;
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://') || avatarUrl.startsWith('data:')) {
      return avatarUrl;
    }
    // Clean relative path
    const endpoint = avatarUrl.replace(/^\/api\/v1/, '');
    return buildApiUrl(endpoint);
  }, [avatarUrl, imgError]);

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 border overflow-hidden select-none font-semibold ${sizeClass} ${roleBorder} ${className}`}
      aria-label={name ? `Avatar for ${name}` : 'User avatar'}
      title={name || 'User avatar'}
    >
      {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={name ? `Profile of ${name}` : 'Profile picture'}
          className="w-full h-full object-cover rounded-full"
          onError={() => setImgError(true)}
        />
      ) : initials ? (
        <span className="leading-none">{initials}</span>
      ) : (
        <User className={`${iconSize} opacity-80`} />
      )}

      {showRoleBadge && role && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-solian-darkest"
          style={{
            backgroundColor:
              role === 'owner' ? '#eab308' : role === 'admin' ? '#f59e0b' : role === 'manager' ? '#3b82f6' : '#94a3b8',
          }}
          title={`Role: ${role.toUpperCase()}`}
        />
      )}
    </div>
  );
};

