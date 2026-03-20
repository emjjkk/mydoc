'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Document, DocumentFolder } from '@/hooks/useDocuments';

interface SidebarProps {
  isOpen: boolean;
  isMobile: boolean;
  documents: Document[];
  folders: DocumentFolder[];
  activeDocId: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  onCreate: (folderId?: string | null) => void;
  onCreateFolder: () => void;
  onRenameFolder: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
}

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconFilePlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="13" x2="12" y2="19" />
      <line x1="9" y1="16" x2="15" y2="16" />
    </svg>
  );
}

function IconFolderPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6l2 3h8a2 2 0 0 1 2 2z" />
      <line x1="12" y1="11" x2="12" y2="17" />
      <line x1="9" y1="14" x2="15" y2="14" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
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

function IconFolder() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6l2 3h8a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
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
  folders,
  activeDocId,
  onClose,
  onOpen,
  onCreate,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDelete,
  onExport,
}: SidebarProps) {
  const [view, setView] = useState<'folders' | 'docs'>('folders');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  const unfiledDocs = useMemo(
    () =>
      documents
        .filter((doc) => doc.folderId === null)
        .map((doc) => ({
          ...doc,
          preview: getPreviewText(doc.content) || 'No content yet.',
        })),
    [documents]
  );

  const folderRows = useMemo(() => {
    const rows = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      count: documents.filter((doc) => doc.folderId === folder.id).length,
    }));
    return rows;
  }, [documents, folders]);

  const selectedFolderName = selectedFolderId === null
    ? 'No Folder'
    : folders.find((folder) => folder.id === selectedFolderId)?.name ?? 'Folder';

  const selectedDocs = useMemo(() => {
    return documents
      .filter((doc) => doc.folderId === selectedFolderId)
      .map((doc) => ({
        ...doc,
        preview: getPreviewText(doc.content) || 'No content yet.',
      }));
  }, [documents, selectedFolderId]);

  useEffect(() => {
    if (!isOpen) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (view === 'docs') {
          setView('folders');
          return;
        }
        onClose();
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose, view]);

  useEffect(() => {
    if (selectedFolderId !== null && !folders.some((folder) => folder.id === selectedFolderId)) {
      setSelectedFolderId(null);
      setView('folders');
    }
  }, [folders, selectedFolderId]);

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
          {view === 'folders' ? (
            <>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
                My Docs
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => onCreate(null)} title="New document" style={headerBtnStyle}>
                  <IconFilePlus />
                </button>
                <button onClick={onCreateFolder} title="New folder" style={headerBtnStyle}>
                  <IconFolderPlus />
                </button>
                <button onClick={onClose} title="Close" style={headerBtnStyle}>
                  <IconClose />
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <button
                  onClick={() => setView('folders')}
                  title="Back to folders"
                  style={headerBtnStyle}
                >
                  <IconChevronLeft />
                </button>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedFolderName}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => onCreate(selectedFolderId)} title="New document" style={headerBtnStyle}>
                  <IconPlus />
                </button>
                <button onClick={onClose} title="Close" style={headerBtnStyle}>
                  <IconClose />
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {view === 'folders' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {folderRows.map((row) => (
                <div
                  key={row.id ?? 'unfiled'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    padding: '8px 10px',
                    background: 'transparent',
                  }}
                >
                  <button
                    onClick={() => {
                      setSelectedFolderId(row.id);
                      setView('docs');
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      minWidth: 0,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}><IconFolder /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.name}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
                        {row.count} {row.count === 1 ? 'document' : 'documents'}
                      </p>
                    </div>
                    <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}><IconChevronRight /></span>
                  </button>

                  {row.id !== null && (
                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button
                        style={tinyBtnStyle}
                        onClick={() => onRenameFolder(row.id as string)}
                        title={`Rename ${row.name}`}
                      >
                        <IconEdit />
                      </button>
                      <button
                        style={tinyBtnStyle}
                        onClick={() => onDeleteFolder(row.id as string)}
                        title={`Delete ${row.name}`}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {unfiledDocs.length > 0 && (
                <>
                  <p
                    style={{
                      marginTop: '12px',
                      marginBottom: '6px',
                      fontSize: '10px',
                      fontWeight: 800,
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-ui)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Unfiled Documents
                  </p>
                  {unfiledDocs.map((doc) => {
                    const isActive = doc.id === activeDocId;
                    return (
                      <div
                        key={doc.id}
                        style={{
                          borderRadius: '8px',
                          background: isActive ? 'var(--bg-active)' : 'transparent',
                          border: `1px solid ${isActive ? 'var(--border-strong)' : 'var(--border-default)'}`,
                          padding: '8px 9px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <button
                            onClick={() => onOpen(doc.id)}
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              minWidth: 0,
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>
                              <IconDoc />
                            </span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <p style={{ fontSize: '13px', fontWeight: isActive ? 600 : 500, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {doc.title || 'Untitled'}
                              </p>
                              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {doc.preview}
                              </p>
                            </div>
                          </button>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                            <button
                              onClick={(e) => { e.stopPropagation(); onExport(doc.id); }}
                              title="Export"
                              style={tinyBtnStyle}
                            >
                              <IconDownload />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete \"${doc.title || 'Untitled'}\"?`)) {
                                  onDelete(doc.id);
                                }
                              }}
                              title="Delete"
                              style={tinyBtnStyle}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {selectedDocs.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px', fontFamily: 'var(--font-ui)' }}>
                  No documents in this folder yet
                </p>
              ) : (
                selectedDocs.map((doc) => {
                  const isActive = doc.id === activeDocId;
                  return (
                    <div
                      key={doc.id}
                      style={{
                        borderRadius: '8px',
                        background: isActive ? 'var(--bg-active)' : 'transparent',
                        border: `1px solid ${isActive ? 'var(--border-strong)' : 'var(--border-default)'}`,
                        padding: '8px 9px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <button
                          onClick={() => onOpen(doc.id)}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            minWidth: 0,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }}>
                            <IconDoc />
                          </span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={{ fontSize: '13px', fontWeight: isActive ? 600 : 500, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.title || 'Untitled'}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {doc.preview}
                            </p>
                          </div>
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); onExport(doc.id); }}
                            title="Export"
                            style={tinyBtnStyle}
                          >
                            <IconDownload />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete \"${doc.title || 'Untitled'}\"?`)) {
                                onDelete(doc.id);
                              }
                            }}
                            title="Delete"
                            style={tinyBtnStyle}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
        <div style={{
          padding: '12px',
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

const headerBtnStyle: React.CSSProperties = {
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
};

const tinyBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  borderRadius: '6px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  transition: 'all 0.12s',
};
