'use client';

import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone =
    typeof (window.navigator as Navigator & { standalone?: boolean }).standalone === 'boolean' &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  const isTwa = document.referrer.startsWith('android-app://');

  return isStandaloneMode || isIosStandalone || isTwa;
}

export function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    setIsStandalone(isRunningStandalone());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt || isInstalling) return;

    setIsInstalling(true);
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome !== 'accepted') {
      setIsInstalling(false);
      return;
    }

    setDeferredPrompt(null);
    setIsInstalling(false);
  };

  if (isStandalone || !deferredPrompt) return null;

  return (
    <button
      type="button"
      onClick={handleInstall}
      aria-label="Install app"
      title="Install app"
      style={{
        position: 'fixed',
        right: '18px',
        bottom: '18px',
        zIndex: 90,
        height: '40px',
        width: '40px',
        borderRadius: '999px',
        border: '1px solid var(--border-default)',
        background: 'color-mix(in srgb, var(--bg-app) 82%, white 18%)',
        color: 'var(--text-primary)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        padding: 0,
        cursor: isInstalling ? 'progress' : 'pointer',
        boxShadow: '0 6px 18px rgba(0, 0, 0, 0.12)',
        transition: 'width 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease, padding 0.2s ease, gap 0.2s ease',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
      className="install-pwa-btn"
      disabled={isInstalling}
    >
      <Download size={17} strokeWidth={2.2} aria-hidden="true" />
      <span
        style={{
          opacity: 0,
          maxWidth: 0,
          transform: 'translateX(-4px)',
          transition: 'max-width 0.2s ease, opacity 0.2s ease, transform 0.2s ease',
          fontWeight: 700,
          fontSize: '11px',
          letterSpacing: '0.01em',
        }}
        className="install-pwa-btn-label"
      >
        Install
      </span>
      <style>{`
        .install-pwa-btn:hover,
        .install-pwa-btn:focus-visible {
          width: 106px !important;
          padding: 0 12px;
          gap: 6px;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
        }

        .install-pwa-btn:hover .install-pwa-btn-label,
        .install-pwa-btn:focus-visible .install-pwa-btn-label {
          opacity: 1;
          max-width: 62px;
          transform: translateX(0);
        }

        @media (max-width: 640px) {
          .install-pwa-btn {
            right: 12px !important;
            bottom: 12px !important;
          }
        }
      `}</style>
    </button>
  );
}
