/**
 * Converts markdown text to HTML
 * @param markdown The markdown text to convert
 * @returns HTML string
 */
export const markdownToHtml = (markdown: string): string => {
  // Basic markdown to HTML conversion
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
    .replace(/`(.*?)`/g, '<code>$1</code>') // Code
    .replace(/\n/g, '<br>'); // Line breaks
};

/**
 * Sanitizes markdown text by removing potentially dangerous HTML
 * @param markdown The markdown text to sanitize
 * @returns Sanitized markdown string
 */
export const sanitizeMarkdown = (markdown: string): string => {
  return markdown
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]+>/g, ''); // Remove all HTML tags
};

/**
 * Converts HTML element to markdown
 * @param element The HTML element to convert
 * @returns Markdown string
 */
export function htmlToMarkdown(element: HTMLElement): string {
  let markdown = '';

  // Handle code blocks
  const codeBlocks = element.querySelectorAll('pre code');
  codeBlocks.forEach(block => {
    const language = block.getAttribute('class')?.split('-')[1] || '';
    markdown += `\`\`\`${language}\n${block.textContent}\n\`\`\`\n\n`;
  });

  // Handle links
  const links = element.querySelectorAll('a');
  links.forEach(link => {
    const text = link.textContent || '';
    const href = link.getAttribute('href') || '';
    markdown += `[${text}](${href})\n`;
  });

  // Handle lists
  const lists = element.querySelectorAll('ul, ol');
  lists.forEach(list => {
    const items = list.querySelectorAll('li');
    items.forEach(item => {
      const prefix = list.tagName === 'OL' ? '1. ' : '- ';
      markdown += `${prefix}${item.textContent}\n`;
    });
    markdown += '\n';
  });

  // Handle headings
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    const level = parseInt(heading.tagName[1]);
    const text = heading.textContent || '';
    markdown += `${'#'.repeat(level)} ${text}\n\n`;
  });

  // Handle paragraphs
  const paragraphs = element.querySelectorAll('p');
  paragraphs.forEach(p => {
    markdown += `${p.textContent}\n\n`;
  });

  // Handle inline code
  const inlineCode = element.querySelectorAll('code');
  inlineCode.forEach(code => {
    const text = code.textContent || '';
    markdown = markdown.replace(text, `\`${text}\``);
  });

  // Handle bold and italic
  const bold = element.querySelectorAll('strong, b');
  bold.forEach(b => {
    const text = b.textContent || '';
    markdown = markdown.replace(text, `**${text}**`);
  });

  const italic = element.querySelectorAll('em, i');
  italic.forEach(i => {
    const text = i.textContent || '';
    markdown = markdown.replace(text, `*${text}*`);
  });

  return markdown.trim();
} 