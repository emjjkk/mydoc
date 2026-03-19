/**
 * markdownTransform.ts
 *
 * Utilities for:
 * 1. Detecting markdown syntax at the start of a line and returning the
 *    block type + cleaned text.
 * 2. Parsing inline markdown (bold, italic, strikethrough, code, links).
 * 3. Parsing full markdown documents into a block array for initial load.
 */

export type BlockType =
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'ul' | 'ol' | 'quote' | 'code' | 'hr'
  | 'table' | 'p';

export interface BlockDetection {
  type: BlockType;
  /** The text content with the markdown prefix stripped */
  text: string;
  /** Original raw line (for undo purposes) */
  raw: string;
  /** Optional language metadata for code blocks */
  language?: string;
}

/**
 * Detects block-level markdown at the beginning of a line.
 * Returns the block type and stripped text if a pattern matches,
 * or null if no block-level pattern is found.
 */
export function detectBlockType(rawLine: string): BlockDetection | null {
  // Headings
  const headingMatch = rawLine.match(/^(#{1,6})\s+(.*)/);
  if (headingMatch) {
    const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6;
    return {
      type: `h${level}` as BlockType,
      text: headingMatch[2],
      raw: rawLine,
    };
  }

  // Horizontal rule
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(rawLine)) {
    return { type: 'hr', text: '', raw: rawLine };
  }

  // Unordered list: -, *, +
  const ulMatch = rawLine.match(/^[-*+]\s+(.*)/);
  if (ulMatch) {
    return { type: 'ul', text: ulMatch[1], raw: rawLine };
  }

  // Ordered list: 1. 2. etc.
  const olMatch = rawLine.match(/^\d+\.\s+(.*)/);
  if (olMatch) {
    return { type: 'ol', text: olMatch[1], raw: rawLine };
  }

  // Blockquote
  const quoteMatch = rawLine.match(/^>\s?(.*)/);
  if (quoteMatch) {
    return { type: 'quote', text: quoteMatch[1], raw: rawLine };
  }

  // Code block fence
  if (rawLine.startsWith('```')) {
     const language = rawLine.slice(3).trim();
     return { type: 'code', text: '', raw: rawLine, language: language || undefined };
  }

  return null;
}

/**
 * Determines what prefix to add back when reverting a block type.
 */
export function blockTypeToPrefixedText(type: BlockType, text: string): string {
  switch (type) {
    case 'h1': return `# ${text}`;
    case 'h2': return `## ${text}`;
    case 'h3': return `### ${text}`;
    case 'h4': return `#### ${text}`;
    case 'h5': return `##### ${text}`;
    case 'h6': return `###### ${text}`;
    case 'ul': return `- ${text}`;
    case 'ol': return `1. ${text}`;
    case 'quote': return `> ${text}`;
    case 'code': return `\`\`\`${text}`;
    case 'hr': return '---';
    default: return text;
  }
}

/**
 * Parses inline markdown within a string and returns HTML.
 * Handles: bold, italic, strikethrough, inline code, links, images.
 */
export function parseInlineMarkdown(text: string): string {
  // Escape HTML first (except we'll handle special chars carefully)
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // Links: [text](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Bold+italic: ***text*** or ___text___
  html = html.replace(/(\*{3}|_{3})(.+?)\1/g, '<strong><em>$2</em></strong>');

  // Bold: **text** or __text__
  html = html.replace(/(\*{2}|_{2})(.+?)\1/g, '<strong>$2</strong>');

  // Italic: *text* or _text_
  html = html.replace(/(\*|_)(.+?)\1/g, '<em>$2</em>');

  // Strikethrough: ~~text~~
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  return html;
}

/**
 * Converts a full markdown string into an array of block objects.
 * Used when loading a document from storage to populate the editor.
 */
export interface ParsedBlock {
  id: string;
  type: BlockType;
  /** Plain text content (no markdown prefix) */
  text: string;
  /** Raw markdown line */
  raw: string;
  /** Optional language metadata for code blocks */
  language?: string;
}

let blockCounter = 0;
function nextBlockId() {
  return `b_${Date.now()}_${blockCounter++}`;
}

export function parseMarkdownToBlocks(markdown: string): ParsedBlock[] {
  if (!markdown.trim()) {
    return [{ id: nextBlockId(), type: 'h1', text: '', raw: '' }];
  }

  const lines = markdown.split('\n');
  const blocks: ParsedBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block fence — consume until closing fence
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        id: nextBlockId(),
        type: 'code',
        text: codeLines.join('\n'),
        raw: `\`\`\`${lang}\n${codeLines.join('\n')}\n\`\`\``,
        language: lang || undefined,
      });
      continue;
    }

    // Table: detect | at start
    if (line.startsWith('|')) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      blocks.push({
        id: nextBlockId(),
        type: 'table',
        text: tableLines.join('\n'),
        raw: tableLines.join('\n'),
      });
      continue;
    }

    // Empty line → skip
    if (!line.trim()) {
      i++;
      continue;
    }

    const detected = detectBlockType(line);
    if (detected) {
      blocks.push({
        id: nextBlockId(),
        type: detected.type,
        text: detected.text,
        raw: detected.raw,
        language: detected.language,
      });
    } else {
      blocks.push({
        id: nextBlockId(),
        type: 'p',
        text: line,
        raw: line,
      });
    }
    i++;
  }

  if (blocks.length === 0) {
    blocks.push({ id: nextBlockId(), type: 'h1', text: '', raw: '' });
  }

  return blocks;
}

/**
 * Converts an array of ParsedBlocks back to a markdown string.
 */
export function blocksToMarkdown(blocks: ParsedBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'h1': return `# ${block.text}`;
        case 'h2': return `## ${block.text}`;
        case 'h3': return `### ${block.text}`;
        case 'h4': return `#### ${block.text}`;
        case 'h5': return `##### ${block.text}`;
        case 'h6': return `###### ${block.text}`;
        case 'ul': return `- ${block.text}`;
        case 'ol': return `1. ${block.text}`;
        case 'quote': return `> ${block.text}`;
        case 'code': return `\`\`\`\n${block.text}\n\`\`\``;
        case 'hr': return '---';
        case 'table': return block.text;
        default: return block.text;
      }
    })
    .join('\n\n');
}

/**
 * Parses a table markdown string into an HTML table.
 */
export function parseTableMarkdown(tableRaw: string): string {
  const rows = tableRaw
    .split('\n')
    .map((line) => line.split('|').map((c) => c.trim()).filter((_, i, arr) => i !== 0 && i !== arr.length - 1));

  if (rows.length < 2) return tableRaw;

  const [header, , ...body] = rows;
  const isAlignRow = (row: string[]) => row.every((c) => /^[-:]+$/.test(c));
  
  const headerHtml = header
    .map((cell) => `<th>${parseInlineMarkdown(cell)}</th>`)
    .join('');
  
  const bodyHtml = body
    .filter((row) => !isAlignRow(row))
    .map((row) => `<tr>${row.map((cell) => `<td>${parseInlineMarkdown(cell)}</td>`).join('')}</tr>`)
    .join('');

  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}