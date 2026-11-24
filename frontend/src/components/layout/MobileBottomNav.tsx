import React from 'react';
import {
  LayoutDashboard,
  Bot,
  CheckSquare,
  CalendarClock,
  Menu,
} from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext';

export const MobileBottomNav: React.FC = () => {
  const { activeModule, setActiveModule, toggleMobileNav } = useOrganization();

  const primaryNavItems = [
    { id: 'dashboard', label: 'Command', icon: LayoutDashboard },
    { id: 'chat', label: 'Auren AI', icon: Bot, hasLiveBadge: true },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'meetings', label: 'Cadences', icon: CalendarClock },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200 shadow-xl select-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}
    >
      <div className="grid grid-cols-5 h-12 sm:h-13 items-center px-1">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveModule(item.id)}
              className={`flex flex-col items-center justify-center h-full py-0.5 transition-all cursor-pointer relative min-h-[44px] ${
                isActive
                  ? 'text-amber-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 bg-amber-600 rounded-full shadow-glow-gold" />
              )}
              <div className="relative">
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-amber-600' : 'text-slate-500'}`} />
                {item.hasLiveBadge && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
              <span className="text-[9.5px] mt-0.5 tracking-tight truncate max-w-[64px]">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* 5th Button: More / Drawer Trigger */}
        <button
          onClick={toggleMobileNav}
          className="flex flex-col items-center justify-center h-full py-0.5 text-slate-500 hover:text-slate-800 transition-all cursor-pointer relative min-h-[44px]"
          aria-label="Open full company modules menu"
        >
          <Menu className="w-4.5 h-4.5 text-slate-500" />
          <span className="text-[9.5px] mt-0.5 tracking-tight truncate">
            More
          </span>
        </button>
      </div>
    </nav>
  );
};

