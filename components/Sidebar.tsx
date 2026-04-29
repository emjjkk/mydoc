'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { GrDocumentImage } from 'react-icons/gr';
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
  onEditFolder: (id: string) => void;
  onReorderFolders: (folderId: string, beforeFolderId: string | null) => void;
  onReorderDocuments: (docId: string, targetFolderId: string | null, beforeDocId?: string | null) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
}

type DragItem = {
  kind: 'folder' | 'document';
  id: string;
  folderId?: string | null;
};

type DropTarget = {
  kind: 'folders' | 'documents';
  folderId: string | null;
  beforeId: string | null;
};

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

function getPreviewLines(content: string): string[] {
  const rawLines = content.split(/\r?\n/);
  const lines: string[] = [];

  for (const rawLine of rawLines) {
    const cleaned = rawLine
      .replace(/```.*$/g, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[#>*_`~\-|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) continue;
    lines.push(cleaned);
    if (lines.length === 3) break;
  }

  return lines.length > 0 ? lines : ['No content yet.'];
}

function getFileSize(content: string): string {
  const bytes = new TextEncoder().encode(content).length;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function getCardSurface(active: boolean, accent?: string): React.CSSProperties {
  return {
    borderRadius: '6px',
    border: 'none',
    background: active
      ? accent
        ? `color-mix(in srgb, ${accent} 12%, var(--foreground) 88%)`
        : 'var(--bg-active)'
      : 'color-mix(in srgb, var(--bg-sidebar) 82%, gray 4%)',
    boxShadow: 'none',
  };
}

function DocumentCard({
  doc,
  isActive,
  isDragging,
  onOpen,
  onDelete,
  onExport,
  onDragStart,
  onDragEnd,
}: {
  doc: Document;
  isActive: boolean;
  isDragging: boolean;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string) => void;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, doc: Document) => void;
  onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(event) => onDragStart(event, doc)}
      onDragEnd={onDragEnd}
      style={{
        ...getCardSurface(isActive),
        padding: '10px 11px',
        cursor: 'grab',
        opacity: isDragging ? 0.55 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
        <button
          onClick={() => onOpen(doc.id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: isActive ? 600 : 500, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {doc.title || 'Untitled'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
            {getPreviewLines(doc.content).slice(0, 3).map((line, index) => (
              <p
                key={`${index}-${line}`}
                style={{
                  fontSize: '11px',
                  lineHeight: '1.4',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-ui)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {line}
              </p>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
            <span>Last edited {formatRelativeTime(doc.updatedAt)}</span>
            <span>{getFileSize(doc.content)}</span>
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
  onEditFolder,
  onReorderFolders,
  onReorderDocuments,
  onDelete,
  onExport,
}: SidebarProps) {
  const [view, setView] = useState<'folders' | 'docs'>('folders');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const orderedFolders = useMemo(
    () => [...folders].sort((a, b) => a.sortOrder - b.sortOrder),
    [folders]
  );

  const orderedDocuments = useMemo(
    () => [...documents].sort((a, b) => a.sortOrder - b.sortOrder),
    [documents]
  );

  const unfiledDocs = useMemo(
    () => orderedDocuments.filter((doc) => doc.folderId === null),
    [orderedDocuments]
  );

  const folderRows = useMemo(
    () => orderedFolders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      color: folder.color,
    })),
    [orderedFolders]
  );

  const selectedFolder = selectedFolderId === null
    ? null
    : folders.find((folder) => folder.id === selectedFolderId) ?? null;

  const selectedFolderName = selectedFolderId === null
    ? 'No Folder'
    : selectedFolder?.name ?? 'Folder';

  const selectedDocs = useMemo(() => {
    return orderedDocuments.filter((doc) => doc.folderId === selectedFolderId);
  }, [orderedDocuments, selectedFolderId]);

  const clearDrag = () => setDragItem(null);

  const clearDropTarget = () => setDropTarget(null);

  const handleFolderDragStart = (event: React.DragEvent<HTMLDivElement>, folderId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', folderId);
    setDragItem({ kind: 'folder', id: folderId });
    setDropTarget({ kind: 'folders', folderId: null, beforeId: folderId });
  };

  const handleDocumentDragStart = (event: React.DragEvent<HTMLDivElement>, doc: Document) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', doc.id);
    setDragItem({ kind: 'document', id: doc.id, folderId: doc.folderId });
    setDropTarget({ kind: 'documents', folderId: doc.folderId, beforeId: doc.id });
  };

  const handleFolderDrop = (targetFolderId: string | null, beforeFolderId: string | null) => {
    if (!dragItem) return;
    if (dragItem.kind === 'folder') {
      onReorderFolders(dragItem.id, beforeFolderId);
    }
    if (dragItem.kind === 'document') {
      onReorderDocuments(dragItem.id, targetFolderId, null);
    }
    clearDrag();
    clearDropTarget();
  };

  const handleDocumentDrop = (targetFolderId: string | null, beforeDocId: string | null) => {
    if (!dragItem || dragItem.kind !== 'document') return;
    onReorderDocuments(dragItem.id, targetFolderId, beforeDocId);
    clearDrag();
    clearDropTarget();
  };

  const handleDragOverTarget = (event: React.DragEvent<HTMLElement>, kind: 'folders' | 'documents', folderId: string | null, nextId: string | null) => {
    event.preventDefault();
    if (!dragItem) return;
    const beforeId = event.clientY < event.currentTarget.getBoundingClientRect().top + event.currentTarget.getBoundingClientRect().height / 2
      ? (event.currentTarget.dataset.itemId ?? null)
      : nextId;
    setDropTarget({ kind, folderId, beforeId });
  };

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


  useEffect(() => {
    clearDropTarget();
  }, [view, selectedFolderId]);

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
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
                <GrDocumentImage /> MyDoc
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => onCreate(null)} title="New document" style={headerBtnStyle}>
                  <IconFilePlus />
                </button>
                <button onClick={onCreateFolder} title="New folder" style={headerBtnStyle}>
                  <IconFolderPlus />
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
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleFolderDrop(null, null);
              }}
            >
              {folderRows.map((row, index) => {
                const nextFolderId = folderRows[index + 1]?.id ?? null;
                const isDropBefore = dropTarget?.kind === 'folders' && dropTarget.beforeId === row.id;
                return (
                <React.Fragment key={row.id}>
                  {isDropBefore && dragItem && (
                    <div
                      style={dropMarkerStyle}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDropTarget({ kind: 'folders', folderId: null, beforeId: row.id });
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        handleFolderDrop(row.id, row.id);
                      }}
                    />
                  )}
                  <div
                    data-item-id={row.id}
                    draggable
                    onDragStart={(event) => handleFolderDragStart(event, row.id)}
                    onDragEnd={() => {
                      clearDrag();
                      clearDropTarget();
                    }}
                    onDragOver={(event) => handleDragOverTarget(event, 'folders', null, nextFolderId)}
                    onDrop={(event) => {
                      event.preventDefault();
                      handleFolderDrop(row.id, dropTarget?.beforeId ?? nextFolderId);
                    }}
                    style={{
                      position: 'relative',
                      padding: '0',
                      opacity: dragItem?.kind === 'folder' && dragItem.id === row.id ? 0.55 : 1,
                      cursor: 'grab',
                    }}
                  >
                  <button
                    onClick={() => {
                      setSelectedFolderId(row.id);
                      setView('docs');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      minWidth: 0,
                      width: '100%',
                      padding: '10px 12px',
                      paddingRight: '44px',
                      border: 'none',
                      borderRadius: '6px',
                      background: 'color-mix(in srgb, var(--bg-sidebar) 82%, gray 4%)',
                      boxShadow: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ color: row.color, flexShrink: 0 }}><IconFolder /></span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.name}
                      </p>
                    </div>
                  </button>

                  <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                    <button
                      type="button"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        color: row.color,
                        cursor: 'pointer',
                      }}
                      onClick={() => onEditFolder(row.id)}
                      title={`Edit ${row.name}`}
                    >
                      <IconEdit />
                    </button>
                  </div>
                  </div>
                </React.Fragment>
              );})}

              {dropTarget?.kind === 'folders' && dropTarget.beforeId === null && dragItem && (
                <div
                  style={dropMarkerStyle}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleFolderDrop(null, null);
                  }}
                />
              )}

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
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragItem?.kind === 'document') {
                        onReorderDocuments(dragItem.id, null, null);
                        clearDrag();
                        clearDropTarget();
                      }
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                  >
                    {unfiledDocs.map((doc, index) => {
                      const nextDocId = unfiledDocs[index + 1]?.id ?? null;
                      const isDropBefore = dropTarget?.kind === 'documents' && dropTarget.folderId === null && dropTarget.beforeId === doc.id;
                      return (
                        <React.Fragment key={doc.id}>
                          {isDropBefore && dragItem && (
                            <div
                              style={dropMarkerStyle}
                              onDragOver={(event) => {
                                event.preventDefault();
                                setDropTarget({ kind: 'documents', folderId: null, beforeId: doc.id });
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                handleDocumentDrop(null, doc.id);
                              }}
                            />
                          )}
                          <div
                            data-item-id={doc.id}
                            onDragOver={(event) => handleDragOverTarget(event, 'documents', null, nextDocId)}
                            onDrop={(event) => {
                              event.preventDefault();
                              handleDocumentDrop(null, dropTarget?.beforeId ?? nextDocId);
                            }}
                          >
                            <DocumentCard
                              doc={doc}
                              isActive={doc.id === activeDocId}
                              isDragging={dragItem?.kind === 'document' && dragItem.id === doc.id}
                              onOpen={onOpen}
                              onDelete={onDelete}
                              onExport={onExport}
                              onDragStart={handleDocumentDragStart}
                              onDragEnd={() => {
                                clearDrag();
                                clearDropTarget();
                              }}
                            />
                          </div>
                        </React.Fragment>
                      );
                    })}
                    {dropTarget?.kind === 'documents' && dropTarget.folderId === null && dropTarget.beforeId === null && dragItem && (
                      <div
                        style={dropMarkerStyle}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          handleDocumentDrop(null, null);
                        }}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                if (dragItem?.kind === 'document' && selectedFolderId !== null) {
                  onReorderDocuments(dragItem.id, selectedFolderId, null);
                  clearDrag();
                  clearDropTarget();
                }
              }}
            >
              {selectedDocs.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px', fontFamily: 'var(--font-ui)' }}>
                  No documents in this folder yet
                </p>
              ) : (
                <>
                  {selectedDocs.map((doc, index) => {
                    const nextDocId = selectedDocs[index + 1]?.id ?? null;
                    const isDropBefore = dropTarget?.kind === 'documents' && dropTarget.folderId === selectedFolderId && dropTarget.beforeId === doc.id;
                    return (
                      <React.Fragment key={doc.id}>
                        {isDropBefore && dragItem && (
                          <div
                            style={dropMarkerStyle}
                            onDragOver={(event) => {
                              event.preventDefault();
                              setDropTarget({ kind: 'documents', folderId: selectedFolderId, beforeId: doc.id });
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              handleDocumentDrop(selectedFolderId, doc.id);
                            }}
                          />
                        )}
                        <div
                          data-item-id={doc.id}
                          onDragOver={(event) => handleDragOverTarget(event, 'documents', selectedFolderId, nextDocId)}
                          onDrop={(event) => {
                            event.preventDefault();
                            handleDocumentDrop(selectedFolderId, dropTarget?.beforeId ?? nextDocId);
                          }}
                        >
                          <DocumentCard
                            doc={doc}
                            isActive={doc.id === activeDocId}
                            isDragging={dragItem?.kind === 'document' && dragItem.id === doc.id}
                            onOpen={onOpen}
                            onDelete={onDelete}
                            onExport={onExport}
                            onDragStart={handleDocumentDragStart}
                            onDragEnd={() => {
                              clearDrag();
                              clearDropTarget();
                            }}
                          />
                        </div>
                      </React.Fragment>
                    );
                  })}
                  {dropTarget?.kind === 'documents' && dropTarget.folderId === selectedFolderId && dropTarget.beforeId === null && dragItem && (
                    <div
                      style={dropMarkerStyle}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        handleDocumentDrop(selectedFolderId, null);
                      }}
                    />
                  )}
                </>
              )}
            </div>
          )}
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

const dropMarkerStyle: React.CSSProperties = {
  height: '10px',
  borderRadius: '999px',
  margin: '2px 0',
  background: 'color-mix(in srgb, var(--accent) 26%, transparent)',
  border: '1px solid color-mix(in srgb, var(--accent) 40%, transparent)',
};
