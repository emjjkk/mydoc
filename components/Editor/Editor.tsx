'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { useMarkdownEditor } from './useMarkdownEditor';
import { EditorBlock } from './EditorBlock';
import { FloatingToolbar } from './FloatingToolbar';
import { BlockType } from '@/lib/markdownTransform';

interface EditorProps {
  docId: string;
  content: string;
  contentWidth: string;
  fontCss: string;
  sidebarOffset: number;
  onChange: (markdown: string) => void;
}

export function Editor({ docId, content, contentWidth, fontCss, sidebarOffset, onChange }: EditorProps) {
  const prevDocIdRef = useRef(docId);

  const {
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
  } = useMarkdownEditor(content, onChange);

  // Reload editor when document switches
  useEffect(() => {
    if (prevDocIdRef.current !== docId) {
      prevDocIdRef.current = docId;
      loadContent(docId, content);
    }
  }, [docId, content, loadContent]);

  // Click on the editor area below all blocks → focus last block
  const handleEditorClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        const lastBlock = blocks[blocks.length - 1];
        if (lastBlock) {
          const el = document.querySelector(`[data-block-id="${lastBlock.id}"]`) as HTMLElement;
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const clickY = e.clientY;
          // Only jump to end when clicking below content, not in side margins.
          if (clickY >= rect.bottom) {
            el.focus();
          }
        }
      }
    },
    [blocks]
  );

  const handleToolbarFormat = useCallback(
    (action: string, value?: string) => {
      restoreCurrentSelection();

      const inlineFormats = ['bold', 'italic', 'strikethrough', 'link'];
      if (inlineFormats.includes(action)) {
        applyInlineFormat(action);
        return;
      }

      // 'code' can be both inline (if there's a selection) or block
      if (action === 'code') {
        const sel = window.getSelection();
        const selectedText = sel?.toString() ?? '';
        if (selectedText.length > 0) {
          // Has selection → inline code wrap
          applyInlineFormat('code');
        } else {
          // No selection → insert code block
          insertBlock('code');
        }
        return;
      }

      if (action === 'codeblock') {
        insertBlock('code');
        return;
      }

      if (action === 'quote') {
        applyBlockFormat('quote');
        return;
      }

      if (action === 'ul') {
        applyBlockFormat('ul');
        return;
      }

      if (action === 'ol') {
        applyBlockFormat('ol');
        return;
      }

      if (action === 'table') {
        const tableTemplate = `| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Cell     | Cell     | Cell     |`;
        insertBlock('table', tableTemplate);
        return;
      }

      if (action === 'image') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file && focusedBlockId) {
            handleImagePaste(focusedBlockId, file);
          }
        };
        input.click();
        return;
      }

      if (action === 'hr') {
        insertBlock('hr');
        return;
      }

      // Heading actions h1–h6
      if (/^h[1-6]$/.test(action)) {
        applyBlockFormat(action as BlockType);
        return;
      }

      // Paragraph
      if (action === 'p') {
        applyBlockFormat('p');
        return;
      }
    },
    [applyBlockFormat, applyInlineFormat, insertBlock, focusedBlockId, handleImagePaste, restoreCurrentSelection]
  );

  // Handle blur from a block — intentional no-op.
  // focusedBlockId is set by the next block's onFocus, so we never clear it here
  // to prevent toolbar flicker during block transitions.
  const handleBlockBlur: (id: string) => void = useCallback((_id: string) => {
    // no-op: toolbar stays visible, focus state maintained until new block focused
  }, []);

  return (
    <div
      className="flex-1 overflow-y-auto relative editor-scroll-area"
      style={{ background: 'var(--bg-editor)' }}
    >
      {/* Centering wrapper — controls the column width */}
      <div
        style={{
          maxWidth: contentWidth,
          width: '100%',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* Editor content area */}
        <div
          className="editor-doc-container"
          data-editor-doc="true"
          style={{ fontFamily: fontCss }}
          onMouseUp={saveCurrentSelection}
          onKeyUp={saveCurrentSelection}
          onClick={handleEditorClick}
        >
          {blocks.map((block, idx) => (
            <EditorBlock
              key={block.id}
              block={block}
              isFirst={idx === 0}
              isFocused={focusedBlockId === block.id}
              blockIndex={idx}
              totalBlocks={blocks.length}
              onFocus={setFocusedBlockId}
              onBlur={handleBlockBlur}
              onTextChange={handleTextChange}
              onEnter={handleEnter}
              onBackspaceEmpty={handleBackspaceOnEmpty}
              onArrow={handleArrowNavigation}
              onImagePaste={handleImagePaste}
              onMarkdownPaste={handleMarkdownPaste}
              onCodeLanguageChange={updateCodeLanguage}
              onClearDocument={clearDocument}
              onUndo={undo}
              onRedo={redo}
              onMoveBlock={moveBlock}
              onDeleteBlock={deleteBlock}
              registerRef={registerRef}
            />
          ))}
          {/* Bottom spacer */}
          <div className="editor-bottom-spacer" onClick={handleEditorClick} />
        </div>
      </div>

      {/* Floating toolbar */}
      <FloatingToolbar
        focusedBlockId={focusedBlockId}
        blocks={blocks}
        sidebarOffset={sidebarOffset}
        onAction={handleToolbarFormat}
      />
    </div>
  );
}