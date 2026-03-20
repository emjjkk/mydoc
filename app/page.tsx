'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { usePreferences } from '@/hooks/usePreferences';
import { Editor } from '@/components/Editor/Editor';
import { TopBar } from '@/components/TopBar';
import { ExportModal } from '@/components/modals/ExportModal';
import { NewFolderModal } from '@/components/modals/NewFolderModal';
import { PreferencesModal } from '@/components/modals/PreferencesModal';
import { InstallPwaButton } from '@/components/InstallPwaButton';
import { registerServiceWorker } from '@/lib/serviceWorkerRegistration';
import { Sidebar } from '../components/Sidebar';

function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): T {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback(
    ((...args: Parameters<T>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    }) as T,
    [fn, delay]
  );
}

export default function NotesApp() {
  const {
    documents,
    folders,
    activeDocument,
    activeDocId,
    isLoaded,
    updateDocument,
    createDocument,
    openDocument,
    deleteDocument,
    createFolder,
    renameFolder,
    deleteFolder,
  } = useDocuments();

  const {
    preferences,
    isLoaded: prefsLoaded,
    updatePreferences,
    contentWidthPx,
    fontCss,
  } = usePreferences();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const savingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const update = () => setIsMobileViewport(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const debouncedSave = useDebouncedCallback(
    (id: string, content: string) => {
      setSavingStatus('saving');
      updateDocument(id, { content });
      // Mark as saved after save completes
      setSavingStatus('saved');
      if (savingTimeoutRef.current) clearTimeout(savingTimeoutRef.current);
      savingTimeoutRef.current = setTimeout(() => {
        setSavingStatus('idle');
      }, 1500);
    },
    400
  );

  const handleContentChange = useCallback(
    (markdown: string) => {
      if (!activeDocId) return;
      setSavingStatus('saving');
      debouncedSave(activeDocId, markdown);
    },
    [activeDocId, debouncedSave]
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      if (!activeDocId) return;
      updateDocument(activeDocId, { title });
    },
    [activeDocId, updateDocument]
  );

  const handleExportDoc = useCallback(() => {
    setExportOpen(true);
  }, []);

  const handleSidebarExport = useCallback(
    (id: string) => {
      openDocument(id);
      setExportOpen(true);
    },
    [openDocument]
  );

  if (!isLoaded || !prefsLoaded) {
    return (
      <div
        style={{
          height: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app)',
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: '2px solid var(--border-default)',
            borderTopColor: 'var(--accent)',
            animation: 'spin 0.7s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        background: 'var(--bg-app)',
      }}
    >
      <Sidebar
        isOpen={sidebarOpen}
        isMobile={isMobileViewport}
        documents={documents}
        folders={folders}
        activeDocId={activeDocId}
        onClose={() => setSidebarOpen(false)}
        onOpen={openDocument}
        onCreate={(folderId: string | null | undefined) => {
          createDocument(folderId ?? null);
        }}
        onCreateFolder={() => {
          setNewFolderOpen(true);
        }}
        onRenameFolder={(id: string) => {
          const folder = folders.find((item) => item.id === id);
          if (!folder) return;
          const name = window.prompt('Rename folder', folder.name);
          if (!name) return;
          renameFolder(id, name);
        }}
        onDeleteFolder={(id: string) => {
          const folder = folders.find((item) => item.id === id);
          if (!folder) return;
          const confirmed = window.confirm(
            `Delete folder "${folder.name}"? Documents in it will move to No Folder.`
          );
          if (!confirmed) return;
          deleteFolder(id);
        }}
        onDelete={deleteDocument}
        onExport={handleSidebarExport}
      />

      <div
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <TopBar
          title={activeDocument?.title ?? 'Untitled'}
          onTitleChange={handleTitleChange}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          isSidebarOpen={sidebarOpen}
          onExport={handleExportDoc}
          onPreferences={() => setPrefsOpen(true)}
          savingStatus={savingStatus}
        />

        {activeDocument && (
          <Editor
            docId={activeDocument.id}
            content={activeDocument.content}
            contentWidth={contentWidthPx}
            fontCss={fontCss}
            sidebarOffset={!isMobileViewport && sidebarOpen ? 300 : 0}
            onChange={handleContentChange}
          />
        )}
      </div>

      <ExportModal
        isOpen={exportOpen}
        document={activeDocument}
        onClose={() => setExportOpen(false)}
      />

      <NewFolderModal
        isOpen={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onSubmit={(name) => {
          createFolder(name);
          setNewFolderOpen(false);
        }}
      />

      <PreferencesModal
        isOpen={prefsOpen}
        preferences={preferences}
        onClose={() => setPrefsOpen(false)}
        onUpdate={updatePreferences}
      />

      <InstallPwaButton />
    </div>
  );
}
