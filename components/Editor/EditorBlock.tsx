'use client';

import React, {
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useState,
  KeyboardEvent,
  ClipboardEvent,
} from 'react';
import hljs from 'highlight.js/lib/common';
import { ParsedBlock, parseInlineMarkdown, parseTableMarkdown, detectBlockType } from '@/lib/markdownTransform';

interface EditorBlockProps {
  block: ParsedBlock;
  isFirst: boolean;
  isFocused: boolean;
  blockIndex: number;
  totalBlocks: number;
  onFocus: (id: string) => void;
  onBlur: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  onEnter: (id: string, currentText: string, caretOffset: number) => void;
  onBackspaceEmpty: (id: string) => void;
  onBackspaceJoinPrevious: (id: string) => void;
  onArrow: (id: string, dir: 'up' | 'down') => void;
  onImagePaste: (id: string, file: File) => boolean;
  onMarkdownPaste: (id: string, text: string) => boolean;
  onCodeLanguageChange: (id: string, language: string) => void;
  onClearDocument: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onMoveBlock: (id: string, dir: 'up' | 'down') => void;
  onDeleteBlock: (id: string) => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
}

const CODE_LANGUAGES = [
  'auto', 'plaintext', 'javascript', 'typescript', 'python', 'bash',
  'json', 'markdown', 'html', 'css', 'sql', 'go', 'rust', 'java', 'c', 'cpp', 'yaml',
];

const LANGUAGE_LABELS: Record<string, string> = {
  auto: 'Auto', plaintext: 'Plain text', javascript: 'JavaScript',
  typescript: 'TypeScript', python: 'Python', bash: 'Bash', json: 'JSON',
  markdown: 'Markdown', html: 'HTML', css: 'CSS', sql: 'SQL', go: 'Go',
  rust: 'Rust', java: 'Java', c: 'C', cpp: 'C++', yaml: 'YAML',
};

const TAG_MAP: Partial<Record<string, string>> = {
  h1: 'h1', h2: 'h2', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6',
  p: 'p', quote: 'blockquote', ul: 'li', ol: 'li',
};

const PLACEHOLDER_MAP: Record<string, string> = {
  h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
  h4: 'Heading 4', h5: 'Heading 5', h6: 'Heading 6',
  p: 'Write something…',
  quote: 'Quote…', code: 'Code…', ul: 'List item…', ol: 'List item…',
};

const BLOCK_TYPE_LABELS: Record<string, string> = {
  h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4', h5: 'H5', h6: 'H6',
  p: 'P', quote: '❝', code: '<>', ul: '•', ol: '1.', table: '⊞', hr: '—',
};

const MARKDOWN_PASTE_HINT =
  /(^#{1,6}\s)|(^>\s?)|(^[-*+]\s)|(^\d+\.\s)|(```)/m;

// ─── HTML → markdown ──────────────────────────────────────────────────────────
// Converts contenteditable innerHTML back to a markdown string.
function htmlToMarkdown(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong><em>([\s\S]*?)<\/em><\/strong>/gi, '***$1***')
    .replace(/<em><strong>([\s\S]*?)<\/strong><\/em>/gi, '***$1***')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<del>([\s\S]*?)<\/del>/gi, '~~$1~~')
    .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .trim();
}

function htmlToMarkdownWithoutTrim(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<strong><em>([\s\S]*?)<\/em><\/strong>/gi, '***$1***')
    .replace(/<em><strong>([\s\S]*?)<\/strong><\/em>/gi, '***$1***')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<del>([\s\S]*?)<\/del>/gi, '~~$1~~')
    .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/??>/gi, '![$2]($1)')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/??>/gi, '![$1]($2)')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"');
}

// Get char caret offset inside a contenteditable
function getCaretOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}

function getMarkdownCaretOffset(el: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  const fragment = pre.cloneContents();
  const temp = document.createElement('div');
  temp.appendChild(fragment);
  return htmlToMarkdownWithoutTrim(temp.innerHTML).length;
}

function hasActiveSelection(): boolean {
  const sel = window.getSelection();
  return !!sel && sel.rangeCount > 0 && !sel.isCollapsed;
}

function selectionIsInside(el: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  return el.contains(range.startContainer) && el.contains(range.endContainer);
}

