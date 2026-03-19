/**
 * exportUtils.ts
 *
 * Client-side export to:
 *   - Markdown (.md)  — trivial string blob
 *   - HTML            — used internally / as RTF base
 *   - PDF             — via browser print dialog (print-to-PDF)
 *   - RTF             — basic RTF wrapping of plain text
 *   - DOCX            — uses docx npm package if available, else HTML fallback
 *
 * All exports happen entirely in the browser with no backend.
 */

import { parseInlineMarkdown, parseTableMarkdown, ParsedBlock } from './markdownTransform';

// ─── Helper: trigger a file download ────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(title: string): string {
  return title.replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, '_') || 'document';
}

// ─── Markdown export ─────────────────────────────────────────────────────────

export function exportAsMarkdown(title: string, content: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(blob, `${sanitizeFilename(title)}.md`);
}

// ─── Blocks → HTML ───────────────────────────────────────────────────────────

export function blocksToHtml(blocks: ParsedBlock[], title: string): string {
  const bodyHtml = blocks
    .map((block) => {
      switch (block.type) {
        case 'h1': return `<h1>${parseInlineMarkdown(block.text)}</h1>`;
        case 'h2': return `<h2>${parseInlineMarkdown(block.text)}</h2>`;
        case 'h3': return `<h3>${parseInlineMarkdown(block.text)}</h3>`;
        case 'h4': return `<h4>${parseInlineMarkdown(block.text)}</h4>`;
        case 'h5': return `<h5>${parseInlineMarkdown(block.text)}</h5>`;
        case 'h6': return `<h6>${parseInlineMarkdown(block.text)}</h6>`;
        case 'ul': return `<ul><li>${parseInlineMarkdown(block.text)}</li></ul>`;
        case 'ol': return `<ol><li>${parseInlineMarkdown(block.text)}</li></ol>`;
        case 'quote': return `<blockquote><p>${parseInlineMarkdown(block.text)}</p></blockquote>`;
        case 'code': return `<pre><code>${block.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
        case 'hr': return '<hr />';
        case 'table': return parseTableMarkdown(block.text);
        default: return block.text ? `<p>${parseInlineMarkdown(block.text)}</p>` : '';
      }
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; padding: 0 24px; line-height: 1.75; color: #1a1a1a; }
    h1 { font-size: 2em; margin-bottom: 0.5em; }
    h2 { font-size: 1.5em; margin-top: 1.5em; }
    h3 { font-size: 1.25em; margin-top: 1.25em; }
    blockquote { border-left: 3px solid #888; padding-left: 1em; color: #555; font-style: italic; }
    pre { background: #f5f5f5; padding: 1em; border-radius: 4px; overflow-x: auto; }
    code { font-family: monospace; background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; }
    img { max-width: 100%; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

// ─── PDF export ───────────────────────────────────────────────────────────────
// Opens a new window with styled HTML and triggers print dialog.

export function exportAsPdf(title: string, blocks: ParsedBlock[]) {
  const html = blocksToHtml(blocks, title);
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export as PDF.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

// ─── RTF export ───────────────────────────────────────────────────────────────
// Basic RTF. Handles headings, paragraphs, bold, italic, code.

function escapeRtf(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/[^\x00-\x7F]/g, (ch) => `\\u${ch.charCodeAt(0)}?`);
}

function inlineToRtf(text: string): string {
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '{\\b $1}');
  // Italic: *text*
  text = text.replace(/\*(.+?)\*/g, '{\\i $1}');
  // Strikethrough: ~~text~~
  text = text.replace(/~~(.+?)~~/g, '{\\strike $1}');
  // Inline code: `code`
  text = text.replace(/`([^`]+)`/g, '{\\f1 $1}');
  return escapeRtf(text);
}

export function exportAsRtf(title: string, blocks: ParsedBlock[]) {
  const rtfLines = [
    '{\\rtf1\\ansi\\deff0',
    '{\\fonttbl{\\f0 Georgia;}{\\f1 Courier New;}}',
    '{\\colortbl;\\red26\\green26\\blue26;}',
    '\\cf1\\f0\\fs28\\sl360\\slmult1',
    '',
  ];

  for (const block of blocks) {
    switch (block.type) {
      case 'h1':
        rtfLines.push(`{\\b\\fs48 ${inlineToRtf(block.text)}}\\par\\par`);
        break;
      case 'h2':
        rtfLines.push(`{\\b\\fs36 ${inlineToRtf(block.text)}}\\par\\par`);
        break;
      case 'h3':
        rtfLines.push(`{\\b\\fs30 ${inlineToRtf(block.text)}}\\par\\par`);
        break;
      case 'h4':
      case 'h5':
      case 'h6':
        rtfLines.push(`{\\b\\fs26 ${inlineToRtf(block.text)}}\\par\\par`);
        break;
      case 'ul':
        rtfLines.push(`\\bullet\\tab ${inlineToRtf(block.text)}\\par`);
        break;
      case 'ol':
        rtfLines.push(`\\pard\\fi-360\\li720 ${inlineToRtf(block.text)}\\par`);
        break;
      case 'quote':
        rtfLines.push(`{\\i\\cf1 ${inlineToRtf(block.text)}}\\par\\par`);
        break;
      case 'code':
        rtfLines.push(`{\\f1\\fs22 ${escapeRtf(block.text)}}\\par\\par`);
        break;
      case 'hr':
        rtfLines.push('\\brdrb\\brdrs\\brdrw10\\brsp20 \\par');
        break;
      default:
        if (block.text) {
          rtfLines.push(`${inlineToRtf(block.text)}\\par\\par`);
        }
    }
  }

  rtfLines.push('}');
  const rtf = rtfLines.join('\n');
  const blob = new Blob([rtf], { type: 'application/rtf' });
  downloadBlob(blob, `${sanitizeFilename(title)}.rtf`);
}

// ─── DOCX export ─────────────────────────────────────────────────────────────
// Uses the 'docx' npm package. Falls back to HTML if not available.
// 
// To fully enable DOCX: npm install docx
// The dynamic import below will work once the package is installed.

export async function exportAsDocx(title: string, blocks: ParsedBlock[]) {
  try {
    // Dynamically import docx to keep bundle lean
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = await import('docx');

    const children: InstanceType<typeof Paragraph>[] = [];

    for (const block of blocks) {
      const text = block.text;

      // Simple inline parser for docx TextRuns
      function parseTextRuns(raw: string): InstanceType<typeof TextRun>[] {
        const runs: InstanceType<typeof TextRun>[] = [];
        // Very basic: split on bold/italic markers
        const parts = raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`)/);
        for (const part of parts) {
          if (part.startsWith('**') && part.endsWith('**')) {
            runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
          } else if (part.startsWith('*') && part.endsWith('*')) {
            runs.push(new TextRun({ text: part.slice(1, -1), italics: true }));
          } else if (part.startsWith('~~') && part.endsWith('~~')) {
            runs.push(new TextRun({ text: part.slice(2, -2), strike: true }));
          } else if (part.startsWith('`') && part.endsWith('`')) {
            runs.push(new TextRun({ text: part.slice(1, -1), font: 'Courier New', size: 18 }));
          } else if (part) {
            runs.push(new TextRun(part));
          }
        }
        return runs;
      }

      const headingMap: Record<string, typeof HeadingLevel[keyof typeof HeadingLevel]> = {
        h1: HeadingLevel.HEADING_1,
        h2: HeadingLevel.HEADING_2,
        h3: HeadingLevel.HEADING_3,
        h4: HeadingLevel.HEADING_4,
        h5: HeadingLevel.HEADING_5,
        h6: HeadingLevel.HEADING_6,
      };

      if (block.type in headingMap) {
        children.push(
          new Paragraph({
            heading: headingMap[block.type],
            children: parseTextRuns(text),
          })
        );
      } else if (block.type === 'ul') {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: parseTextRuns(text),
          })
        );
      } else if (block.type === 'ol') {
        children.push(
          new Paragraph({
            numbering: { reference: 'default-numbering', level: 0 },
            children: parseTextRuns(text),
          })
        );
      } else if (block.type === 'quote') {
        children.push(
          new Paragraph({
            children: [new TextRun({ text, italics: true, color: '555555' })],
            indent: { left: 720 },
          })
        );
      } else if (block.type === 'code') {
        children.push(
          new Paragraph({
            children: [new TextRun({ text, font: 'Courier New', size: 18 })],
            shading: { fill: 'F5F5F5' } as never,
          })
        );
      } else if (block.type === 'hr') {
        children.push(new Paragraph({ text: '──────────────', alignment: AlignmentType.CENTER }));
      } else if (text) {
        children.push(new Paragraph({ children: parseTextRuns(text) }));
      }
    }

    const doc = new Document({
      sections: [{ properties: {}, children }],
    });

    const buffer = await Packer.toBlob(doc);
    downloadBlob(buffer, `${sanitizeFilename(title)}.docx`);
  } catch (e) {
    console.warn('docx package not available, falling back to HTML export:', e);
    // Fallback: export as HTML (downloadable)
    const html = blocksToHtml(blocks, title);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, `${sanitizeFilename(title)}.html`);
    alert('DOCX export requires the "docx" npm package. Exported as HTML instead.\nRun: npm install docx');
  }
}