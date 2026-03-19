'use client';

import React, { useEffect, useRef } from 'react';
import { Preferences, FontFamily, ContentWidth, ColorTheme } from '@/hooks/usePreferences';

interface PreferencesModalProps {
  isOpen: boolean;
  preferences: Preferences;
  onClose: () => void;
  onUpdate: (updates: Partial<Preferences>) => void;
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

interface OptionChipProps {
  label: string;
  subtitle?: string;
  isActive: boolean;
  onClick: () => void;
  preview?: React.ReactNode;
}

function OptionChip({ label, subtitle, isActive, onClick, preview }: OptionChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        padding: '12px 8px',
        borderRadius: '10px',
        border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border-default)'}`,
        background: isActive ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.14s',
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }}
    >
      {preview && <div style={{ marginBottom: '2px' }}>{preview}</div>}
      <span style={{
        fontSize: '12px',
        fontWeight: isActive ? '600' : '500',
        color: isActive ? 'var(--accent)' : 'var(--text-primary)',
        fontFamily: 'var(--font-ui)',
      }}>
        {label}
      </span>
      {subtitle && (
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
          {subtitle}
        </span>
      )}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: '11px',
      fontWeight: '600',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-ui)',
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      marginBottom: '10px',
    }}>
      {children}
    </p>
  );
}

export function PreferencesModal({ isOpen, preferences, onClose, onUpdate }: PreferencesModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Theme previews
  const themeColors: Record<ColorTheme, { bg: string; text: string; border: string }> = {
    light: { bg: '#ffffff', text: '#1a1916', border: '#e5e4e0' },
    dark: { bg: '#1a1917', text: '#e8e6e1', border: '#2a2926' },
    sepia: { bg: '#faf7f2', text: '#2c2416', border: '#ede8dc' },
  };

  return (
    <div
      ref={overlayRef}
      className="modal-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-default)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-modal)',
          width: '100%',
          maxWidth: '440px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border-default)',
        }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
            Preferences
          </h2>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '8px',
              border: 'none', background: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <IconX />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Font */}
          <div>
            <SectionLabel>Editor Font</SectionLabel>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['fraunces', 'inter'] as FontFamily[]).map((font) => (
                <OptionChip
                  key={font}
                  label={font === 'fraunces' ? 'Fraunces' : 'Inter'}
                  subtitle={font === 'fraunces' ? 'Serif' : 'Sans-serif'}
                  isActive={preferences.font === font}
                  onClick={() => onUpdate({ font })}
                  preview={
                    <span style={{
                      fontFamily: font === 'fraunces' ? "'Fraunces', serif" : "'Inter', sans-serif",
                      fontSize: '22px',
                      fontWeight: font === 'fraunces' ? '300' : '400',
                      color: 'var(--text-primary)',
                      lineHeight: 1,
                    }}>
                      Aa
                    </span>
                  }
                />
              ))}
            </div>
          </div>

          {/* Content width */}
          <div>
            <SectionLabel>Content Width</SectionLabel>
            <div style={{ display: 'flex', gap: '8px' }}>
              {([
                { id: 'narrow', label: 'Narrow', sub: '720px' },
                { id: 'medium', label: 'Medium', sub: '960px' },
                { id: 'wide', label: 'Wide', sub: '1200px' },
              ] as { id: ContentWidth; label: string; sub: string }[]).map((opt) => (
                <OptionChip
                  key={opt.id}
                  label={opt.label}
                  subtitle={opt.sub}
                  isActive={preferences.width === opt.id}
                  onClick={() => onUpdate({ width: opt.id })}
                  preview={
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                      {[1, 0.75, 0.88].map((w, i) => (
                        <div key={i} style={{
                          height: '2px',
                          borderRadius: '1px',
                          background: 'var(--border-strong)',
                          width: `${(opt.id === 'narrow' ? 24 : opt.id === 'medium' ? 32 : 40) * w}px`,
                        }} />
                      ))}
                    </div>
                  }
                />
              ))}
            </div>
          </div>

          {/* Theme */}
          <div>
            <SectionLabel>Color Theme</SectionLabel>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['light', 'dark', 'sepia'] as ColorTheme[]).map((theme) => {
                const colors = themeColors[theme];
                return (
                  <OptionChip
                    key={theme}
                    label={theme.charAt(0).toUpperCase() + theme.slice(1)}
                    isActive={preferences.theme === theme}
                    onClick={() => onUpdate({ theme })}
                    preview={
                      <div style={{
                        width: '40px',
                        height: '28px',
                        borderRadius: '6px',
                        background: colors.bg,
                        border: `1px solid ${colors.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '3px',
                        padding: '4px 5px',
                        overflow: 'hidden',
                      }}>
                        {[1, 0.7].map((w, i) => (
                          <div key={i} style={{
                            height: '2px',
                            borderRadius: '1px',
                            background: colors.text,
                            width: `${w * 100}%`,
                            opacity: 0.6,
                          }} />
                        ))}
                      </div>
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--border-default)',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent)',
              color: 'white',
              fontSize: '13px',
              fontWeight: '600',
              fontFamily: 'var(--font-ui)',
              cursor: 'pointer',
              transition: 'opacity 0.12s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}