export const EditorBlock = React.memo(function EditorBlock({
  block,
  isFirst,
  isFocused,
  blockIndex,
  totalBlocks,
  onFocus,
  onBlur,
  onTextChange,
  onEnter,
  onBackspaceEmpty,
  onBackspaceJoinPrevious,
  onArrow,
  onImagePaste,
  onMarkdownPaste,
  onCodeLanguageChange,
  onClearDocument,
  onUndo,
  onRedo,
  onMoveBlock,
  onDeleteBlock,
  registerRef,
}: EditorBlockProps) {
  const elRef = useRef<HTMLElement | null>(null);
  const isComposingRef = useRef(false);
  const lastMarkdownRef = useRef(block.text);
  const skipNextBlurSyncRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lastMarkdownRef.current = block.text;
  }, [block.text]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const setRef = useCallback(
    (el: HTMLElement | null) => {
      elRef.current = el;
      registerRef(block.id, el);
    },
    [block.id, registerRef]
  );

  const focusEditableBlock = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    onFocus(block.id);
    el.focus();
  }, [block.id, onFocus]);

  const handleWrapperPress = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      // Let native interactions work for controls and direct editable taps.
      if (target.closest('button, input, select, textarea, a, [contenteditable="true"]')) {
        return;
      }
      // Keep focus stable across block navigation on mobile.
      e.preventDefault();
      focusEditableBlock();
    },
    [focusEditableBlock]
  );

  // Always-rendered HTML (used as initial innerHTML and for unfocused sync)
  const renderedHtml = useMemo(
    () => parseInlineMarkdown(block.text),
    [block.text]
  );

  // When NOT focused: keep DOM in sync with model (e.g. after undo/redo or block format change)
  useEffect(() => {
    const el = elRef.current;
    if (!el || block.type === 'code' || block.type === 'table') return;
    if (!isFocused) {
      if (el.innerHTML !== renderedHtml) {
        el.innerHTML = renderedHtml;
      }
    }
  }, [renderedHtml, block.type, isFocused]);

  // When block gains focus: sync HTML once, position cursor at end
  const prevFocusedRef = useRef(isFocused);
  useEffect(() => {
    if (!isFocused || prevFocusedRef.current === isFocused) {
      prevFocusedRef.current = isFocused;
      return;
    }
    prevFocusedRef.current = isFocused;
    const el = elRef.current;
    if (!el || block.type === 'code' || block.type === 'table') return;
    if (hasActiveSelection()) return;
    if (el.innerHTML !== renderedHtml) {
      el.innerHTML = renderedHtml;
    }
    if (selectionIsInside(el)) return;
    try {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch { /* ignore */ }
  }, [isFocused, block.id, renderedHtml, block.type]);

  // ── Table block ──────────────────────────────────────────────────────────
  if (block.type === 'table') {
    return (
      <TableBlock
        block={block}
        isFocused={isFocused}
        isHovered={isHovered}
        setIsHovered={setIsHovered}
        blockIndex={blockIndex}
        totalBlocks={totalBlocks}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        menuRef={menuRef}
        onFocus={onFocus}
        onTextChange={onTextChange}
        onMoveBlock={onMoveBlock}
        onDeleteBlock={onDeleteBlock}
        registerRef={registerRef}
      />
    );
  }

  // ── HR block ─────────────────────────────────────────────────────────────
  if (block.type === 'hr') {
    return (
      <div
        className={`editor-block-wrapper${isFocused ? ' is-focused' : ''}${isHovered ? ' is-hovered' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => onFocus(block.id)}
      >
        <BlockGutter
          blockType={block.type} isHovered={isHovered} isFocused={isFocused}
          blockIndex={blockIndex} totalBlocks={totalBlocks}
          showMenu={showMenu} setShowMenu={setShowMenu} menuRef={menuRef}
          onMoveUp={() => onMoveBlock(block.id, 'up')}
          onMoveDown={() => onMoveBlock(block.id, 'down')}
          onDelete={() => onDeleteBlock(block.id)}
        />
        <hr className="editor-hr" />
      </div>
    );
  }

  const tag = TAG_MAP[block.type] || 'p';
  const placeholder =
    isFirst && block.type === 'h1'
      ? 'What are we writing today?'
      : (PLACEHOLDER_MAP[block.type] ?? 'Write something…');

  // ── Key handler ──────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (isComposingRef.current) return;
      const el = elRef.current;
      if (!el) return;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? onRedo() : onUndo(); return; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); onRedo(); return; }

      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const sel = window.getSelection();
        if (!sel) return;
        const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
        const fullLen = (el.textContent ?? '').length;
        const isInside = !!range && el.contains(range.startContainer) && el.contains(range.endContainer);
        const selectedLen = range?.toString().length ?? 0;
        if (!(isInside && selectedLen === fullLen && fullLen > 0)) {
          const r = document.createRange(); r.selectNodeContents(el);
          sel.removeAllRanges(); sel.addRange(r);
          return;
        }
        const editorDoc = el.closest('[data-editor-doc="true"]');
        if (editorDoc) {
          const r = document.createRange(); r.selectNodeContents(editorDoc);
          sel.removeAllRanges(); sel.addRange(r);
        }
        return;
      }

      if ((e.key === 'Backspace' || e.key === 'Delete')) {
        const sel = window.getSelection();
        if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
          const editorDoc = el.closest('[data-editor-doc="true"]');
          if (editorDoc) {
            const range = sel.getRangeAt(0);
            const docRange = document.createRange();
            docRange.selectNodeContents(editorDoc);
            if (
              editorDoc.contains(range.startContainer) &&
              editorDoc.contains(range.endContainer) &&
              range.toString().length > 0 &&
              range.toString().length === docRange.toString().length
            ) {
              e.preventDefault(); onClearDocument(); return;
            }
          }
        }
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        if (block.type === 'code') return;
        const text = htmlToMarkdown(el.innerHTML);
        const caretOffset = getMarkdownCaretOffset(el);
        const splitAt = Math.max(0, Math.min(caretOffset, text.length));
        const beforeText = text.slice(0, splitAt);
        el.innerHTML = parseInlineMarkdown(beforeText);
        lastMarkdownRef.current = beforeText;
        skipNextBlurSyncRef.current = true;
        e.preventDefault();
        onEnter(block.id, text, caretOffset);
        return;
      }

      if (e.key === 'Backspace') {
        const isEmpty = (el.textContent ?? '').trim() === '';
        if (isEmpty) {
          e.preventDefault();
          onBackspaceEmpty(block.id);
          return;
        }

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && sel.isCollapsed && getCaretOffset(el) === 0) {
          e.preventDefault();
          onBackspaceJoinPrevious(block.id);
          return;
        }
      }

      if (e.key === 'ArrowUp') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const pre = range.cloneRange();
          pre.selectNodeContents(el);
          pre.setEnd(range.startContainer, range.startOffset);
          if (pre.toString().length === 0) { e.preventDefault(); onArrow(block.id, 'up'); }
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          const after = range.cloneRange();
          after.selectNodeContents(el);
          after.setStart(range.endContainer, range.endOffset);
          if (after.toString().length === 0) { e.preventDefault(); onArrow(block.id, 'down'); }
        }
        return;
      }

      if (e.key === 'Tab' && block.type === 'code') {
        e.preventDefault();
        document.execCommand('insertText', false, '  ');
        return;
      }

      // ── Space key: immediately detect markdown patterns (e.g., "# " for H1) ───
      if (e.key === ' ' && block.type === 'p') {
        // Defer to next tick to read the updated text with space included
        requestAnimationFrame(() => {
          const text = htmlToMarkdown(el.innerHTML);
          // Check if this matches a block pattern
          const detected = detectBlockType(text);
          if (detected && detected.type !== 'p') {
            // Apply the block type change immediately
            onTextChange(block.id, text);
          }
        });
      }
    },
    [block.id, block.type, onEnter, onBackspaceEmpty, onArrow, onClearDocument, onUndo, onRedo, onTextChange]
  );

  // ── Input: read innerHTML → convert to markdown ───────────────────────────
  const handleInput = useCallback(() => {
    if (isComposingRef.current) return;
    const el = elRef.current;
    if (!el) return;
    const markdown = block.type === 'code'
      ? (el.textContent ?? '')
      : htmlToMarkdown(el.innerHTML);
    if (markdown !== lastMarkdownRef.current) {
      lastMarkdownRef.current = markdown;
      onTextChange(block.id, markdown);
    }
  }, [block.id, block.type, onTextChange]);

  // ── Syntax highlighting for code blocks ──────────────────────────────────
  const highlightedCodeHtml = useMemo(() => {
    const code = block.text || '';
    const language = (block.language || 'plaintext').toLowerCase();
    if (!code) return '';
    try {
      if (language !== 'plaintext' && language !== 'auto' && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }, [block.text, block.language]);

  // ── Paste ─────────────────────────────────────────────────────────────────
  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLElement>) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (file) onImagePaste(block.id, file);
        return;
      }
      const text = e.clipboardData?.getData('text/plain') ?? '';
      const looksLikeMarkdown = text.includes('\n') || MARKDOWN_PASTE_HINT.test(text);
      if (text && looksLikeMarkdown) {
        e.preventDefault();
        if (onMarkdownPaste(block.id, text)) return;
      }
      if (!text) return;
      if (e.clipboardData?.getData('text/html')) {
        e.preventDefault();
        document.execCommand('insertText', false, text);
      }
    },
    [block.id, onImagePaste, onMarkdownPaste]
  );

  // ── Blur ──────────────────────────────────────────────────────────────────
  const handleBlur = useCallback(() => {
    onBlur(block.id);
    if (skipNextBlurSyncRef.current) { skipNextBlurSyncRef.current = false; return; }
    const el = elRef.current;
    if (el) {
      const markdown = block.type === 'code'
        ? (el.textContent ?? '')
        : htmlToMarkdown(el.innerHTML);
      if (markdown !== lastMarkdownRef.current) {
        lastMarkdownRef.current = markdown;
        onTextChange(block.id, markdown);
      }
    }
  }, [block.id, block.type, onBlur, onTextChange]);

  const getBlockClass = () => {
    const base = 'editor-block outline-none';
    const t = block.type;
    const cls = t === 'h1' ? 'is-h1' : t === 'h2' ? 'is-h2' : t === 'h3' ? 'is-h3' :
      t === 'h4' ? 'is-h4' : t === 'h5' ? 'is-h5' : t === 'h6' ? 'is-h6' :
      t === 'quote' ? 'is-quote' : t === 'ul' ? 'is-ul' : t === 'ol' ? 'is-ol' : '';
    return cls ? `${base} ${cls}` : base;
  };

  // Rich blocks: always use dangerouslySetInnerHTML for first render.
  // Subsequent updates are done imperatively via useEffect above.
  const commonProps = {
    ref: setRef as React.Ref<never>,
    contentEditable: true as const,
    suppressContentEditableWarning: true,
    className: getBlockClass(),
    'data-placeholder': placeholder,
    'data-block-id': block.id,
    onFocus: () => onFocus(block.id),
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    onInput: handleInput,
    onPaste: handlePaste,
    onCompositionStart: () => { isComposingRef.current = true; },
    onCompositionEnd: () => { isComposingRef.current = false; handleInput(); },
  };

  // Avoid React rewriting innerHTML while typing in a focused contentEditable,
  // which can reset caret position and cause reverse typing behavior.
  const contentProps = !isFocused
    ? { ...commonProps, dangerouslySetInnerHTML: { __html: renderedHtml } }
    : commonProps;

  // ── Code block ────────────────────────────────────────────────────────────
  if (block.type === 'code') {
    const selectedLanguage = (block.language || 'auto').toLowerCase();
    return (
      <div
        className={`editor-block-wrapper${isFocused ? ' is-focused' : ''}${isHovered ? ' is-hovered' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <BlockGutter
          blockType={block.type} isHovered={isHovered} isFocused={isFocused}
          blockIndex={blockIndex} totalBlocks={totalBlocks}
          showMenu={showMenu} setShowMenu={setShowMenu} menuRef={menuRef}
          onMoveUp={() => onMoveBlock(block.id, 'up')}
          onMoveDown={() => onMoveBlock(block.id, 'down')}
          onDelete={() => onDeleteBlock(block.id)}
        />
        <div className="editor-code-wrap">
          <div className="editor-code-header">
            <label className="editor-code-language-pill" onMouseDown={(e) => e.stopPropagation()}>
              <span className="editor-code-language-dot" aria-hidden="true" />
              <select
                value={selectedLanguage}
                onChange={(e) => onCodeLanguageChange(block.id, e.target.value === 'auto' ? '' : e.target.value)}
                className="editor-code-language-select"
                aria-label="Code language"
              >
                {CODE_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{LANGUAGE_LABELS[lang] ?? lang}</option>
                ))}
              </select>
            </label>
          </div>
          <CodeBlockEditable
            block={block}
            isFocused={isFocused}
            highlightedHtml={highlightedCodeHtml}
            onFocus={() => onFocus(block.id)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onTextChange={onTextChange}
            registerRef={setRef}
          />
        </div>
      </div>
    );
  }

  // ── List blocks ───────────────────────────────────────────────────────────
  const gutterProps = {
    blockType: block.type, isHovered, isFocused, blockIndex, totalBlocks,
    showMenu, setShowMenu, menuRef,
    onMoveUp: () => onMoveBlock(block.id, 'up'),
    onMoveDown: () => onMoveBlock(block.id, 'down'),
    onDelete: () => onDeleteBlock(block.id),
  };

  if (block.type === 'ul') {
    return (
      <div className={`editor-block-wrapper${isFocused ? ' is-focused' : ''}${isHovered ? ' is-hovered' : ''}`}
        onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
        onMouseDown={handleWrapperPress} onTouchStart={handleWrapperPress}>
        <BlockGutter {...gutterProps} />
        <ul className="editor-list-wrap">{React.createElement('li', contentProps as never)}</ul>
      </div>
    );
  }
  if (block.type === 'ol') {
    return (
      <div className={`editor-block-wrapper${isFocused ? ' is-focused' : ''}${isHovered ? ' is-hovered' : ''}`}
        onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
        onMouseDown={handleWrapperPress} onTouchStart={handleWrapperPress}>
        <BlockGutter {...gutterProps} />
        <ol className="editor-list-wrap">{React.createElement('li', contentProps as never)}</ol>
      </div>
    );
  }

  // ── Default (p, h1-h6, quote) ─────────────────────────────────────────────
  return (
    <div className={`editor-block-wrapper${isFocused ? ' is-focused' : ''}${isHovered ? ' is-hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleWrapperPress} onTouchStart={handleWrapperPress}>
      <BlockGutter {...gutterProps} />
      {React.createElement(tag, contentProps as never)}
    </div>
  );
});

// ─── CodeBlockEditable ────────────────────────────────────────────────────────

interface CodeBlockEditableProps {
  block: ParsedBlock;
  isFocused: boolean;
  highlightedHtml: string;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
  onTextChange: (id: string, text: string) => void;
  registerRef: (el: HTMLElement | null) => void;
}

function CodeBlockEditable({
  block, isFocused, highlightedHtml,
  onFocus, onBlur, onKeyDown, onTextChange, registerRef,
}: CodeBlockEditableProps) {
  const preRef = useRef<HTMLPreElement>(null);
  const isComposingRef = useRef(false);
  const lastTextRef = useRef(block.text);

  useEffect(() => { lastTextRef.current = block.text; }, [block.text]);

  // Not focused → show highlighted HTML
  useEffect(() => {
    const el = preRef.current;
    if (!el || isFocused) return;
    const newContent = highlightedHtml ? `<code class="hljs-code">${highlightedHtml}</code>` : '';
    el.innerHTML = newContent;
  }, [isFocused, highlightedHtml]);

  // Focused → switch to plain text
  const prevFocusedRef = useRef(isFocused);
  useEffect(() => {
    if (!isFocused || prevFocusedRef.current === isFocused) {
      prevFocusedRef.current = isFocused;
      return;
    }
    prevFocusedRef.current = isFocused;
    const el = preRef.current;
    if (!el) return;
    if (hasActiveSelection()) return;
    if (el.textContent !== block.text) {
      el.textContent = block.text;
    }
    if (selectionIsInside(el)) return;
    try {
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    } catch { /* ignore */ }
  }, [isFocused, block.id, block.text]);

  const handleInput = useCallback(() => {
    if (isComposingRef.current) return;
    const el = preRef.current;
    if (!el) return;
    const text = el.textContent ?? '';
    if (text !== lastTextRef.current) {
      lastTextRef.current = text;
      onTextChange(block.id, text);
    }
  }, [block.id, onTextChange]);

  const handleBlurInternal = useCallback(() => {
    const el = preRef.current;
    if (el) {
      const text = el.textContent ?? '';
      if (text !== lastTextRef.current) {
        lastTextRef.current = text;
        onTextChange(block.id, text);
      }
    }
    onBlur();
  }, [block.id, onTextChange, onBlur]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLPreElement>) => {
    e.preventDefault();
    const text = e.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
  }, []);

  return (
    <pre
      ref={(el) => {
        (preRef as React.MutableRefObject<HTMLPreElement | null>).current = el;
        registerRef(el);
      }}
      contentEditable
      suppressContentEditableWarning
      className="editor-block is-code"
      data-placeholder="Code…"
      data-block-id={block.id}
      onFocus={onFocus}
      onBlur={handleBlurInternal}
      onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLPreElement>}
      onInput={handleInput}
      onPaste={handlePaste}
      onCompositionStart={() => { isComposingRef.current = true; }}
      onCompositionEnd={() => { isComposingRef.current = false; handleInput(); }}
    />
  );
}

// ─── TableBlock ───────────────────────────────────────────────────────────────

interface TableBlockProps {
  block: ParsedBlock;
  isFocused: boolean;
  isHovered: boolean;
  setIsHovered: (v: boolean) => void;
  blockIndex: number;
  totalBlocks: number;
  showMenu: boolean;
  setShowMenu: (v: boolean) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onFocus: (id: string) => void;
  onTextChange: (id: string, text: string) => void;
  onMoveBlock: (id: string, dir: 'up' | 'down') => void;
  onDeleteBlock: (id: string) => void;
  registerRef: (id: string, el: HTMLElement | null) => void;
}

function parseTableToMatrix(raw: string): { headers: string[]; rows: string[][] } {
  const lines = raw.split('\n').filter((l) => l.trim().startsWith('|'));
  if (lines.length < 1) return { headers: ['Column 1', 'Column 2'], rows: [['', '']] };
  const parseCells = (line: string) =>
    line.split('|').map((c) => c.trim()).filter((_, i, a) => i !== 0 && i !== a.length - 1);
  const headers = parseCells(lines[0]);
  const dataLines = lines.slice(2); // skip separator
  const rows = dataLines.length > 0 ? dataLines.map(parseCells) : [headers.map(() => '')];
  return { headers, rows };
}

function matrixToMarkdown(headers: string[], rows: string[][]): string {
  const sep = headers.map(() => '--------');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
}

function TableBlock({
  block, isFocused, isHovered, setIsHovered,
  blockIndex, totalBlocks, showMenu, setShowMenu, menuRef,
  onFocus, onTextChange, onMoveBlock, onDeleteBlock, registerRef,
}: TableBlockProps) {
  const parsed = useMemo(() => parseTableToMatrix(block.text), [block.text]);
  const [headers, setHeaders] = useState(parsed.headers);
  const [rows, setRows] = useState(parsed.rows);

  useEffect(() => {
    const p = parseTableToMatrix(block.text);
    setHeaders(p.headers);
    setRows(p.rows);
  }, [block.text]);

  const save = useCallback((h: string[], r: string[][]) => {
    onTextChange(block.id, matrixToMarkdown(h, r));
  }, [block.id, onTextChange]);

  return (
    <div
      className={`editor-block-wrapper${isFocused ? ' is-focused' : ''}${isHovered ? ' is-hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onFocus(block.id)}
    >
      <BlockGutter
        blockType="table" isHovered={isHovered} isFocused={isFocused}
        blockIndex={blockIndex} totalBlocks={totalBlocks}
        showMenu={showMenu} setShowMenu={setShowMenu} menuRef={menuRef}
        onMoveUp={() => onMoveBlock(block.id, 'up')}
        onMoveDown={() => onMoveBlock(block.id, 'down')}
        onDelete={() => onDeleteBlock(block.id)}
      />
      <div
        ref={(el) => registerRef(block.id, el)}
        className="table-editor-wrap"
        data-block-id={block.id}
      >
        <div className="table-scroll">
          <table className="editor-table">
            <thead>
              <tr>
                {headers.map((header, ci) => (
                  <th key={ci} className="editor-table-th">
                    <div className="table-cell-wrap">
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        className="table-cell-input"
                        onBlur={(e) => {
                          const nextHeader = htmlToMarkdown(e.currentTarget.innerHTML);
                          if (nextHeader === headers[ci]) return;
                          const h = [...headers];
                          h[ci] = nextHeader;
                          setHeaders(h);
                          save(h, rows);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                        dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(header) }}
                      />
                      {isFocused && headers.length > 1 && (
                        <button
                          className="table-remove-col"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const h = headers.filter((_, i) => i !== ci);
                            const r = rows.map((row) => row.filter((_, i) => i !== ci));
                            setHeaders(h); setRows(r); save(h, r);
                          }}
                          title="Remove column"
                        >×</button>
                      )}
                    </div>
                  </th>
                ))}
                {isFocused && (
                  <th className="editor-table-th table-add-col-th">
                    <button
                      className="table-add-btn"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const h = [...headers, `Col ${headers.length + 1}`];
                        const r = rows.map((row) => [...row, '']);
                        setHeaders(h); setRows(r); save(h, r);
                      }}
                    >+</button>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="editor-table-td">
                      <div
                        contentEditable
                        suppressContentEditableWarning
                        className="table-cell-input"
                        onBlur={(e) => {
                          const nextCell = htmlToMarkdown(e.currentTarget.innerHTML);
                          if (nextCell === row[ci]) return;
                          const r = rows.map((rw, rIdx) =>
                            rIdx === ri ? rw.map((c, cIdx) => cIdx === ci ? nextCell : c) : rw
                          );
                          setRows(r); save(headers, r);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); return; }
                          if (e.key === 'Tab') {
                            e.preventDefault();
                            const all = Array.from(
                              e.currentTarget.closest('table')?.querySelectorAll('.table-cell-input') ?? []
                            ) as HTMLElement[];
                            const idx = all.indexOf(e.currentTarget);
                            all[idx + (e.shiftKey ? -1 : 1)]?.focus();
                          }
                        }}
                        dangerouslySetInnerHTML={{ __html: parseInlineMarkdown(cell) }}
                      />
                    </td>
                  ))}
                  {isFocused && (
                    <td className="editor-table-td table-row-actions">
                      {rows.length > 1 && (
                        <button
                          className="table-remove-row"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const r = rows.filter((_, i) => i !== ri);
                            setRows(r); save(headers, r);
                          }}
                          title="Remove row"
                        >×</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isFocused && (
          <div className="table-footer-actions">
            <button
              className="table-add-row-btn"
              onMouseDown={(e) => {
                e.preventDefault();
                const r = [...rows, headers.map(() => '')];
                setRows(r); save(headers, r);
              }}
            >+ Add row</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BlockGutter ──────────────────────────────────────────────────────────────

interface BlockGutterProps {
  blockType: string; isHovered: boolean; isFocused: boolean;
  blockIndex: number; totalBlocks: number;
  showMenu: boolean; setShowMenu: (v: boolean) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onMoveUp: () => void; onMoveDown: () => void; onDelete: () => void;
}

function BlockGutter({
  blockType, isHovered, isFocused, blockIndex, totalBlocks,
  showMenu, setShowMenu, menuRef, onMoveUp, onMoveDown, onDelete,
}: BlockGutterProps) {
  const visible = isHovered || isFocused;
  const label = BLOCK_TYPE_LABELS[blockType] ?? 'P';
  return (
    <div className="block-gutter" aria-hidden="true">
      <div className={`block-gutter-inner${visible ? ' visible' : ''}`}>
        <span className="block-type-badge">{label}</span>
        <button
          className="block-handle" title="Block options"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="4" cy="2.5" r="1.1" /><circle cx="8" cy="2.5" r="1.1" />
            <circle cx="4" cy="6" r="1.1" /><circle cx="8" cy="6" r="1.1" />
            <circle cx="4" cy="9.5" r="1.1" /><circle cx="8" cy="9.5" r="1.1" />
          </svg>
        </button>
        {showMenu && (
          <div ref={menuRef} className="block-context-menu">
            <button className="block-menu-item"
              onMouseDown={(e) => { e.preventDefault(); onMoveUp(); setShowMenu(false); }}
              disabled={blockIndex === 0}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
              Move up
            </button>
            <button className="block-menu-item"
              onMouseDown={(e) => { e.preventDefault(); onMoveDown(); setShowMenu(false); }}
              disabled={blockIndex === totalBlocks - 1}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
              Move down
            </button>
            <div className="block-menu-divider" />
            <button className="block-menu-item is-danger"
              onMouseDown={(e) => { e.preventDefault(); onDelete(); setShowMenu(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              Delete block
            </button>
          </div>
        )}
      </div>
    </div>
  );
}