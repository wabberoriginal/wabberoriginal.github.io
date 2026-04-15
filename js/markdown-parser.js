/* ============================================================
   MARKDOWN-PARSER.JS
   Fetches .md files, converts to HTML, injects into post.html.
   Also handles post metadata and prev/next navigation.
   
   Supports: headings, bold, italic, links, images, code blocks,
   inline code, blockquotes, lists (ul/ol), horizontal rules,
   paragraphs, and LaTeX math (basic rendering).
   ============================================================ */

const MarkdownParser = (() => {

  /**
   * Convert a markdown string to HTML.
   * Processes block-level elements first, then inline.
   */
  function parse(md) {
    // Normalize line endings
    md = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Extract code blocks before processing anything else
    const codeBlocks = [];
    md = md.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const index = codeBlocks.length;
      const escaped = escapeHtml(code.trimEnd());
      const langAttr = lang ? ` class="language-${lang}"` : '';
      codeBlocks.push(`<pre><code${langAttr}>${escaped}</code></pre>`);
      return `\n%%CODEBLOCK_${index}%%\n`;
    });

    // Extract inline code before other inline processing
    const inlineCodes = [];
    md = md.replace(/`([^`\n]+)`/g, (_, code) => {
      const index = inlineCodes.length;
      inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
      return `%%INLINECODE_${index}%%`;
    });

    // Extract LaTeX block math ($$...$$)
    const mathBlocks = [];
    md = md.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      const index = mathBlocks.length;
      mathBlocks.push(`<div class="math-block">${escapeHtml(math.trim())}</div>`);
      return `\n%%MATHBLOCK_${index}%%\n`;
    });

    // Extract inline math ($...$)
    const inlineMaths = [];
    md = md.replace(/\$([^\$\n]+)\$/g, (_, math) => {
      const index = inlineMaths.length;
      inlineMaths.push(`<span class="math-inline">${escapeHtml(math)}</span>`);
      return `%%INLINEMATH_${index}%%`;
    });

    // Split into lines and process block elements
    const lines = md.split('\n');
    let html = '';
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Blank line
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Code block placeholder
      if (line.trim().startsWith('%%CODEBLOCK_')) {
        html += line.trim().replace(/%%CODEBLOCK_(\d+)%%/, (_, idx) => codeBlocks[idx]);
        i++;
        continue;
      }

      // Math block placeholder
      if (line.trim().startsWith('%%MATHBLOCK_')) {
        html += line.trim().replace(/%%MATHBLOCK_(\d+)%%/, (_, idx) => mathBlocks[idx]);
        i++;
        continue;
      }

      // Horizontal rule
      if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
        html += '<hr>';
        i++;
        continue;
      }

      // Headings (# to ######)
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = processInline(headingMatch[2]);
        const id = slugify(headingMatch[2]);
        html += `<h${level} id="${id}">${text}</h${level}>`;
        i++;
        continue;
      }

      // Blockquote
      if (line.startsWith('>')) {
        let quoteLines = [];
        while (i < lines.length && (lines[i].startsWith('>') || (lines[i].trim() !== '' && quoteLines.length > 0 && !lines[i].startsWith('#')))) {
          if (lines[i].startsWith('>')) {
            quoteLines.push(lines[i].replace(/^>\s?/, ''));
          } else {
            quoteLines.push(lines[i]);
          }
          i++;
        }
        html += `<blockquote><p>${processInline(quoteLines.join(' '))}</p></blockquote>`;
        continue;
      }

      // Unordered list
      if (/^[-*+]\s+/.test(line)) {
        let items = [];
        while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
          items.push(processInline(lines[i].replace(/^[-*+]\s+/, '')));
          i++;
        }
        html += '<ul>' + items.map(item => `<li>${item}</li>`).join('') + '</ul>';
        continue;
      }

      // Ordered list
      if (/^\d+\.\s+/.test(line)) {
        let items = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
          items.push(processInline(lines[i].replace(/^\d+\.\s+/, '')));
          i++;
        }
        html += '<ol>' + items.map(item => `<li>${item}</li>`).join('') + '</ol>';
        continue;
      }

      // Paragraph (collect consecutive non-blank, non-block lines)
      {
        let paraLines = [];
        while (
          i < lines.length &&
          lines[i].trim() !== '' &&
          !lines[i].startsWith('#') &&
          !lines[i].startsWith('>') &&
          !/^[-*+]\s+/.test(lines[i]) &&
          !/^\d+\.\s+/.test(lines[i]) &&
          !/^(-{3,}|_{3,}|\*{3,})$/.test(lines[i].trim()) &&
          !lines[i].trim().startsWith('%%CODEBLOCK_') &&
          !lines[i].trim().startsWith('%%MATHBLOCK_')
        ) {
          paraLines.push(lines[i]);
          i++;
        }
        if (paraLines.length > 0) {
          html += `<p>${processInline(paraLines.join('\n'))}</p>`;
        }
      }
    }

    // Restore inline code placeholders
    html = html.replace(/%%INLINECODE_(\d+)%%/g, (_, idx) => inlineCodes[idx]);

    // Restore inline math placeholders
    html = html.replace(/%%INLINEMATH_(\d+)%%/g, (_, idx) => inlineMaths[idx]);

    return html;
  }

  /**
   * Process inline markdown: bold, italic, links, images, line breaks.
   */
  function processInline(text) {
    // Images: ![alt](src)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');

    // Links: [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Bold + italic: ***text*** or ___text___
    text = text.replace(/\*{3}(.+?)\*{3}/g, '<strong><em>$1</em></strong>');
    text = text.replace(/_{3}(.+?)_{3}/g, '<strong><em>$1</em></strong>');

    // Bold: **text** or __text__
    text = text.replace(/\*{2}(.+?)\*{2}/g, '<strong>$1</strong>');
    text = text.replace(/_{2}(.+?)_{2}/g, '<strong>$1</strong>');

    // Italic: *text* or _text_
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');

    // Strikethrough: ~~text~~
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Line breaks (two trailing spaces or explicit <br>)
    text = text.replace(/ {2,}\n/g, '<br>');

    return text;
  }

  /**
   * Escape HTML entities in code blocks.
   */
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, c => map[c]);
  }

  /**
   * Generate a URL-friendly slug from a heading.
   */
  function slugify(text) {
    return text
      .toLowerCase()
      .replace(/<[^>]+>/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Estimate reading time from markdown text.
   */
  function readingTime(md) {
    const words = md.replace(/```[\s\S]*?```/g, '').split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(words / 220));
    return `${minutes} min read`;
  }

  /**
   * Format a date string (YYYY-MM-DD) to a readable format.
   */
  function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  // Public API
  return { parse, readingTime, formatDate };
})();


/* ============================================================
   POST LOADER
   Runs on post.html — reads ?slug= param, fetches metadata
   and markdown, renders into the page.
   ============================================================ */

(async function loadPost() {
  // Only run on post.html
  const contentEl = document.getElementById('post-content');
  if (!contentEl) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  if (!slug) {
    contentEl.innerHTML = '<p>No post specified. <a href="blog.html">Browse all posts</a>.</p>';
    return;
  }

  try {
    // Fetch post index
    const indexRes = await fetch('posts/index.json');
    if (!indexRes.ok) throw new Error('Could not load post index.');
    const posts = await indexRes.json();

    // Find the requested post
    const postIndex = posts.findIndex(p => p.slug === slug);
    if (postIndex === -1) {
      contentEl.innerHTML = '<p>Post not found. <a href="blog.html">Browse all posts</a>.</p>';
      return;
    }

    const post = posts[postIndex];

    // Update page title and meta
    document.title = `${post.title} — Simon`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', post.excerpt);

    // Populate header
    document.getElementById('post-title').textContent = post.title;
    document.getElementById('post-date').textContent = MarkdownParser.formatDate(post.date);

    // Fetch and render markdown
    const mdRes = await fetch(`posts/${post.file}`);
    if (!mdRes.ok) throw new Error('Could not load post file.');
    let md = await mdRes.text();

    // Strip the first H1 if it matches the title (avoid duplication)
    md = md.replace(/^#\s+.*\n+/, '');

    // Set reading time
    document.getElementById('post-reading-time').textContent = MarkdownParser.readingTime(md);

    // Render tags
    const tagsEl = document.getElementById('post-tags');
    if (tagsEl && post.tags) {
      tagsEl.innerHTML = post.tags.map(t => `<span class="tag">${t}</span>`).join('');
    }

    // Render markdown to HTML
    contentEl.innerHTML = MarkdownParser.parse(md);

    // Prev/next navigation
    setupPostNav(posts, postIndex);

  } catch (err) {
    console.error('Post loading error:', err);
    contentEl.innerHTML = `<p>Error loading post. <a href="blog.html">Browse all posts</a>.</p>`;
  }
})();


/**
 * Set up prev/next post navigation links.
 */
function setupPostNav(posts, currentIndex) {
  const prevLink = document.getElementById('post-prev');
  const nextLink = document.getElementById('post-next');
  const prevTitle = document.getElementById('post-prev-title');
  const nextTitle = document.getElementById('post-next-title');

  if (!prevLink || !nextLink) return;

  // Newer post (previous in array = more recent)
  if (currentIndex > 0) {
    const prev = posts[currentIndex - 1];
    prevLink.href = `post.html?slug=${prev.slug}`;
    prevTitle.textContent = prev.title;
  } else {
    prevLink.style.visibility = 'hidden';
  }

  // Older post (next in array = older)
  if (currentIndex < posts.length - 1) {
    const next = posts[currentIndex + 1];
    nextLink.href = `post.html?slug=${next.slug}`;
    nextTitle.textContent = next.title;
  } else {
    nextLink.style.visibility = 'hidden';
  }
}
