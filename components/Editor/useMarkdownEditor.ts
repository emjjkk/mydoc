'use client';

import { useState, useCallback, useRef } from 'react';
import {
  BlockType,
  ParsedBlock,
  detectBlockType,
  parseMarkdownToBlocks,
  blocksToMarkdown,
} from '@/lib/markdownTransform';

// blocksToMarkdown is used in syncToMarkdown

let idCounter = 0;
function newId() {
  return `b_${Date.now()}_${idCounter++}`;
}

function createBlock(type: BlockType = 'p', text = ''): ParsedBlock {
  return { id: newId(), type, text, raw: '', language: undefined };
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong><em>([\s\S]*?)<\/em><\/strong>/gi, '***$1***')
    .replace(/<em><strong>([\s\S]*?)<\/strong><\/em>/gi, '***$1***')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<del>([\s\S]*?)<\/del>/gi, '~~$1~~')
    .replace(/<s>([\s\S]*?)<\/s>/gi, '~~$1~~')
    .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"');
}

export function useMarkdownEditor(
  initialContent: string,
  onChange: (markdown: string) => void
) {
  const [blocks, setBlocks] = useState<ParsedBlock[]>(() => {
    const parsed = parseMarkdownToBlocks(initialContent);
    return parsed.length > 0 ? parsed : [createBlock('h1')];
  });
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const blockRefs = useRef<Map<string, HTMLElement>>(new Map());
  const undoStackRef = useRef<ParsedBlock[][]>([]);
  const redoStackRef = useRef<ParsedBlock[][]>([]);
  const isApplyingHistoryRef = useRef(false);
  const savedSelectionRef = useRef<Range | null>(null);

  const cloneBlocks = useCallback((items: ParsedBlock[]) => items.map((b) => ({ ...b })), []);

  const syncToMarkdown = useCallback(
    (updated: ParsedBlock[]) => {
      onChange(blocksToMarkdown(updated));
    },
    [onChange]
  );

  const applyBlocksChange = useCallback(
    (updater: (prev: ParsedBlock[]) => ParsedBlock[]) => {
      setBlocks((prev) => {
        const next = updater(prev);
        if (next === prev) return prev;
        if (!isApplyingHistoryRef.current) {
          undoStackRef.current.push(cloneBlocks(prev));
          if (undoStackRef.current.length > 200) undoStackRef.current.shift();
          redoStackRef.current = [];
        }
        syncToMarkdown(next);
        return next;
      });
    },
    [cloneBlocks, syncToMarkdown]
  );

  const registerRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) blockRefs.current.set(id, el);
    else blockRefs.current.delete(id);
  }, []);

  const getBlockIdFromRange = useCallback((range: Range): string | null => {
    let container = range.commonAncestorContainer as Node;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode as Node;
    }
    const el = container instanceof HTMLElement ? container : container.parentElement;
    if (!el) return null;
    const blockEl = el.closest('[data-block-id]') as HTMLElement | null;
    return blockEl?.getAttribute('data-block-id') ?? null;
  }, []);

  const saveCurrentSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      savedSelectionRef.current = null;
      return;
    }
    const range = sel.getRangeAt(0);
    if (!getBlockIdFromRange(range)) {
      savedSelectionRef.current = null;
      return;
    }
    savedSelectionRef.current = range.cloneRange();
  }, [getBlockIdFromRange]);

  const restoreCurrentSelection = useCallback(() => {
    if (!savedSelectionRef.current) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(savedSelectionRef.current);
  }, []);

  const getSelectedBlockId = useCallback((): string | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    return getBlockIdFromRange(sel.getRangeAt(0));
  }, [getBlockIdFromRange]);

  /**
   * Focus a block by id or index, optionally at end or start of content.
   */
  const focusBlock = useCallback(
    (idOrIndex: string | number, atEnd = true) => {
      // We need access to current blocks from closure - use a ref trick
      const doFocus = (bl: ParsedBlock[]) => {
        let el: HTMLElement | undefined;
        if (typeof idOrIndex === 'number') {
          const b = bl[idOrIndex];
          if (b) el = blockRefs.current.get(b.id);
        } else {
          el = blockRefs.current.get(idOrIndex);
        }
        if (!el) return;
        el.focus();
        try {
          const range = document.createRange();
          const sel = window.getSelection();
          if (!sel) return;
          if (atEnd) {
            range.selectNodeContents(el);
            range.collapse(false);
          } else {
            range.setStart(el, 0);
            range.collapse(true);
          }
          sel.removeAllRanges();
          sel.addRange(range);
        } catch {
          // ignore range errors
        }
      };
      // Use requestAnimationFrame to allow React to render first
      requestAnimationFrame(() => {
        setBlocks((bl) => {
          doFocus(bl);
          return bl;
        });
      });
    },
    []
  );

  // ── Enter: split block ───────────────────────────────────────────────────
  const handleEnter = useCallback(
    (blockId: string, currentText: string, caretOffset: number) => {
      applyBlocksChange((prev) => {
        const idx = prev.findIndex((b) => b.id === blockId);
        if (idx === -1) return prev;
        const current = prev[idx];
        const splitAt = Math.max(0, Math.min(caretOffset, currentText.length));
        const beforeText = currentText.slice(0, splitAt);
        const afterText = currentText.slice(splitAt);
        const newBlock = createBlock('p', afterText);
        // Continue list type if there's content before caret
        if ((current.type === 'ul' || current.type === 'ol') && beforeText.trim()) {
          newBlock.type = current.type;
        }
        const updatedCurrent: ParsedBlock = { ...current, text: beforeText, raw: beforeText };
        const updated = [
          ...prev.slice(0, idx),
          updatedCurrent,
          newBlock,
          ...prev.slice(idx + 1),
        ];
        requestAnimationFrame(() => {
          const el = blockRefs.current.get(newBlock.id);
          if (el) {
            el.focus();
            try {
              const range = document.createRange();
              const sel = window.getSelection();
              range.setStart(el, 0);
              range.collapse(true);
              sel?.removeAllRanges();
              sel?.addRange(range);
            } catch { /* ignore */ }
          }
        });
        return updated;
      });
    },
    [applyBlocksChange]
  );

  // ── Text change: detect markdown prefix transforms ───────────────────────
  const handleTextChange = useCallback(
    (blockId: string, rawText: string) => {
      applyBlocksChange((prev) => {
        const idx = prev.findIndex((b) => b.id === blockId);
        if (idx === -1) return prev;

        const detected = detectBlockType(rawText);
        if (detected && detected.type !== 'p') {
          const updated = prev.map((b, i) =>
            i === idx
              ? { ...b, type: detected.type, text: detected.text, raw: rawText, language: detected.language }
              : b
          );
          requestAnimationFrame(() => {
            const el = blockRefs.current.get(blockId);
            if (el) {
              el.textContent = detected.text;
              try {
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(el);
                range.collapse(false);
                sel?.removeAllRanges();
                sel?.addRange(range);
              } catch { /* ignore */ }
            }
          });
          return updated;
        }
        return prev.map((b, i) =>
          i === idx ? { ...b, text: rawText, raw: rawText } : b
        );
      });
    },
    [applyBlocksChange]
  );

  // ── Backspace on empty block ─────────────────────────────────────────────
  const handleBackspaceOnEmpty = useCallback(
    (blockId: string) => {
      applyBlocksChange((prev) => {
        const idx = prev.findIndex((b) => b.id === blockId);
        if (idx === -1) return prev;
        const block = prev[idx];
        // Revert to paragraph if typed block
        if (block.type !== 'p') {
          return prev.map((b, i) =>
            i === idx ? { ...b, type: 'p' as BlockType, text: '', raw: '', language: undefined } : b
          );
        }
        // Don't delete last block
        if (prev.length === 1) return prev;
        const updated = prev.filter((_, i) => i !== idx);
        const prevIdx = Math.max(0, idx - 1);
        const prevBlock = updated[prevIdx];
        requestAnimationFrame(() => {
          const el = prevBlock ? blockRefs.current.get(prevBlock.id) : undefined;
          if (el) {
            el.focus();
            try {
              const range = document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(el);
              range.collapse(false);
              sel?.removeAllRanges();
              sel?.addRange(range);
            } catch { /* ignore */ }
          }
        });
        return updated;
      });
    },
    [applyBlocksChange]
  );

  // ── Arrow navigation ─────────────────────────────────────────────────────
  const handleArrowNavigation = useCallback(
    (blockId: string, direction: 'up' | 'down') => {
      setBlocks((prev) => {
        const idx = prev.findIndex((b) => b.id === blockId);
        if (idx === -1) return prev;
        let targetId: string | undefined;
        if (direction === 'up' && idx > 0) targetId = prev[idx - 1].id;
        if (direction === 'down' && idx < prev.length - 1) targetId = prev[idx + 1].id;
        if (targetId) {
          requestAnimationFrame(() => {
            const el = blockRefs.current.get(targetId!);
            if (el) {
              el.focus();
              try {
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(el);
                range.collapse(direction === 'down');
                sel?.removeAllRanges();
                sel?.addRange(range);
              } catch { /* ignore */ }
            }
          });
        }
        return prev;
      });
    },
    []
  );

  // ── Image paste ───────────────────────────────────────────────────────────
  const handleImagePaste = useCallback(
    (blockId: string, file: File): boolean => {
      if (!file.type.startsWith('image/')) return false;
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) return;
        const imageBlock: ParsedBlock = {
          id: newId(),
          type: 'p',
          text: `![Pasted image](${dataUrl})`,
          raw: `![Pasted image](${dataUrl})`,
        };
        applyBlocksChange((prev) => {
          const idx = prev.findIndex((b) => b.id === blockId);
          const updated = [
            ...prev.slice(0, idx + 1),
            imageBlock,
            ...prev.slice(idx + 1),
          ];
          requestAnimationFrame(() => {
            const el = blockRefs.current.get(imageBlock.id);
            el?.focus();
          });
          return updated;
        });
      };
      reader.readAsDataURL(file);
      return true;
    },
    [applyBlocksChange]
  );

  // ── Markdown paste ────────────────────────────────────────────────────────
  const handleMarkdownPaste = useCallback(
    (blockId: string, markdownText: string): boolean => {
      const pastedBlocks = parseMarkdownToBlocks(markdownText).map((b) => ({
        ...b,
        id: newId(),
      }));
      if (pastedBlocks.length === 0) return false;
      applyBlocksChange((prev) => {
        const idx = prev.findIndex((b) => b.id === blockId);
        if (idx === -1) return prev;
        const target = prev[idx];
        const shouldReplaceTarget =
          !target.text.trim() && (target.type === 'p' || target.type === 'h1');
        const insertStart = shouldReplaceTarget ? idx : idx + 1;
        const tailStart = idx + 1;
        const updated = [
          ...prev.slice(0, insertStart),
          ...pastedBlocks,
          ...prev.slice(tailStart),
        ];
        const lastPasted = pastedBlocks[pastedBlocks.length - 1];
        requestAnimationFrame(() => {
          const el = blockRefs.current.get(lastPasted.id);
          el?.focus();
        });
        return updated;
      });
      return true;
    },
    [applyBlocksChange]
  );

  // ── Apply block format (from toolbar) ────────────────────────────────────
  const applyBlockFormat = useCallback(
    (type: BlockType) => {
      const targetBlockId = focusedBlockId ?? getSelectedBlockId();
      if (!targetBlockId) return;
      applyBlocksChange((prev) => {
        return prev.map((b) =>
          b.id === targetBlockId
            ? { ...b, type, language: type === 'code' ? (b.language ?? 'plaintext') : undefined }
            : b
        );
      });
      setFocusedBlockId(targetBlockId);
      requestAnimationFrame(() => {
        const el = blockRefs.current.get(targetBlockId);
        if (el) {
          el.focus();
          try {
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(el);
            range.collapse(false);
            sel?.removeAllRanges();
            sel?.addRange(range);
          } catch { /* ignore */ }
        }
      });
    },
    [focusedBlockId, getSelectedBlockId, applyBlocksChange]
  );

  // ── Apply inline format (wraps selection with markdown syntax) ────────────
  const applyInlineFormat = useCallback((format: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const selectedText = range.toString().trim();
    if (!selectedText.length) return;

    const startEl =
      (range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : (range.startContainer as Element)) ?? null;
    const endEl =
      (range.endContainer.nodeType === Node.TEXT_NODE
        ? range.endContainer.parentElement
        : (range.endContainer as Element)) ?? null;
    const startBlock = startEl?.closest('[data-block-id]') as HTMLElement | null;
    const endBlock = endEl?.closest('[data-block-id]') as HTMLElement | null;
    if (!startBlock || !endBlock || startBlock !== endBlock) return;

    const blockEl = startBlock;
    if (!blockEl) return;

    const blockId = blockEl.getAttribute('data-block-id');
    if (!blockId) return;

    if (format === 'bold') document.execCommand('bold');
    else if (format === 'italic') document.execCommand('italic');
    else if (format === 'strikethrough') document.execCommand('strikeThrough');
    else if (format === 'code') {
      const safe = selectedText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      document.execCommand('insertHTML', false, `<code>${safe}</code>`);
    } else if (format === 'link') {
      const safe = selectedText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      document.execCommand('insertHTML', false, `<a href="https://">${safe}</a>`);
    } else {
      return;
    }

    // Sync block text after insertion
    requestAnimationFrame(() => {
      const el = blockRefs.current.get(blockId);
      if (!el) return;
      const fullText = htmlToMarkdown(el.innerHTML);
      // Sync state
      setBlocks((prev) => {
        const next = prev.map((b) =>
          b.id === blockId ? { ...b, text: fullText, raw: fullText } : b
        );
        syncToMarkdown(next);
        return next;
      });
      setFocusedBlockId(blockId);
    });
  }, [syncToMarkdown]);

  // ── Insert block ─────────────────────────────────────────────────────────
  const insertBlock = useCallback(
    (type: BlockType, text = '') => {
      const insertAfter = focusedBlockId;
      applyBlocksChange((prev) => {
        const idx = insertAfter
          ? prev.findIndex((b) => b.id === insertAfter)
          : prev.length - 1;
        const newBlock = createBlock(type, text);
        if (type === 'code') newBlock.language = 'plaintext';
        const updated = [
          ...prev.slice(0, idx + 1),
          newBlock,
          ...prev.slice(idx + 1),
        ];
        requestAnimationFrame(() => {
          const el = blockRefs.current.get(newBlock.id);
          if (el) {
            el.focus();
            try {
              const range = document.createRange();
              const sel = window.getSelection();
              range.selectNodeContents(el);
              range.collapse(false);
              sel?.removeAllRanges();
              sel?.addRange(range);
            } catch { /* ignore */ }
          }
        });
        return updated;
      });
    },
    [focusedBlockId, applyBlocksChange]
  );

  // ── Move block up/down ────────────────────────────────────────────────────
  const moveBlock = useCallback(
    (blockId: string, dir: 'up' | 'down') => {
      applyBlocksChange((prev) => {
        const idx = prev.findIndex((b) => b.id === blockId);
        if (idx === -1) return prev;
        if (dir === 'up' && idx === 0) return prev;
        if (dir === 'down' && idx === prev.length - 1) return prev;
        const updated = [...prev];
        const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
        [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
        return updated;
      });
    },
    [applyBlocksChange]
  );

  // ── Delete block ──────────────────────────────────────────────────────────
  const deleteBlock = useCallback(
    (blockId: string) => {
      applyBlocksChange((prev) => {
        if (prev.length === 1) {
          // Reset to empty h1 instead of deleting last
          return [createBlock('h1', '')];
        }
        const idx = prev.findIndex((b) => b.id === blockId);
        const updated = prev.filter((b) => b.id !== blockId);
        const focusIdx = Math.max(0, idx - 1);
        requestAnimationFrame(() => {
          const target = updated[focusIdx];
          if (target) {
            const el = blockRefs.current.get(target.id);
            el?.focus();
          }
        });
        return updated;
      });
    },
    [applyBlocksChange]
  );

  // ── Update code language ──────────────────────────────────────────────────
  const updateCodeLanguage = useCallback(
    (blockId: string, language: string) => {
      applyBlocksChange((prev) =>
        prev.map((b) =>
          b.id === blockId ? { ...b, language: language.trim() ? language : undefined } : b
        )
      );
    },
    [applyBlocksChange]
  );

  // ── Clear document ────────────────────────────────────────────────────────
  const clearDocument = useCallback(() => {
    applyBlocksChange(() => [createBlock('h1', '')]);
    setFocusedBlockId(null);
  }, [applyBlocksChange]);

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    setBlocks((prev) => {
      const previous = undoStackRef.current.pop();
      if (!previous) return prev;
      isApplyingHistoryRef.current = true;
      redoStackRef.current.push(cloneBlocks(prev));
      const restored = cloneBlocks(previous);
      syncToMarkdown(restored);
      isApplyingHistoryRef.current = false;
      return restored;
    });
    setFocusedBlockId(null);
  }, [cloneBlocks, syncToMarkdown]);

  const redo = useCallback(() => {
    setBlocks((prev) => {
      const next = redoStackRef.current.pop();
      if (!next) return prev;
      isApplyingHistoryRef.current = true;
      undoStackRef.current.push(cloneBlocks(prev));
      const restored = cloneBlocks(next);
      syncToMarkdown(restored);
      isApplyingHistoryRef.current = false;
      return restored;
    });
    setFocusedBlockId(null);
  }, [cloneBlocks, syncToMarkdown]);

  // ── Load new content ──────────────────────────────────────────────────────
  const loadContent = useCallback((content: string) => {
    const parsed = parseMarkdownToBlocks(content);
    setBlocks(parsed.length > 0 ? parsed : [createBlock('h1')]);
    setFocusedBlockId(null);
    undoStackRef.current = [];
    redoStackRef.current = [];
  }, []);

  return {
    blocks,
    focusedBlockId,
    setFocusedBlockId,
    registerRef,
    saveCurrentSelection,
    restoreCurrentSelection,
    handleEnter,
    handleTextChange,
    handleBackspaceOnEmpty,
    handleArrowNavigation,
    handleImagePaste,
    handleMarkdownPaste,
    applyBlockFormat,
    applyInlineFormat,
    insertBlock,
    moveBlock,
    deleteBlock,
    updateCodeLanguage,
    clearDocument,
    undo,
    redo,
    loadContent,
  };
}