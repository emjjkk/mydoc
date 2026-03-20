'use client';

import React, { useEffect, useMemo } from 'react';
import { Document } from '@/hooks/useDocuments';

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  documents: Document[];
  activeDocId: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function formatDate(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatCreatedDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getWordCount(content: string): number {
  return content.trim() ? content.trim().split(/\s+/).length : 0;
}

function getPreviewText(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~\-|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function Sidebar({
  isOpen,
  isMobile,
  documents,
  activeDocId,
  onClose,
  onOpen,
  onCreate,
  onDelete,
  onExport,
}: SidebarProps) {
  const docMeta = useMemo(
    () =>
      documents.map((doc) => ({
        ...doc,
        wordCount: getWordCount(doc.content),
        preview: getPreviewText(doc.content) || 'No content yet.',
        createdLabel: formatCreatedDate(doc.createdAt),
      })),
    [documents]
  );

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <aside
      aria-hidden={!isOpen}
      style={{
        display: 'flex',
        minHeight: 0,
        position: isMobile ? 'fixed' : 'relative',
        inset: isMobile ? '0' : undefined,
        zIndex: isMobile ? 90 : 'auto',
        pointerEvents: isMobile && !isOpen ? 'none' : 'auto',
      }}
    >
      {isMobile && (
        <button
          aria-label="Close sidebar"
          onClick={onClose}
          style={{
            position: 'absolute',
            inset: 0,
            border: 'none',
            background: 'rgba(0,0,0,0.24)',
            opacity: isOpen ? 1 : 0,
            transition: 'opacity 0.2s ease',
            pointerEvents: isOpen ? 'auto' : 'none',
            cursor: 'default',
          }}
        />
      )}

      <div
        style={{
          width: isMobile ? '300px' : (isOpen ? '300px' : '0px'),
          minWidth: isMobile ? '300px' : (isOpen ? '300px' : '0px'),
          maxWidth: isMobile ? 'calc(100vw - 32px)' : undefined,
          height: isMobile ? '100dvh' : undefined,
          transform: isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-104%)') : 'none',
          opacity: isMobile ? 1 : (isOpen ? 1 : 0),
          overflow: 'hidden',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          transition: isMobile
            ? 'transform 0.24s cubic-bezier(0.22, 1, 0.36, 1)'
            : 'width 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.16s ease',
          pointerEvents: isOpen ? 'auto' : 'none',
          position: isMobile ? 'relative' : 'static',
          zIndex: isMobile ? 1 : 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            minHeight: '50px',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
            Documents
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={onCreate}
              title="New document"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '7px',
                border: '1px solid var(--border-default)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'var(--font-ui)',
                fontWeight: '500',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'var(--bg-hover)';
                el.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'transparent';
                el.style.color = 'var(--text-secondary)';
              }}
            >
              <IconPlus /> New
            </button>
            <button
              onClick={onClose}
              title="Close"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '30px',
                height: '30px',
                borderRadius: '7px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'var(--bg-hover)';
                el.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'transparent';
                el.style.color = 'var(--text-muted)';
              }}
            >
              <IconClose />
            </button>
          </div>
        </div>

        {/* Document list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {documents.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px', fontFamily: 'var(--font-ui)' }}>
              No documents yet
            </p>
          ) : (
            docMeta.map((doc) => {
              const isActive = doc.id === activeDocId;
              return (
                <div
                  key={doc.id}
                  style={{
                    borderRadius: '8px',
                    marginBottom: '2px',
                    background: isActive ? 'var(--bg-active)' : 'transparent',
                    border: `1px solid ${isActive ? 'var(--border-strong)' : 'transparent'}`,
                    transition: 'all 0.12s',
                    overflow: 'hidden',
                  }}
                >
                  {/* Main clickable area */}
                  <button
                    onClick={() => {
                      onOpen(doc.id);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      padding: '10px 12px 8px',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ paddingTop: '1px', color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>
                      <IconDoc />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '13px',
                        fontWeight: isActive ? '600' : '500',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-ui)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: '5px',
                      }}>
                        {doc.title || 'Untitled'}
                      </p>
                      <p style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        fontFamily: 'var(--font-ui)',
                        marginBottom: '6px',
                      }}>
                        {doc.wordCount} {doc.wordCount === 1 ? 'word' : 'words'} · Created {doc.createdLabel}
                      </p>
                      <p
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          fontFamily: 'var(--font-ui)',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {doc.preview}
                      </p>
                    </div>
                  </button>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '4px', padding: '0 8px 8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onExport(doc.id); }}
                      title="Export"
                      style={actionBtnStyle}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                    >
                      <IconDownload />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${doc.title || 'Untitled'}"?`)) {
                          onDelete(doc.id);
                        }
                      }}
                      title="Delete"
                      style={actionBtnStyle}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; }}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '18px',
          borderTop: '1px solid var(--border-default)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-ui)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'flex-start',
        }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>MyDoc</p>
          <p style={{ lineHeight: 1.45 }}>
            An open-source markdown based editor designed for simplicity. Everything is autosaved locally and never leaves your device.
          </p>
          <p style={{ lineHeight: 1, fontSize: '11px' }}>
            Developed by {' '}
            <a
              href="https://emjjkk.tech"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
            >
              @emjjkk
            </a>
          </p>
          <p style={{ lineHeight: 1, fontSize: '11px' }}>
            Github repo {' '}
            <a
              href="https://github.com/emjjkk/mydoc"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
            >
              emjjkk/mydoc
            </a>
          </p>
        </div>
      </div>
    </aside>
  );
}

const actionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '26px',
  height: '26px',
  borderRadius: '6px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  transition: 'all 0.12s',
};