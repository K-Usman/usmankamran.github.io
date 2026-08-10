import { useState, useEffect } from 'react';
import { 
  Mail, 
  ArrowLeft, 
  ArrowRight, 
  BookOpen, 
  Loader2 
} from 'lucide-react';
import './App.css';

interface Post {
  slug: string;
  title: string;
  date: string;
  description: string;
  body: string;
}

// Vite compile-time import of local posts
const localPostModules = import.meta.glob('/public/content/blog/*.json', { eager: true });

const staticPosts: Post[] = Object.keys(localPostModules).map((path) => {
  const slug = path.split('/').pop()?.replace('.json', '') || '';
  const data = (localPostModules[path] as any).default || localPostModules[path];
  return {
    slug,
    title: data.title || 'Untitled',
    date: data.date || new Date().toISOString(),
    description: data.description || '',
    body: data.body || '',
  };
});

function App() {
  const [posts, setPosts] = useState<Post[]>(staticPosts);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Scroll to top when post changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedPost]);

  useEffect(() => {
    // Dynamically fetch the latest blog posts from GitHub API in production.
    // This allows Decap CMS changes to show up immediately without rebuilding the site!
    const fetchLatestPosts = async () => {
      if (import.meta.env.DEV) {
        // In local development, we already have the local filesystem posts eager loaded
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(
          'https://api.github.com/repos/K-Usman/usmankamran.github.io/contents/public/content/blog'
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch blog list from GitHub Contents API');
        }

        const files = await response.json();
        if (!Array.isArray(files)) return;

        const jsonFiles = files.filter(file => file.name.endsWith('.json'));
        
        const fetchedPosts = await Promise.all(
          jsonFiles.map(async (file) => {
            const postResponse = await fetch(file.download_url);
            if (!postResponse.ok) {
              throw new Error(`Failed to fetch post details for ${file.name}`);
            }
            const data = await postResponse.json();
            const slug = file.name.replace('.json', '');
            return {
              slug,
              title: data.title || 'Untitled',
              date: data.date || new Date().toISOString(),
              description: data.description || '',
              body: data.body || '',
            };
          })
        );

        // Sort posts newest first
        fetchedPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPosts(fetchedPosts);
      } catch (err) {
        console.warn('GitHub API failed, falling back to pre-bundled posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestPosts();
  }, []);

  // Simple Markdown Renderer
  const renderMarkdown = (md: string) => {
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$2</h2>');
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
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="app-wrapper">
      <div className="glow-spot-1"></div>
      <div className="glow-spot-2"></div>

      <header className="header">
        <div className="container header-content">
          <div className="logo-text">Usman Kamran</div>
          <a href="/admin/index.html" className="admin-link">
            CMS Portal
          </a>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          {selectedPost ? (
            /* Post Reader Mode */
            <div className="reader-container">
              <button className="back-btn" onClick={() => setSelectedPost(null)}>
                <ArrowLeft size={16} /> Back to home
              </button>
              <article>
                <div className="reader-header">
                  <h1 className="reader-title">{selectedPost.title}</h1>
                  <div className="reader-meta">
                    <span className="reader-date">
                      Published {formatDate(selectedPost.date)}
                    </span>
                  </div>
                </div>
                <div 
                  className="reader-body" 
                  dangerouslySetInnerHTML={renderMarkdown(selectedPost.body)} 
                />
              </article>
            </div>
          ) : (
            /* Home Mode */
            <>
              {/* Hero Section */}
              <section className="hero-section">
                <div className="hero-text-container">
                  <h1 className="hero-title">
                    <span className="name">Hi There, I am Usman.</span>
                    <span className="role">I am into Data Engineering</span>
                  </h1>
                  <p className="hero-description">
                    Building robust, scalable data pipelines and managing large-scale database infrastructure to convert raw numbers into structured, impactful intelligence.
                  </p>
                  <div className="contact-row">
                    <a 
                      href="https://www.linkedin.com/in/usmankamran/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="social-icon-btn linkedin"
                      title="LinkedIn Profile"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-linkedin"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                    </a>
                    <a 
                      href="https://github.com/K-Usman" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="social-icon-btn github"
                      title="GitHub Profile"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-github"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
                    </a>
                    <a 
                      href="mailto:me@usmankamran.de" 
                      className="social-icon-btn email"
                      title="Send Email"
                    >
                      <Mail size={22} />
                    </a>
                  </div>
                </div>
                <div className="hero-image-container">
                  <div className="profile-pic-wrapper">
                    <img 
                      src="/Usman_DP.jfif" 
                      alt="Usman's Display Picture" 
                      className="profile-pic" 
                    />
                    <div className="pulse-ring"></div>
                  </div>
                </div>
              </section>

              {/* Blog Listings Section */}
              <section className="posts-section">
                <h2 className="section-title">
                  <BookOpen size={22} style={{ color: 'var(--primary-color)' }} />
                  Recent Notes & Learnings
                </h2>

                {loading && posts.length === 0 ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
                    <Loader2 className="animate-spin" size={32} style={{ color: 'var(--primary-color)' }} />
                  </div>
                ) : posts.length > 0 ? (
                  <div className="posts-grid">
                    {posts.map((post) => (
                      <div 
                        key={post.slug} 
                        className="post-card" 
                        onClick={() => setSelectedPost(post)}
                      >
                        <div>
                          <div className="post-header">
                            <h3 className="post-title">{post.title}</h3>
                            <span className="post-date">{formatDate(post.date)}</span>
                          </div>
                          <p className="post-description">{post.description}</p>
                        </div>
                        <div className="post-footer">
                          Read Full Article <ArrowRight size={16} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-posts">
                    <p>No blog posts found.</p>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      Log in to the CMS Portal above to write your first post.
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <p>© {new Date().getFullYear()} Usman Kamran. Built with React + Decap CMS.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
