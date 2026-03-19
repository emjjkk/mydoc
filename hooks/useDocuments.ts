'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Document {
  id: string;
  title: string;
  content: string; // Raw markdown string
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'notes_documents';
const ACTIVE_DOC_KEY = 'notes_active_doc';

function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createBlankDocument(id?: string): Document {
  const now = Date.now();
  return {
    id: id ?? generateId(),
    title: 'Untitled',
    content: '',
    createdAt: now,
    updatedAt: now,
  };
}

function loadDocuments(): Document[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return [];
  } catch {
    return [];
  }
}

function saveDocuments(docs: Document[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
  } catch (e) {
    console.error('Failed to save documents:', e);
  }
}

function loadActiveDocId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_DOC_KEY);
}

function saveActiveDocId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_DOC_KEY, id);
}

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    let docs = loadDocuments();
    let activeId = loadActiveDocId();

    // If no docs exist, create a blank one
    if (docs.length === 0) {
      const blank = createBlankDocument();
      docs = [blank];
      activeId = blank.id;
      saveDocuments(docs);
    }

    // Validate activeId
    if (!activeId || !docs.find((d) => d.id === activeId)) {
      activeId = docs[0].id;
    }

    setDocuments(docs);
    setActiveDocId(activeId);
    saveActiveDocId(activeId);
    setIsLoaded(true);
  }, []);

  const activeDocument = documents.find((d) => d.id === activeDocId) ?? null;

  // Update a document's content (auto-save)
  const updateDocument = useCallback(
    (id: string, updates: Partial<Omit<Document, 'id' | 'createdAt'>>) => {
      setDocuments((prev) => {
        const next = prev.map((doc) =>
          doc.id === id ? { ...doc, ...updates, updatedAt: Date.now() } : doc
        );
        saveDocuments(next);
        return next;
      });
    },
    []
  );

  // Create a new blank document
  const createDocument = useCallback(() => {
    const blank = createBlankDocument();
    setDocuments((prev) => {
      const next = [blank, ...prev];
      saveDocuments(next);
      return next;
    });
    setActiveDocId(blank.id);
    saveActiveDocId(blank.id);
    return blank;
  }, []);

  // Switch to a document
  const openDocument = useCallback((id: string) => {
    setActiveDocId(id);
    saveActiveDocId(id);
  }, []);

  // Delete a document
  const deleteDocument = useCallback(
    (id: string) => {
      setDocuments((prev) => {
        const next = prev.filter((d) => d.id !== id);

        // If deleting the active doc, switch to first remaining or create a new one
        if (id === activeDocId) {
          if (next.length > 0) {
            setActiveDocId(next[0].id);
            saveActiveDocId(next[0].id);
          } else {
            const blank = createBlankDocument();
            next.push(blank);
            setActiveDocId(blank.id);
            saveActiveDocId(blank.id);
          }
        }

        saveDocuments(next);
        return next;
      });
    },
    [activeDocId]
  );

  // Duplicate a document
  const duplicateDocument = useCallback((id: string) => {
    setDocuments((prev) => {
      const source = prev.find((d) => d.id === id);
      if (!source) return prev;
      const copy: Document = {
        ...source,
        id: generateId(),
        title: `${source.title} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const next = [copy, ...prev];
      saveDocuments(next);
      setActiveDocId(copy.id);
      saveActiveDocId(copy.id);
      return next;
    });
  }, []);

  return {
    documents,
    activeDocument,
    activeDocId,
    isLoaded,
    updateDocument,
    createDocument,
    openDocument,
    deleteDocument,
    duplicateDocument,
  };
}