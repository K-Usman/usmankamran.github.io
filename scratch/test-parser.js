const md = `Here is a diagram representing the data architecture:

![Architecture](\\images\\Architecture.png)

View the code on [github](https://github.com/K-Usman/PostgreSQL-Data-Warehouse-with-Medallion-Architecture)

Here is the Power BI Dashboard created based on star schema answering basic analytics questions:
![BI Report](\\images\\report.png)`;

const renderMarkdown = (md) => {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Images
  html = html.replace(/!\[(.*?)\]\((.*?)\)/g, (_match, alt, url) => {
    const normalizedUrl = url.replace(/\\/g, '/');
    return `<img src="${normalizedUrl}" alt="${alt}" style="max-width: 100%; height: auto; display: block; margin: 1.5rem 0; border: 1px solid var(--border-line); background: var(--bg-surface); padding: 0.5rem;" />`;
  });

  // Inline Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, (_match, text, url) => {
    const normalizedUrl = url.replace(/\\/g, '/');
    return `<a href="${normalizedUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

  // Headings
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Unordered Lists
  let inList = false;
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      let result = '';
      if (!inList) {
        inList = true;
        result += '<ul>';
      }
      result += `<li>${listMatch[1]}</li>`;
      return result;
    } else {
      let result = '';
      if (inList) {
        inList = false;
        result += '</ul>';
      }
      return result + line;
    }
  });
  if (inList) {
    processedLines.push('</ul>');
  }
  html = processedLines.join('\n');

  // Paragraphs
  const blockTags = ['<h3>', '<h2>', '<h1>', '<ul>', '</ul>', '<li>', '<img', '<a'];
  html = html
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      const isBlock = blockTags.some(tag => trimmed.startsWith(tag) || trimmed.endsWith(tag));
      return isBlock ? trimmed : `<p>${trimmed}</p>`;
    })
    .filter(Boolean)
    .join('');

  return html;
};

console.log('Result HTML:');
console.log(renderMarkdown(md));
