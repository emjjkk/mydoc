'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FOLDER_COLOR_OPTIONS } from '@/hooks/useDocuments';

interface NewFolderModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialName?: string;
  initialColor?: string;
  onClose: () => void;
  onSubmit: (name: string, color: string) => void;
  onDelete?: () => void;
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function NewFolderModal({
  isOpen,
  mode,
  initialName = '',
  initialColor = FOLDER_COLOR_OPTIONS[0],
  onClose,
  onSubmit,
  onDelete,
}: NewFolderModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialName);
    setColor(initialColor);
    const timer = setTimeout(() => inputRef.current?.focus(), 10);
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handler);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handler);
    };
  }, [initialColor, initialName, isOpen, onClose]);

  if (!isOpen) return null;
  const hasName = name.trim().length > 0;

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
          onSubmit(normalized, color);
        }}
        style={{
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-default)',
          borderRadius: '12px',
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
              {mode === 'edit' ? 'Edit Folder' : 'New Folder'}
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
              {mode === 'edit'
                ? 'Update the folder name, color, or delete it.'
                : 'Choose a clear name and color for your document group.'}
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

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', marginBottom: '8px' }}>
              Folder Color
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {FOLDER_COLOR_OPTIONS.map((option) => {
                const selected = option === color;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setColor(option)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '34px',
                      borderRadius: '9px',
                      border: `1px solid ${selected ? option : 'var(--border-default)'}`,
                      background: selected ? `color-mix(in srgb, ${option} 18%, transparent)` : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ width: '14px', height: '14px', borderRadius: '999px', background: option, boxShadow: selected ? `0 0 0 3px color-mix(in srgb, ${option} 18%, transparent)` : 'none' }} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{
          padding: '0 20px 18px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          alignItems: 'center',
        }}>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              style={{
                ...secondaryBtnStyle,
                borderColor: 'rgba(239, 68, 68, 0.28)',
                color: '#ef4444',
                marginRight: 'auto',
              }}
            >
              Delete Folder
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={secondaryBtnStyle}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!hasName}
            style={{
              ...primaryBtnStyle,
              opacity: hasName ? 1 : 0.5,
              cursor: hasName ? 'pointer' : 'not-allowed',
            }}
          >
            {mode === 'edit' ? 'Save Changes' : 'Create Folder'}
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
