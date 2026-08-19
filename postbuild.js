import fs from 'fs';
import path from 'path';

const POSTS_METADATA = [
  { slug: 'welcome-to-my-new-portfolio' },
  { slug: 'understanding-data-pipelines' },
  { slug: 'dbt-best-practices' }
];

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

// 2. Generate fallback index.html for each individual post slug
POSTS_METADATA.forEach((post) => {
  const postDir = path.join(docsDir, 'blog', post.slug);
  fs.mkdirSync(postDir, { recursive: true });
  fs.writeFileSync(path.join(postDir, 'index.html'), indexContent);
  console.log(`Generated: docs/blog/${post.slug}/index.html`);
});

console.log('Post-build static routing setup completed successfully.');
