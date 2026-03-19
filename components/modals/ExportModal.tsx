'use client';

import React, { useEffect, useRef } from 'react';
import { Document } from '@/hooks/useDocuments';
import { ParsedBlock, parseMarkdownToBlocks } from '@/lib/markdownTransform';
import {
  exportAsMarkdown,
  exportAsPdf,
  exportAsRtf,
  exportAsDocx,
} from '@/lib/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  document: Document | null;
  onClose: () => void;
}

interface ExportOption {
  id: string;
  format: string;
  description: string;
  ext: string;
  note?: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'docx',
    format: 'Word Document',
    description: 'Compatible with Microsoft Word and Google Docs',
    ext: 'DOCX',
    note: 'Requires docx package',
  },
  {
    id: 'pdf',
    format: 'PDF',
    description: 'Opens print dialog — save as PDF',
    ext: 'PDF',
  },
  {
    id: 'rtf',
    format: 'Rich Text Format',
    description: 'Compatible with most word processors',
    ext: 'RTF',
  },
  {
    id: 'md',
    format: 'Markdown',
    description: 'Raw markdown text file',
    ext: 'MD',
  },
];

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function ExportModal({ isOpen, document, onClose }: ExportModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !document) return null;

  async function handleExport(format: string) {
    if (!document) return;
    const blocks: ParsedBlock[] = parseMarkdownToBlocks(document.content);
    const title = document.title || 'Untitled';

    switch (format) {
      case 'md':
        exportAsMarkdown(title, document.content);
        break;
      case 'pdf':
        exportAsPdf(title, blocks);
        break;
      case 'rtf':
        exportAsRtf(title, blocks);
        break;
      case 'docx':
        await exportAsDocx(title, blocks);
        break;
    }
    onClose();
  }

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
          maxWidth: '420px',
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
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', marginBottom: '2px' }}>
              Export Document
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
              {document.title || 'Untitled'}
            </p>
          </div>
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

        {/* Export options */}
        <div style={{ padding: '12px' }}>
          {EXPORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleExport(opt.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 16px',
                borderRadius: '10px',
                border: '1px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.12s',
                marginBottom: '4px',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'var(--bg-hover)';
                el.style.borderColor = 'var(--border-default)';
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = 'transparent';
                el.style.borderColor = 'transparent';
              }}
            >
              {/* Badge */}
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'var(--bg-active)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: '700',
                fontFamily: 'var(--font-ui)',
                color: 'var(--accent)',
                letterSpacing: '0.05em',
                flexShrink: 0,
              }}>
                {opt.ext}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '2px',
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
                    {opt.format}
                  </span>
                  {opt.note && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', padding: '1px 6px', borderRadius: '100px', border: '1px solid var(--border-default)' }}>
                      {opt.note}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                  {opt.description}
                </p>
              </div>

              <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                <IconDownload />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}