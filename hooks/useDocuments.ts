'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Document {
  id: string;
  title: string;
  content: string; // Raw markdown string
  folderId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentFolder {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

interface DocumentsStore {
  documents: Document[];
  folders: DocumentFolder[];
}

const STORAGE_KEY = 'notes_documents';
const ACTIVE_DOC_KEY = 'notes_active_doc';

function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateFolderId(): string {
  return `folder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createBlankDocument(id?: string): Document {
  const now = Date.now();
  return {
    id: id ?? generateId(),
    title: 'Untitled',
    content: '',
    folderId: null,
    createdAt: now,
    updatedAt: now,
  };
}

function isValidTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeFolderName(name: string): string {
  const trimmed = name.trim();
  return trimmed || 'Untitled Folder';
}

function normalizeDocument(rawDoc: unknown): Document | null {
  if (!rawDoc || typeof rawDoc !== 'object') return null;

  const candidate = rawDoc as Partial<Document>;
  if (typeof candidate.id !== 'string') return null;

  const now = Date.now();
  return {
    id: candidate.id,
    title: typeof candidate.title === 'string' ? candidate.title : 'Untitled',
    content: typeof candidate.content === 'string' ? candidate.content : '',
    folderId: typeof candidate.folderId === 'string' ? candidate.folderId : null,
    createdAt: isValidTimestamp(candidate.createdAt) ? candidate.createdAt : now,
    updatedAt: isValidTimestamp(candidate.updatedAt) ? candidate.updatedAt : now,
  };
}

function normalizeFolder(rawFolder: unknown): DocumentFolder | null {
  if (!rawFolder || typeof rawFolder !== 'object') return null;

  const candidate = rawFolder as Partial<DocumentFolder>;
  if (typeof candidate.id !== 'string') return null;

  const now = Date.now();
  return {
    id: candidate.id,
    name: normalizeFolderName(typeof candidate.name === 'string' ? candidate.name : 'Untitled Folder'),
    createdAt: isValidTimestamp(candidate.createdAt) ? candidate.createdAt : now,
    updatedAt: isValidTimestamp(candidate.updatedAt) ? candidate.updatedAt : now,
  };
}

function loadStore(): DocumentsStore {
  if (typeof window === 'undefined') return { documents: [], folders: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { documents: [], folders: [] };
    }

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      const documents = parsed
        .map((doc) => normalizeDocument(doc))
        .filter((doc): doc is Document => doc !== null);
      return { documents, folders: [] };
    }

    if (parsed && typeof parsed === 'object') {
      const rawDocuments = Array.isArray((parsed as Partial<DocumentsStore>).documents)
        ? (parsed as Partial<DocumentsStore>).documents
        : [];
      const rawFolders = Array.isArray((parsed as Partial<DocumentsStore>).folders)
        ? (parsed as Partial<DocumentsStore>).folders
        : [];

      const folders = (rawFolders ?? [])
        .map((folder) => normalizeFolder(folder))
        .filter((folder): folder is DocumentFolder => folder !== null);
      const folderIds = new Set(folders.map((folder) => folder.id));

      const documents = (rawDocuments ?? [])
        .map((doc) => normalizeDocument(doc))
        .filter((doc): doc is Document => doc !== null)
        .map((doc) => ({
          ...doc,
          folderId: doc.folderId && folderIds.has(doc.folderId) ? doc.folderId : null,
        }));

      return { documents, folders };
    }

    return { documents: [], folders: [] };
  } catch {
    return { documents: [], folders: [] };
  }
}

function saveStore(store: DocumentsStore) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const store = loadStore();
    let docs = store.documents;
    const loadedFolders = store.folders;
    let activeId = loadActiveDocId();

    // If no docs exist, create a blank one
    if (docs.length === 0) {
      const blank = createBlankDocument();
      docs = [blank];
      activeId = blank.id;
      saveStore({ documents: docs, folders: loadedFolders });
    }

    // Validate activeId
    if (!activeId || !docs.find((d) => d.id === activeId)) {
      activeId = docs[0].id;
    }

    setDocuments(docs);
    setFolders(loadedFolders);
    setActiveDocId(activeId);
    saveActiveDocId(activeId);
    saveStore({ documents: docs, folders: loadedFolders });
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
        saveStore({ documents: next, folders });
        return next;
      });
    },
    [folders]
  );

  // Create a new blank document
  const createDocument = useCallback((folderId: string | null = null) => {
    const blank: Document = {
      ...createBlankDocument(),
      folderId: folderId && folders.some((folder) => folder.id === folderId) ? folderId : null,
    };
    setDocuments((prev) => {
      const next = [blank, ...prev];
      saveStore({ documents: next, folders });
      return next;
    });
    setActiveDocId(blank.id);
    saveActiveDocId(blank.id);
    return blank;
  }, [folders]);

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

        saveStore({ documents: next, folders });
        return next;
      });
    },
    [activeDocId, folders]
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
      saveStore({ documents: next, folders });
      setActiveDocId(copy.id);
      saveActiveDocId(copy.id);
      return next;
    });
  }, [folders]);

  const createFolder = useCallback((name: string) => {
    const now = Date.now();
    const nextFolder: DocumentFolder = {
      id: generateFolderId(),
      name: normalizeFolderName(name),
      createdAt: now,
      updatedAt: now,
    };

    setFolders((prev) => {
      const next = [...prev, nextFolder].sort((a, b) => a.name.localeCompare(b.name));
      saveStore({ documents, folders: next });
      return next;
    });

    return nextFolder;
  }, [documents]);

  const renameFolder = useCallback((id: string, name: string) => {
    const nextName = normalizeFolderName(name);

    setFolders((prev) => {
      const next = prev
        .map((folder) =>
          folder.id === id
            ? { ...folder, name: nextName, updatedAt: Date.now() }
            : folder
        )
        .sort((a, b) => a.name.localeCompare(b.name));
      saveStore({ documents, folders: next });
      return next;
    });
  }, [documents]);

  const deleteFolder = useCallback((id: string) => {
    setFolders((prevFolders) => {
      const nextFolders = prevFolders.filter((folder) => folder.id !== id);
      setDocuments((prevDocuments) => {
        const nextDocuments = prevDocuments.map((doc) =>
          doc.folderId === id ? { ...doc, folderId: null, updatedAt: Date.now() } : doc
        );
        saveStore({ documents: nextDocuments, folders: nextFolders });
        return nextDocuments;
      });
      return nextFolders;
    });
  }, []);

  const moveDocumentToFolder = useCallback((docId: string, folderId: string | null) => {
    setDocuments((prevDocuments) => {
      const resolvedFolderId = folderId && folders.some((folder) => folder.id === folderId)
        ? folderId
        : null;
      const nextDocuments = prevDocuments.map((doc) =>
        doc.id === docId ? { ...doc, folderId: resolvedFolderId, updatedAt: Date.now() } : doc
      );
      saveStore({ documents: nextDocuments, folders });
      return nextDocuments;
    });
  }, [folders]);

  return {
    documents,
    folders,
    activeDocument,
    activeDocId,
    isLoaded,
    updateDocument,
    createDocument,
    openDocument,
    deleteDocument,
    duplicateDocument,
    createFolder,
    renameFolder,
    deleteFolder,
    moveDocumentToFolder,
  };
}