'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ParsedBlock } from '@/lib/markdownTransform';

interface FloatingToolbarProps {
  focusedBlockId: string | null;
  blocks: ParsedBlock[];
  sidebarOffset: number;
  onAction: (action: string, value?: string) => void;
}

// ── Icons ─────────────────────────────────────────────────────────────────────

interface IconProps {
  size?: number;
}

function IconBold({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  );
}

function IconItalic({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  );
}

function IconStrikethrough({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.8 3.3 6 3.9h.9" />
      <path d="M21 12H3" />
      <path d="M7 17c0 2.8 2.4 3.5 6.6 3.5 2.5 0 4.4-.6 6.3-1.9" />
    </svg>
  );
}

function IconCode({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconLink({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconQuote({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </svg>
  );
}

function IconUL({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconOL({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 10h2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 14h2a1 1 0 1 1 0 2H3l2 2H3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconTable({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function IconImage({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconHR({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="6" y2="6" />
      <line x1="3" y1="18" x2="6" y2="18" />
      <line x1="18" y1="6" x2="21" y2="6" />
      <line x1="18" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconChevronDown({ size = 9 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div style={{ width: '1px', height: '18px', background: 'var(--border-default)', margin: '0 3px', flexShrink: 0 }} />
  );
}

// ── Toolbar button ────────────────────────────────────────────────────────────

interface TBtnProps {
  title: string;
  action: string;
  IconComponent: (props: IconProps) => React.ReactNode;
  isActive?: boolean;
  onAction: (action: string) => void;
  isMobile?: boolean;
}

function TBtn({ title, action, IconComponent, isActive, onAction, isMobile }: TBtnProps) {
  const buttonSize = isMobile ? 38 : 30;
  const iconSize = isMobile ? 18 : 15;

  return (
    <button
      title={title}
      onMouseDown={(e) => {
        e.preventDefault(); // prevent focus loss
        onAction(action);
      }}
      onTouchStart={(e) => {
        e.preventDefault(); // prevent focus loss on mobile
        onAction(action);
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${buttonSize}px`,
        height: `${buttonSize}px`,
        borderRadius: '6px',
        border: 'none',
        background: isActive ? 'var(--bg-active)' : 'transparent',
        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
        cursor: 'pointer',
        transition: 'all 0.1s ease',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
        }
      }}
    >
      <IconComponent size={iconSize} />
    </button>
  );
}

// ── Main toolbar ──────────────────────────────────────────────────────────────

export function FloatingToolbar({ focusedBlockId, blocks, sidebarOffset, onAction }: FloatingToolbarProps) {
  const [headingOpen, setHeadingOpen] = useState(false);
  const [blockTypeOpen, setBlockTypeOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);
  const blockTypeRef = useRef<HTMLDivElement>(null);

  // Current focused block
  const focusedBlock = blocks.find((b) => b.id === focusedBlockId) ?? null;
  const currentType = focusedBlock?.type ?? 'p';

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) {
        setHeadingOpen(false);
      }
      if (blockTypeRef.current && !blockTypeRef.current.contains(e.target as Node)) {
        setBlockTypeOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  // Block type display label
  const blockTypeLabels: Record<string, string> = {
    p: 'Text', h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4', h5: 'H5', h6: 'H6',
    ul: 'List', ol: 'Ordered', quote: 'Quote', code: 'Code', table: 'Table', hr: 'Rule',
  };
  const currentLabel = blockTypeLabels[currentType] ?? 'Text';
  const showExtendedMobileActions = !isMobile;

  const dropdownItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 10px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontFamily: 'var(--font-ui)',
    fontSize: '13px',
    fontWeight: '500',
    textAlign: 'left',
    width: '100%',
    transition: 'background 0.1s',
  };

  return (
    <div
      className="floating-toolbar glass"
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        left: `calc(50% + ${sidebarOffset / 2}px)`,
        transform: 'translateX(-50%)',
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        zIndex: 80,
        background: 'var(--bg-toolbar)',
        border: '1px solid var(--border-default)',
        borderRadius: '12px',
        padding: '5px 6px',
        display: 'flex',
        alignItems: 'center',
        gap: '1px',
        boxShadow: 'var(--shadow-toolbar)',
      }}
    >
      {/* Block type picker */}
      <div ref={blockTypeRef} style={{ position: 'relative' }}>
        <button
          title="Block type"
          onMouseDown={(e) => { e.preventDefault(); setBlockTypeOpen((v) => !v); setHeadingOpen(false); }}
          onTouchStart={(e) => { e.preventDefault(); setBlockTypeOpen((v) => !v); setHeadingOpen(false); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '5px 8px',
            borderRadius: '6px',
            border: 'none',
            background: blockTypeOpen ? 'var(--bg-active)' : 'transparent',
            color: blockTypeOpen ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'var(--font-ui)',
            fontWeight: '600',
            transition: 'all 0.1s ease',
            minWidth: '52px',
            justifyContent: 'space-between',
          }}
          onMouseEnter={(e) => { if (!blockTypeOpen) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
          onMouseLeave={(e) => { if (!blockTypeOpen) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <span style={{ color: 'var(--text-primary)' }}>{currentLabel}</span>
          <IconChevronDown />
        </button>

        {blockTypeOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '0',
              background: 'var(--bg-toolbar)',
              border: '1px solid var(--border-default)',
              borderRadius: '10px',
              boxShadow: 'var(--shadow-modal)',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
              minWidth: '150px',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {([
              { type: 'p', label: 'Paragraph', desc: 'Regular text' },
              { type: 'quote', label: 'Quote', desc: 'Block quote' },
              { type: 'ul', label: 'Bullet list', desc: 'Unordered list' },
              { type: 'ol', label: 'Numbered list', desc: 'Ordered list' },
              { type: 'code', label: 'Code block', desc: 'Monospace code' },
            ] as { type: string; label: string; desc: string }[]).map((item) => (
              <button
                key={item.type}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAction(item.type);
                  setBlockTypeOpen(false);
                }}
                onTouchStart={(e) => {
                  e.preventDefault();
                  onAction(item.type);
                  setBlockTypeOpen(false);
                }}
                style={{
                  ...dropdownItemStyle,
                  background: currentType === item.type ? 'var(--bg-active)' : 'transparent',
                  color: currentType === item.type ? 'var(--accent)' : 'var(--text-primary)',
                }}
                onMouseEnter={(e) => {
                  if (currentType !== item.type) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    currentType === item.type ? 'var(--bg-active)' : 'transparent';
                }}
              >
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.desc}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Heading picker */}
      <div ref={headingRef} style={{ position: 'relative' }}>
        <button
          title="Heading"
          onMouseDown={(e) => { e.preventDefault(); setHeadingOpen((v) => !v); setBlockTypeOpen(false); }}
          onTouchStart={(e) => { e.preventDefault(); setHeadingOpen((v) => !v); setBlockTypeOpen(false); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            padding: '5px 7px',
            borderRadius: '6px',
            border: 'none',
            background: headingOpen || /^h[1-6]$/.test(currentType) ? 'var(--bg-active)' : 'transparent',
            color: headingOpen || /^h[1-6]$/.test(currentType) ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'var(--font-ui)',
            fontWeight: '600',
            transition: 'all 0.1s ease',
          }}
          onMouseEnter={(e) => {
            if (!headingOpen && !/^h[1-6]$/.test(currentType))
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            if (!headingOpen && !/^h[1-6]$/.test(currentType))
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <span style={{ fontWeight: '700', fontSize: '13px' }}>H</span>
          <IconChevronDown />
        </button>

        {headingOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--bg-toolbar)',
              border: '1px solid var(--border-default)',
              borderRadius: '10px',
              boxShadow: 'var(--shadow-modal)',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1px',
              minWidth: '140px',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((level) => {
              const hType = `h${level}`;
              const isActive = currentType === hType;
              return (
                <button
                  key={level}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onAction(hType);
                    setHeadingOpen(false);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onAction(hType);
                    setHeadingOpen(false);
                  }}
                  style={{
                    ...dropdownItemStyle,
                    fontSize: level === 1 ? '16px' : level === 2 ? '14px' : '13px',
                    fontWeight: level <= 3 ? '700' : '600',
                    background: isActive ? 'var(--bg-active)' : 'transparent',
                    color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = isActive ? 'var(--bg-active)' : 'transparent';
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: '700', minWidth: '22px' }}>
                    H{level}
                  </span>
                  Heading {level}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Divider />

      {/* Inline formatting */}
      <TBtn title="Bold (Ctrl+B)" action="bold" IconComponent={IconBold} onAction={onAction} isMobile={isMobile} />
      <TBtn title="Italic (Ctrl+I)" action="italic" IconComponent={IconItalic} onAction={onAction} isMobile={isMobile} />
      <TBtn title="Strikethrough" action="strikethrough" IconComponent={IconStrikethrough} onAction={onAction} isMobile={isMobile} />
      {showExtendedMobileActions && (
        <>
          <TBtn title="Inline Code" action="code" IconComponent={IconCode} onAction={onAction} isMobile={isMobile} />
          <TBtn title="Link" action="link" IconComponent={IconLink} onAction={onAction} isMobile={isMobile} />
        </>
      )}

      <Divider />

      {/* Block inserts */}
      <TBtn
        title="Blockquote"
        action="quote"
        IconComponent={IconQuote}
        isActive={currentType === 'quote'}
        onAction={onAction}
        isMobile={isMobile}
      />
      <TBtn
        title="Bullet List"
        action="ul"
        IconComponent={IconUL}
        isActive={currentType === 'ul'}
        onAction={onAction}
        isMobile={isMobile}
      />
      <TBtn
        title="Numbered List"
        action="ol"
        IconComponent={IconOL}
        isActive={currentType === 'ol'}
        onAction={onAction}
        isMobile={isMobile}
      />

      {showExtendedMobileActions && (
        <>
          <Divider />
          <TBtn title="Table" action="table" IconComponent={IconTable} onAction={onAction} isMobile={isMobile} />
          <TBtn title="Image" action="image" IconComponent={IconImage} onAction={onAction} isMobile={isMobile} />
          <TBtn title="Divider" action="hr" IconComponent={IconHR} onAction={onAction} isMobile={isMobile} />
        </>
      )}
    </div>
  );
}