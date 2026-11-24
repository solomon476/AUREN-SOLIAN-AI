import React, { useEffect, useState } from 'react';
import { Download, X, Share2, PlusSquare, Smartphone, MoreVertical, CheckCircle, ShieldCheck } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

export const usePWAInstall = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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

    // Detect platform
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream;
    const isMobileDevice = /android|iphone|ipad|ipod|mobile/i.test(userAgent);
    setIsIOS(isIosDevice);
    setIsMobile(isMobileDevice);

    // Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      globalDeferredPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setIsInstallable(false);
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (): Promise<'accepted' | 'dismissed' | 'modal' | 'unsupported'> => {
    const prompt = deferredPrompt || globalDeferredPrompt;
    if (prompt) {
      try {
        await prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsStandalone(true);
          setIsInstallable(false);
          setDeferredPrompt(null);
          globalDeferredPrompt = null;
        }
        return choice.outcome;
      } catch (err) {
        console.warn('Native install prompt failed, falling back to instructions modal:', err);
      }
    }

    // Fall back to opening the step-by-step installation instructions modal
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-pwa-install-modal', { detail: { isIOS } }));
      return 'modal';
    }
    return 'unsupported';
  };

  return {
    isStandalone,
    isIOS,
    isMobile,
    isInstallable: !isStandalone && (isInstallable || isMobile || isIOS),
    triggerInstall,
  };
};

export const PWAInstallBanner: React.FC = () => {
  const { isStandalone, isIOS, isInstallable, triggerInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(isIOS ? 'ios' : 'android');

  useEffect(() => {
    const handleOpenModal = (e: Event) => {
      const customEvent = e as CustomEvent<{ isIOS?: boolean }>;
      if (customEvent.detail?.isIOS || isIOS) {
        setActiveTab('ios');
      } else {
        setActiveTab('android');
      }
      setShowGuide(true);
    };

    window.addEventListener('open-pwa-install-modal', handleOpenModal as EventListener);
    return () => {
      window.removeEventListener('open-pwa-install-modal', handleOpenModal as EventListener);
    };
  }, [isIOS]);

  const handleInstallClick = async () => {
    const outcome = await triggerInstall();
    if (outcome === 'modal' || outcome === 'unsupported') {
      setActiveTab(isIOS ? 'ios' : 'android');
      setShowGuide(true);
    }
  };

  return (
    <>
      {/* Floating Bottom Install Banner (shown on mobile/uninstalled devices) */}
      {!isStandalone && !dismissed && isInstallable && (
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
                    App
                  </span>
                </div>
                <div className="text-[11px] text-graphite-300 truncate">
                  Add to home screen for native mobile experience
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
      )}

      {/* Interactive Mobile Installation Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-solian-card border border-gold-500/30 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Smartphone className="w-4 h-4 text-gold-400" />
                <span>Install AUREN SOLIAN</span>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="text-graphite-400 hover:text-white p-1 rounded-lg hover:bg-solian-surface transition"
                aria-label="Close guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="flex rounded-lg bg-solian-darkest p-1 border border-solian-border">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                  activeTab === 'android'
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-sm'
                    : 'text-graphite-400 hover:text-slate-200'
                }`}
              >
                Android / Chrome
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                  activeTab === 'ios'
                    ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-sm'
                    : 'text-graphite-400 hover:text-slate-200'
                }`}
              >
                iPhone / Safari
              </button>
            </div>

            {activeTab === 'android' ? (
              <div className="space-y-3">
                <p className="text-xs text-graphite-300 leading-relaxed">
                  Install AUREN SOLIAN on your Android phone as a standalone application:
                </p>

                <div className="space-y-2.5 text-xs text-slate-200 bg-solian-obsidian/70 p-3.5 rounded-xl border border-solian-border">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-gold-500/10 text-gold-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      Tap the <strong className="text-white">three dots</strong> (<MoreVertical className="w-3.5 h-3.5 inline text-gold-400" />) in Chrome's top-right corner.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-gold-500/10 text-gold-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      Tap <strong className="text-white">Install app</strong> (or <strong className="text-white">Add to Home screen</strong>).
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-gold-500/10 text-gold-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      Tap <strong className="text-white">Install</strong>. The Solian Wolves corporate icon will appear directly in your home screen and app launcher.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-graphite-300 leading-relaxed">
                  Apple Safari requires adding apps to your Home Screen using the share menu:
                </p>

                <div className="space-y-2.5 text-xs text-slate-200 bg-solian-obsidian/70 p-3.5 rounded-xl border border-solian-border">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-gold-500/10 text-gold-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>Tap the</span>
                      <Share2 className="w-4 h-4 text-gold-400 inline" />
                      <strong className="text-white">Share button</strong>
                      <span>in Safari's bottom toolbar</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-gold-500/10 text-gold-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>Scroll down & tap</span>
                      <PlusSquare className="w-4 h-4 text-gold-400 inline" />
                      <strong className="text-white">Add to Home Screen</strong>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-gold-500/10 text-gold-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      Tap <strong className="text-white">Add</strong> in the top right corner.
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
              <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Full offline caching, instant app launch, and zero app store download required.</span>
            </div>

            <button
              onClick={() => setShowGuide(false)}
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
