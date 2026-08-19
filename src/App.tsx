import { useState, useEffect } from 'react';
import { 
  User,
  BookOpen,
  Mail, 
  ArrowLeft, 
  ArrowRight, 
  Loader2 
} from 'lucide-react';
import './App.css';

interface PostMetadata {
  slug: string;
  title: string;
  date: string;
  description: string;
}

interface ParsedPost {
  title: string;
  date: string;
  description: string;
  body: string;
}

const POSTS_METADATA: PostMetadata[] = [
  {
    slug: 'welcome-to-my-new-portfolio',
    title: 'Welcome to my new Portfolio!',
    date: '2026-08-19',
    description: 'An introduction to my updated personal website, built with React, Vite, and simple Markdown.'
  },
  {
    slug: 'understanding-data-pipelines',
    title: 'Understanding Modern Data Pipelines',
    date: '2026-08-10',
    description: 'An introduction to the architecture of robust and scalable data pipelines.'
  },
  {
    slug: 'dbt-best-practices',
    title: 'Best Practices for dbt (Data Build Tool)',
    date: '2026-07-22',
    description: 'How to structure your dbt projects for cleaner, more maintainable data models.'
  }
];

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [postContent, setPostContent] = useState<ParsedPost | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Sync state with popstate event (browser back/forward button clicks)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Determine selected post slug from URL path (e.g. /blog/welcome-to-my-new-portfolio)
  let selectedPostSlug: string | null = null;
  if (currentPath.startsWith('/blog/')) {
    selectedPostSlug = currentPath.substring(6).replace(/\/$/, ''); // strip trailing slash if any
  }

  // Fetch and parse markdown post content when a slug is selected
  useEffect(() => {
    if (!selectedPostSlug) {
      setPostContent(null);
      setFetchError(null);
      return;
    }

    const fetchPost = async () => {
      setLoadingPost(true);
      setFetchError(null);
      try {
        const response = await fetch(`/content/blog/${selectedPostSlug}.md`);
        if (!response.ok) {
          throw new Error(`Failed to load article (${response.status} ${response.statusText})`);
        }
        const text = await response.text();
        
        // Standardize line endings to handle Windows/Linux carriage returns
        const normalizedText = text.replace(/\r\n/g, '\n');
        
        // Parse Frontmatter
        const parts = normalizedText.split('---');
        if (parts.length >= 3) {
          const frontmatter = parts[1];
          const body = parts.slice(2).join('---').trim();
          
          const metadata: Record<string, string> = {};
          frontmatter.split('\n').forEach(line => {
            const index = line.indexOf(':');
            if (index > -1) {
              const key = line.substring(0, index).trim();
              const value = line.substring(index + 1).trim().replace(/^['"]|['"]$/g, '');
              metadata[key] = value;
            }
          });

          setPostContent({
            title: metadata.title || 'Untitled',
            date: metadata.date || '',
            description: metadata.description || '',
            body
          });
        } else {
          // Fallback if no frontmatter
          const matchedMeta = POSTS_METADATA.find(p => p.slug === selectedPostSlug);
          setPostContent({
            title: matchedMeta?.title || 'Untitled',
            date: matchedMeta?.date || '',
            description: matchedMeta?.description || '',
            body: normalizedText
          });
        }
      } catch (err: any) {
        console.error('Error fetching markdown post:', err);
        setFetchError(err.message || 'An unknown error occurred while loading the article.');
      } finally {
        setLoadingPost(false);
      }
    };

    fetchPost();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedPostSlug]);

  const handleNavClick = (sectionId: string) => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Simple Markdown Renderer
  const renderMarkdown = (md: string) => {
    // Escaping basic HTML to prevent XSS
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

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
    const blockTags = ['<h3>', '<h2>', '<h1>', '<ul>', '</ul>', '<li>'];
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

    return { __html: html };
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const day = date.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day}. ${month}. ${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="app-wrapper">
      <header className="header">
        <div className="container-site header-content">
          <div className="logo-container">
            <span className="logo-badge">UK</span>
            <span className="logo-text">Usman <span className="logo-text-muted">Kamran</span></span>
          </div>

          <nav className="nav-links">
            <span className="nav-item text-mono" onClick={() => handleNavClick('about')}>
              <User size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> About Me
            </span>
            <span className="nav-item text-mono" onClick={() => handleNavClick('blog')}>
              <BookOpen size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Blog
            </span>
          </nav>

          <div>
            <span className="cta-button text-mono" onClick={() => handleNavClick('contact')}>
              Contact Me
            </span>
          </div>
        </div>
      </header>

      <main className="main-content">
        {selectedPostSlug ? (
          /* Blog Reader View */
          <div className="container-site">
            <div className="article-reader">
              <button className="btn-back text-mono" onClick={() => navigateTo('/')}>
                <ArrowLeft size={12} /> Back to home
              </button>

              {loadingPost ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                  <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-color)' }} />
                </div>
              ) : fetchError ? (
                <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                  <p style={{ color: '#bc4749', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '1.2rem', marginBottom: '1rem' }}>{fetchError}</p>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-ink-muted)', maxWidth: '500px', margin: '0 auto' }}>
                    There was an issue fetching the article content from the server. Please check your network connection, ensure the file exists on the server, or try reloading the page.
                  </p>
                </div>
              ) : postContent ? (
                <article>
                  <div className="article-header">
                    <div className="article-meta text-mono">{formatDate(postContent.date)}</div>
                    <h1 className="article-title">{postContent.title}</h1>
                  </div>
                  <div 
                    className="article-body" 
                    dangerouslySetInnerHTML={renderMarkdown(postContent.body)} 
                  />
                </article>
              ) : null}
            </div>
          </div>
        ) : (
          /* Standard Sections Layout */
          <>
            {/* 1. Welcome / About Section */}
            <section id="about" className="page-section">
              <div className="container-site hero-grid">
                <div className="hero-text-container">
                  <h1 className="hero-tagline">
                    Hi There, I am Usman.
                    <span className="hero-tagline-muted">I am into Data Engineering</span>
                  </h1>
                  <p className="hero-description">
                    Building robust, scalable data pipelines and managing large-scale database infrastructure to convert raw numbers into structured, impactful intelligence.
                  </p>
                  <div className="social-icons-row">
                    <a 
                      href="https://www.linkedin.com/in/usmankamran/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="social-btn"
                      title="LinkedIn"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                    </a>
                    <a 
                      href="https://github.com/K-Usman" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="social-btn"
                      title="GitHub"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                    </a>
                    <a 
                      href="mailto:me@usmankamran.de" 
                      className="social-btn"
                      title="Email"
                    >
                      <Mail size={18} />
                    </a>
                  </div>
                </div>

                <div className="profile-image-container">
                  <div className="profile-border-wrapper">
                    <img 
                      src="/Usman_DP.jfif" 
                      alt="Usman's Display Picture" 
                      className="profile-display-pic" 
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Recent Notes and Learnings Section */}
            <section id="blog" className="page-section">
              <div className="container-site">
                <p className="section-meta-heading text-mono">Notes from the Pipeline</p>
                <h2 className="section-main-title">Recent Notes & Learnings</h2>

                <div className="blog-cards-grid">
                  {POSTS_METADATA.map((post) => (
                    <article key={post.slug} className="blog-item-card">
                      <div className="card-top-meta text-mono">{formatDate(post.date)}</div>
                      <h3 className="card-title">{post.title}</h3>
                      <p className="card-excerpt">{post.description}</p>
                      <div className="card-bottom-row">
                        <button className="read-article-btn text-mono" onClick={() => navigateTo(`/blog/${post.slug}`)}>
                          Read The Article <ArrowRight size={12} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {/* 3. The Tech Stack Section */}
            <section id="stack" className="page-section">
              <div className="container-site">
                <p className="section-meta-heading text-mono">My Toolkit</p>
                <h2 className="section-main-title">The Tech Stack</h2>

                <div className="tech-stack-grid">
                  <div className="tech-column">
                    <h3 className="tech-column-title">Languages</h3>
                    <div className="tech-tags-list">
                      <span className="tech-tag text-mono">Python</span>
                      <span className="tech-tag text-mono">SQL</span>
                      <span className="tech-tag text-mono">TypeScript</span>
                      <span className="tech-tag text-mono">Shell Script</span>
                    </div>
                  </div>

                  <div className="tech-column">
                    <h3 className="tech-column-title">Tools & Frameworks</h3>
                    <div className="tech-tags-list">
                      <span className="tech-tag text-mono">dbt</span>
                      <span className="tech-tag text-mono">Apache Airflow</span>
                      <span className="tech-tag text-mono">Apache Spark</span>
                      <span className="tech-tag text-mono">Docker</span>
                      <span className="tech-tag text-mono">Git</span>
                    </div>
                  </div>

                  <div className="tech-column">
                    <h3 className="tech-column-title">IDE's</h3>
                    <div className="tech-tags-list">
                      <span className="tech-tag text-mono">VS Code</span>
                      <span className="tech-tag text-mono">PyCharm</span>
                      <span className="tech-tag text-mono">Jupyter</span>
                    </div>
                  </div>

                  <div className="tech-column">
                    <h3 className="tech-column-title">Cloud Platforms</h3>
                    <div className="tech-tags-list">
                      <span className="tech-tag text-mono">GCP</span>
                      <span className="tech-tag text-mono">AWS</span>
                      <span className="tech-tag text-mono">Snowflake</span>
                      <span className="tech-tag text-mono">BigQuery</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <footer id="contact" className="footer">
        <div className="container-site footer-grid">
          <div>
            <div className="logo-container" style={{ marginBottom: '1rem' }}>
              <span className="logo-badge">UK</span>
              <span className="logo-text">Usman <span className="logo-text-muted">Kamran</span></span>
            </div>
            <p className="footer-description">
              Data Engineer focused on building verifiably correct pipelines and robust data systems. Let's build something together.
            </p>
          </div>

          <div>
            <h3 className="footer-links-title text-mono">Contact Details</h3>
            <div className="footer-links-list">
              <a href="mailto:me@usmankamran.de" className="footer-link-item text-mono">me@usmankamran.de</a>
              <span className="footer-link-item text-mono" style={{ color: 'var(--text-ink-muted)' }}>+49 179 6816222</span>
              <span className="footer-link-item text-mono" style={{ color: 'var(--text-ink-muted)' }}>Bad Homburg, Germany</span>
            </div>
          </div>
        </div>

        <div className="container-site footer-bottom-row text-mono" style={{ fontSize: '10px' }}>
          <span>© {new Date().getFullYear()} Usman Kamran. All rights reserved.</span>
          <span>usmankamran.de</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
