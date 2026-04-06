import DOMPurify from 'isomorphic-dompurify';

// Configure DOMPurify to allow safe HTML elements
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u', 's',
  'a', 'code', 'pre',
  'blockquote',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'class',
];

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Convert markdown to HTML and sanitize the output
 */
export function markdownToSafeHtml(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inList = false;
  let inTable = false;
  let inTableHead = false;
  let inCodeBlock = false;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      result.push(`<p>${paragraphLines.join('<br>')}</p>`);
      paragraphLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trimEnd();

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        result.push('</code></pre>');
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        result.push('<pre><code>');
      }
      continue;
    }
    if (inCodeBlock) {
      result.push(line);
      continue;
    }

    // Inline formatting (apply before block processing)
    // Bold must come before italic to avoid conflicts
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/(?<![*<])\*([^*]+?)\*(?![*>])/g, '<em>$1</em>');
    line = line.replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    line = line.replace(/`([^`]+?)`/g, '<code>$1</code>');

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      if (inList) { result.push('</ul>'); inList = false; }
      if (inTable) { result.push('</tbody></table>'); inTable = false; }
      result.push('<hr>');
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      flushParagraph();
      if (inList) { result.push('</ul>'); inList = false; }
      if (inTable) { result.push('</tbody></table>'); inTable = false; }
      result.push(`<h3>${line.slice(4)}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      if (inList) { result.push('</ul>'); inList = false; }
      if (inTable) { result.push('</tbody></table>'); inTable = false; }
      result.push(`<h2>${line.slice(3)}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      flushParagraph();
      if (inList) { result.push('</ul>'); inList = false; }
      if (inTable) { result.push('</tbody></table>'); inTable = false; }
      result.push(`<h1>${line.slice(2)}</h1>`);
      continue;
    }

    // Table rows
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      // Skip separator rows (|---|---|)
      if (/^\|[\s\-:|]+\|$/.test(line.trim())) {
        inTableHead = false;
        continue;
      }
      if (!inTable) {
        flushParagraph();
        if (inList) { result.push('</ul>'); inList = false; }
        result.push('<table><thead>');
        inTable = true;
        inTableHead = true;
      }
      const cells = line.trim().slice(1, -1).split('|').map(c => c.trim());
      const tag = inTableHead ? 'th' : 'td';
      if (inTableHead) {
        result.push(`<tr>${cells.map(c => `<${tag}>${c}</${tag}>`).join('')}</tr>`);
        result.push('</thead><tbody>');
      } else {
        result.push(`<tr>${cells.map(c => `<${tag}>${c}</${tag}>`).join('')}</tr>`);
      }
      continue;
    } else if (inTable) {
      result.push('</tbody></table>');
      inTable = false;
    }

    // Unordered list items
    if (/^[\-\*] (.+)$/.test(line.trim())) {
      if (!inList) {
        flushParagraph();
        result.push('<ul>');
        inList = true;
      }
      result.push(`<li>${line.trim().slice(2)}</li>`);
      continue;
    } else if (inList && line.trim() === '') {
      result.push('</ul>');
      inList = false;
      continue;
    }

    // Empty line — flush paragraph
    if (line.trim() === '') {
      flushParagraph();
      if (inList) { result.push('</ul>'); inList = false; }
      continue;
    }

    // Text line — accumulate into paragraph
    if (inList) { result.push('</ul>'); inList = false; }
    paragraphLines.push(line);
  }

  // Close any open tags
  flushParagraph();
  if (inList) result.push('</ul>');
  if (inTable) result.push('</tbody></table>');
  if (inCodeBlock) result.push('</code></pre>');

  return sanitizeHtml(result.join('\n'));
}
