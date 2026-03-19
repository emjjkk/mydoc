'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDocuments } from '@/hooks/useDocuments';
import { usePreferences } from '@/hooks/usePreferences';
import { Editor } from '@/components/Editor/Editor';
import { TopBar } from '@/components/TopBar';
import { Sidebar } from '@/components/Sidebar';
import { ExportModal } from '@/components/modals/ExportModal';
import { PreferencesModal } from '@/components/modals/PreferencesModal';
import { registerServiceWorker } from '@/lib/serviceWorkerRegistration';

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
    activeDocument,
    activeDocId,
    isLoaded,
    updateDocument,
    createDocument,
    openDocument,
    deleteDocument,
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
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

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
      updateDocument(id, { content });
    },
    400
  );

  const handleContentChange = useCallback(
    (markdown: string) => {
      if (!activeDocId) return;
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
        activeDocId={activeDocId}
        onClose={() => setSidebarOpen(false)}
        onOpen={openDocument}
        onCreate={() => {
          createDocument();
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
          onExport={handleExportDoc}
          onPreferences={() => setPrefsOpen(true)}
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

      <PreferencesModal
        isOpen={prefsOpen}
        preferences={preferences}
        onClose={() => setPrefsOpen(false)}
        onUpdate={updatePreferences}
      />
    </div>
  );
}
