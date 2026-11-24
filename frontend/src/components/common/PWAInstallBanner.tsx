import React, { useEffect, useState } from 'react';
import { Download, X, Share2, PlusSquare, Smartphone, CheckCircle } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone (installed) mode
    const checkStandalone = () => {
      const isStandaloneMode =
        (typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        (typeof document !== 'undefined' && Boolean(document.referrer?.includes('android-app://')));
      setIsStandalone(Boolean(isStandaloneMode));
    };

    checkStandalone();

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIosDevice);

    // Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (): Promise<'accepted' | 'dismissed' | 'ios' | 'unsupported'> => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsStandalone(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
      return choice.outcome;
    }
    if (isIOS && !isStandalone) {
      return 'ios';
    }
    return 'unsupported';
  };

  return {
    isStandalone,
    isIOS,
    isInstallable: isInstallable || (isIOS && !isStandalone),
    triggerInstall,
  };
};

export const PWAInstallBanner: React.FC = () => {
  const { isStandalone, isIOS, isInstallable, triggerInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  // If already running as installed app or dismissed by user, do not show
  if (isStandalone || dismissed || !isInstallable) {
    return null;
  }

  const handleInstallClick = async () => {
    const outcome = await triggerInstall();
    if (outcome === 'ios') {
      setShowIosGuide(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-16 md:bottom-4 left-3 right-3 md:left-auto md:right-6 md:w-96 z-40 animate-fadeIn">
        <div className="p-3.5 rounded-xl bg-solian-card/95 backdrop-blur-md border border-gold-500/30 shadow-2xl shadow-black/80 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400 shrink-0">
              <Smartphone className="w-5 h-5 text-gold-400" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                <span>Install AUREN SOLIAN</span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-gold-500/20 text-gold-300">
                  Mobile App
                </span>
              </div>
              <div className="text-[11px] text-graphite-300 truncate">
                Add to your phone home screen for instant access
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-400 text-solian-darkest font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shadow-glow-gold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-graphite-400 hover:text-white rounded-lg hover:bg-solian-surface transition cursor-pointer"
              aria-label="Dismiss install banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Instruction Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-solian-card border border-gold-500/30 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Smartphone className="w-4 h-4 text-gold-400" />
                <span>Install on iOS (iPhone / iPad)</span>
              </div>
              <button
                onClick={() => setShowIosGuide(false)}
                className="text-graphite-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-graphite-300 leading-relaxed">
              Apple Safari requires adding apps to your Home Screen using the share menu:
            </p>

            <div className="space-y-2.5 text-xs text-slate-200 bg-solian-obsidian/70 p-3.5 rounded-xl border border-solian-border">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-gold-500/10 text-gold-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                  1
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Tap the</span>
                  <Share2 className="w-4 h-4 text-gold-400" />
                  <span className="font-semibold text-white">Share button</span>
                  <span>in Safari's bar</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-gold-500/10 text-gold-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                  2
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Scroll down & tap</span>
                  <PlusSquare className="w-4 h-4 text-gold-400" />
                  <span className="font-semibold text-white">Add to Home Screen</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-md bg-gold-500/10 text-gold-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                  3
                </div>
                <div>
                  Tap <span className="font-semibold text-white">Add</span> in the top right corner
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-solian-darkest font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
