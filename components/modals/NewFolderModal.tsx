'use client';

import React, { useEffect, useRef, useState } from 'react';

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function NewFolderModal({ isOpen, onClose, onSubmit }: NewFolderModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    const timer = setTimeout(() => inputRef.current?.focus(), 10);
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handler);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handler);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const normalized = name.trim();
          if (!normalized) return;
          onSubmit(normalized);
        }}
        style={{
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-default)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-modal)',
          width: '100%',
          maxWidth: '420px',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--border-default)',
        }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', marginBottom: '2px' }}>
              New Folder
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
              Choose a clear name for your document group
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '32px', height: '32px', borderRadius: '8px',
              border: 'none', background: 'transparent',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            <IconX />
          </button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', marginBottom: '6px' }}>
            Folder Name
          </label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Work, Journal, Ideas"
            maxLength={80}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-editor)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        <div style={{
          padding: '0 20px 18px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
        }}>
          <button
            type="button"
            onClick={onClose}
            style={secondaryBtnStyle}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              ...primaryBtnStyle,
              opacity: name.trim() ? 1 : 0.5,
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Create Folder
          </button>
        </div>
      </form>
    </div>
  );
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--accent)',
  background: 'var(--accent)',
  color: 'white',
  fontFamily: 'var(--font-ui)',
  fontSize: '12px',
  fontWeight: 600,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--border-default)',
  background: 'transparent',
  color: 'var(--text-secondary)',
  fontFamily: 'var(--font-ui)',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
};
