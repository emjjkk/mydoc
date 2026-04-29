'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Document {
  id: string;
  title: string;
  content: string; // Raw markdown string
  folderId: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentFolder {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

interface DocumentsStore {
  documents: Document[];
  folders: DocumentFolder[];
}

const STORAGE_KEY = 'notes_documents';
const ACTIVE_DOC_KEY = 'notes_active_doc';

export const FOLDER_COLOR_OPTIONS = [
  '#7c8cff',
  '#59b7ff',
  '#42c2a6',
  '#66c56f',
  '#f2b84b',
  '#ef7f68',
  '#d16ff2',
  '#9a94ff',
];

const DEFAULT_FOLDER_COLOR = FOLDER_COLOR_OPTIONS[0];

function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateFolderId(): string {
  return `folder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createBlankDocument(id?: string, sortOrder = 0): Document {
  const now = Date.now();
  return {
    id: id ?? generateId(),
    title: 'Untitled',
    content: '',
    folderId: null,
    sortOrder,
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

function normalizeFolderColor(color: unknown): string {
  return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color)
    ? color
    : DEFAULT_FOLDER_COLOR;
}

function normalizeSortOrder(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeDocument(rawDoc: unknown, fallbackOrder: number): Document | null {
  if (!rawDoc || typeof rawDoc !== 'object') return null;

  const candidate = rawDoc as Partial<Document>;
  if (typeof candidate.id !== 'string') return null;

  const now = Date.now();
  return {
    id: candidate.id,
    title: typeof candidate.title === 'string' ? candidate.title : 'Untitled',
    content: typeof candidate.content === 'string' ? candidate.content : '',
    folderId: typeof candidate.folderId === 'string' ? candidate.folderId : null,
    sortOrder: normalizeSortOrder((candidate as { sortOrder?: unknown }).sortOrder, fallbackOrder),
    createdAt: isValidTimestamp(candidate.createdAt) ? candidate.createdAt : now,
    updatedAt: isValidTimestamp(candidate.updatedAt) ? candidate.updatedAt : now,
  };
}

function normalizeFolder(rawFolder: unknown, fallbackOrder: number): DocumentFolder | null {
  if (!rawFolder || typeof rawFolder !== 'object') return null;

  const candidate = rawFolder as Partial<DocumentFolder>;
  if (typeof candidate.id !== 'string') return null;

  const now = Date.now();
  return {
    id: candidate.id,
    name: normalizeFolderName(typeof candidate.name === 'string' ? candidate.name : 'Untitled Folder'),
    color: normalizeFolderColor((candidate as { color?: unknown }).color),
    sortOrder: normalizeSortOrder((candidate as { sortOrder?: unknown }).sortOrder, fallbackOrder),
    createdAt: isValidTimestamp(candidate.createdAt) ? candidate.createdAt : now,
    updatedAt: isValidTimestamp(candidate.updatedAt) ? candidate.updatedAt : now,
  };
}

function compareSortOrder<T extends { sortOrder: number; createdAt: number; id: string }>(a: T, b: T) {
  return a.sortOrder - b.sortOrder || a.createdAt - b.createdAt || a.id.localeCompare(b.id);
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
        .map((doc, index) => normalizeDocument(doc, index))
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
        .map((folder, index) => normalizeFolder(folder, index))
        .filter((folder): folder is DocumentFolder => folder !== null);
      const folderIds = new Set(folders.map((folder) => folder.id));

      const documents = (rawDocuments ?? [])
        .map((doc, index) => normalizeDocument(doc, index))
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
    const nextSortOrder = documents.filter((doc) => doc.folderId === folderId).reduce((max, doc) => Math.max(max, doc.sortOrder), -1) + 1;
    const blank: Document = {
      ...createBlankDocument(undefined, nextSortOrder),
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
        sortOrder: source.sortOrder + 1,
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

  const createFolder = useCallback((name: string, color: string = DEFAULT_FOLDER_COLOR) => {
    const now = Date.now();
    const nextFolder: DocumentFolder = {
      id: generateFolderId(),
      name: normalizeFolderName(name),
      color: normalizeFolderColor(color),
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    };

    setFolders((prev) => {
      const next = prev.map((folder) => ({ ...folder, sortOrder: folder.sortOrder + 1 }));
      next.unshift(nextFolder);
      saveStore({ documents, folders: next });
      return next;
    });

    return nextFolder;
  }, [documents]);

  const renameFolder = useCallback((id: string, name: string) => {
    const nextName = normalizeFolderName(name);

    setFolders((prev) => {
      const next = prev.map((folder) => (
        folder.id === id
          ? { ...folder, name: nextName, updatedAt: Date.now() }
          : folder
      ));
      saveStore({ documents, folders: next });
      return next;
    });
  }, [documents]);

  const updateFolder = useCallback((id: string, updates: { name?: string; color?: string }) => {
    setFolders((prev) => {
      const next = prev.map((folder) => {
        if (folder.id !== id) return folder;
        return {
          ...folder,
          name: updates.name !== undefined ? normalizeFolderName(updates.name) : folder.name,
          color: updates.color !== undefined ? normalizeFolderColor(updates.color) : folder.color,
          updatedAt: Date.now(),
        };
      });
      saveStore({ documents, folders: next });
      return next;
    });
  }, [documents]);

  const reorderFolders = useCallback((folderId: string, beforeFolderId: string | null) => {
    setFolders((prev) => {
      const ordered = [...prev].sort(compareSortOrder);
      const sourceIndex = ordered.findIndex((folder) => folder.id === folderId);
      if (sourceIndex < 0) return prev;

      const [moving] = ordered.splice(sourceIndex, 1);
      const targetIndex = beforeFolderId ? ordered.findIndex((folder) => folder.id === beforeFolderId) : ordered.length;
      ordered.splice(targetIndex < 0 ? ordered.length : targetIndex, 0, moving);

      const next = ordered.map((folder, index) => ({ ...folder, sortOrder: index }));
      saveStore({ documents, folders: next });
      return next;
    });
  }, [documents]);

  const reorderDocuments = useCallback((docId: string, targetFolderId: string | null, beforeDocId?: string | null) => {
    setDocuments((prev) => {
      const sourceDoc = prev.find((doc) => doc.id === docId);
      if (!sourceDoc) return prev;

      const resolvedTargetFolderId = targetFolderId && folders.some((folder) => folder.id === targetFolderId)
        ? targetFolderId
        : null;
      const sourceFolderId = sourceDoc.folderId;
      const sameBucket = sourceFolderId === resolvedTargetFolderId;
      const remaining = prev.filter((doc) => doc.id !== docId);

      const buildBucket = (folderId: string | null) =>
        remaining
          .filter((doc) => doc.folderId === folderId)
          .sort(compareSortOrder);

      const sourceBucket = sameBucket ? [] : buildBucket(sourceFolderId);
      const targetBucket = buildBucket(resolvedTargetFolderId);
      const movingDoc = {
        ...sourceDoc,
        folderId: resolvedTargetFolderId,
        updatedAt: Date.now(),
      };

      const insertIndex = beforeDocId
        ? targetBucket.findIndex((doc) => doc.id === beforeDocId)
        : -1;
      targetBucket.splice(insertIndex >= 0 ? insertIndex : targetBucket.length, 0, movingDoc);

      const sourceOrder = new Map(sourceBucket.map((doc, index) => [doc.id, index]));
      const targetOrder = new Map(targetBucket.map((doc, index) => [doc.id, index]));

      const next = prev.map((doc) => {
        if (doc.id === docId) {
          return {
            ...doc,
            folderId: resolvedTargetFolderId,
            sortOrder: targetOrder.get(docId) ?? doc.sortOrder,
            updatedAt: Date.now(),
          };
        }

        if (!sameBucket && doc.folderId === sourceFolderId) {
          return {
            ...doc,
            sortOrder: sourceOrder.get(doc.id) ?? doc.sortOrder,
          };
        }

        if (doc.folderId === resolvedTargetFolderId) {
          return {
            ...doc,
            sortOrder: targetOrder.get(doc.id) ?? doc.sortOrder,
          };
        }

        return doc;
      });

      saveStore({ documents: next, folders });
      return next;
    });
  }, [folders]);

  const deleteFolder = useCallback((id: string) => {
    setFolders((prevFolders) => {
      const nextFolders = prevFolders.filter((folder) => folder.id !== id);
      setDocuments((prevDocuments) => {
        const remainingUnfiled = prevDocuments.filter((doc) => doc.folderId === null);
        const movedDocs = prevDocuments.filter((doc) => doc.folderId === id)
          .sort(compareSortOrder)
          .map((doc, index) => ({
            ...doc,
            folderId: null,
            sortOrder: remainingUnfiled.reduce((max, item) => Math.max(max, item.sortOrder), -1) + index + 1,
            updatedAt: Date.now(),
          }));
        const nextDocuments = prevDocuments.map((doc) =>
          doc.folderId === id ? movedDocs.shift() ?? { ...doc, folderId: null, updatedAt: Date.now() } : doc
        );
        saveStore({ documents: nextDocuments, folders: nextFolders });
        return nextDocuments;
      });
      return nextFolders;
    });
  }, []);

  const moveDocumentToFolder = useCallback((docId: string, folderId: string | null) => {
    reorderDocuments(docId, folderId, null);
  }, [reorderDocuments]);

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
    updateFolder,
    reorderFolders,
    reorderDocuments,
    deleteFolder,
    moveDocumentToFolder,
  };
}