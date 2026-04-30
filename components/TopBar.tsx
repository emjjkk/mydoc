'use client';

import React, { useState, useRef, useCallback } from 'react';

interface TopBarProps {
  title: string;
  onTitleChange: (title: string) => void;
  onMenuToggle: () => void;
  isSidebarOpen?: boolean;
  wordCount?: number;
  onExport: () => void;
  onPreferences: () => void;
  savingStatus?: 'idle' | 'saving' | 'saved';
}

function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function TopBar({
  title,
  onTitleChange,
  onMenuToggle,
  isSidebarOpen = false,
  wordCount = 0,
  onExport,
  onPreferences,
  savingStatus = 'idle',
}: TopBarProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false);
    const val = titleRef.current?.value?.trim();
    if (val !== undefined) {
      onTitleChange(val || 'Untitled');
    }
  }, [onTitleChange]);

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      titleRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  }, []);

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 9px',
    borderRadius: '4px',
    border: '1px solid var(--border-default)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '12px',
    fontFamily: 'var(--font-ui)',
    fontWeight: '500',
    transition: 'all 0.12s ease',
    whiteSpace: 'nowrap',
  };

  return (
    <header
      style={{
        position: 'relative',
        zIndex: 20,
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '10px 12px',
        background: 'var(--bg-editor)',
        borderBottom: '1px solid var(--border-default)',
        minHeight: '50px',
      }}
    >
      {/* Left: menu toggle, word count, and saving indicator */}
      <div style={{ justifySelf: 'start', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <button
          onClick={onMenuToggle}
          title={isSidebarOpen ? 'Close documents' : 'Open documents'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '30px',
            height: '30px',
            borderRadius: '7px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.12s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
          }}
        >
          {isSidebarOpen ? <IconChevronLeft /> : <IconMenu />}
        </button>

        {/* Saving indicator */}
        {savingStatus !== 'idle' && (
          <div
            style={{
              fontSize: '12px',
              fontFamily: 'var(--font-ui)',
              color: savingStatus === 'saving' ? 'var(--text-secondary)' : 'var(--accent)',
              fontWeight: '500',
              transition: 'color 0.3s ease',
              minWidth: '50px',
            }}
          >
            {savingStatus === 'saving' ? 'saving...' : 'saved'}
          </div>
        )}
        
      </div>

      {/* Center: editable title */}
      <div style={{ display: 'flex', justifyContent: 'center', minWidth: 0, maxWidth: '100%' }}>
        {isEditingTitle ? (
          <input
            ref={titleRef}
            defaultValue={title}
            autoFocus
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: '500',
              fontFamily: 'var(--font-ui)',
              color: 'var(--text-primary)',
              width: '100%',
              maxWidth: '400px',
            }}
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            title="Click to rename"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'text',
              fontSize: '14px',
              fontWeight: '500',
              fontFamily: 'var(--font-ui)',
              color: 'var(--text-primary)',
              padding: '3px 7px',
              borderRadius: '6px',
              transition: 'background 0.12s',
              maxWidth: '400px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            {title || 'Untitled'}
          </button>
        )}
      </div>

      {/* Right: action buttons */}
      <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div
          style={{
            fontSize: '12px',
            fontFamily: 'var(--font-ui)',
            color: 'var(--text-secondary)',
            fontWeight: '500',
            minWidth: '64px',
          }}
        >
          {wordCount} {wordCount === 1 ? 'word' : 'words'}
        </div>

        <button
          onClick={onExport}
          title="Export document"
          style={btnStyle}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = 'var(--bg-hover)';
            el.style.color = 'var(--text-primary)';
            el.style.borderColor = 'var(--border-strong)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = 'transparent';
            el.style.color = 'var(--text-secondary)';
            el.style.borderColor = 'var(--border-default)';
          }}
        >
          <IconDownload />
          <span>Export</span>
        </button>

        <button
          onClick={onPreferences}
          title="Preferences"
          style={{ ...btnStyle, padding: '6px' }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = 'var(--bg-hover)';
            el.style.color = 'var(--text-primary)';
            el.style.borderColor = 'var(--border-strong)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.background = 'transparent';
            el.style.color = 'var(--text-secondary)';
            el.style.borderColor = 'var(--border-default)';
          }}
        >
          <IconSettings />
        </button>
      
      </div>
    </header>
  );
}