import fs from 'fs';
import path from 'path';

const docsDir = path.resolve('docs');
const indexHtmlPath = path.join(docsDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('Error: docs/index.html not found! Run vite build first.');
  process.exit(1);
}

const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Generate fallback index.html for /blog/ listing
const blogDir = path.join(docsDir, 'blog');
fs.mkdirSync(blogDir, { recursive: true });
fs.writeFileSync(path.join(blogDir, 'index.html'), indexContent);
console.log('Generated: docs/blog/index.html');

// 2. Dynamically scan public/content/blog/ to find all post slugs
const blogSourceDir = path.resolve('public', 'content', 'blog');
if (fs.existsSync(blogSourceDir)) {
  const files = fs.readdirSync(blogSourceDir);
  const slugs = files
    .filter(file => file.endsWith('.md'))
    .map(file => file.replace(/\.md$/, ''));

  // 3. Generate fallback index.html for each individual post slug
  slugs.forEach((slug) => {
    const postDir = path.join(docsDir, 'blog', slug);
    fs.mkdirSync(postDir, { recursive: true });
    fs.writeFileSync(path.join(postDir, 'index.html'), indexContent);
    console.log(`Generated: docs/blog/${slug}/index.html`);
  });
} else {
  console.warn('Warning: public/content/blog directory not found. No slugs generated.');
}

console.log('Post-build static routing setup completed successfully.');
