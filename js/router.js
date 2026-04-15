/* ============================================================
   ROUTER.JS
   Loads post and project data from JSON manifests and
   populates listing pages (blog.html, index.html, projects.html).
   Handles tag-based filtering on the blog page.
   ============================================================ */

const SiteRouter = (() => {

  /**
   * Format date string to display format.
   */
  function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  /**
   * Render a post card (used on index.html featured section).
   */
  function postCardHTML(post) {
    const tags = (post.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    return `
      <article class="post-card">
        <span class="post-date">${formatDate(post.date)}</span>
        <h3 class="post-card-title"><a href="post.html?slug=${post.slug}">${post.title}</a></h3>
        <p class="post-excerpt">${post.excerpt}</p>
        <div class="post-tags">${tags}</div>
      </article>
    `;
  }

  /**
   * Render a post list item (used on blog.html).
   */
  function postListItemHTML(post) {
    const tags = (post.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
    const dataTags = (post.tags || []).map(t => t.toLowerCase()).join(',');
    return `
      <article class="post-list-item" data-tags="${dataTags}">
        <div class="post-list-date">
          <span class="post-date">${formatDate(post.date)}</span>
        </div>
        <div class="post-list-body">
          <h2 class="post-list-title"><a href="post.html?slug=${post.slug}">${post.title}</a></h2>
          <p class="post-excerpt">${post.excerpt}</p>
          <div class="post-tags">${tags}</div>
        </div>
      </article>
    `;
  }

  /**
   * Render a project card (used on index.html).
   */
  function projectCardHTML(project) {
    const tech = (project.tech || []).map(t => `<span class="tech">${t}</span>`).join('');
    return `
      <article class="project-card">
        <div class="project-number">${project.number}</div>
        <h3 class="project-card-title">${project.title}</h3>
        <p class="project-desc">${project.description}</p>
        <div class="project-tech">${tech}</div>
      </article>
    `;
  }

  /**
   * Render a detailed project card (used on projects.html).
   */
  function projectDetailHTML(project) {
    const tech = (project.tech || []).map(t => `<span class="tech">${t}</span>`).join('');
    const statusClass = project.status === 'active' ? 'status-active' : 'status-complete';
    const statusLabel = project.status === 'active' ? 'In progress' : 'Completed';
    const links = (project.links || [])
      .map(l => `<a href="${l.url}" class="project-link">${l.label} &rarr;</a>`)
      .join('');

    return `
      <article class="project-detail-card">
        <div class="project-detail-header">
          <span class="project-number">${project.number}</span>
          <div class="project-status ${statusClass}">${statusLabel}</div>
        </div>
        <h2 class="project-detail-title">${project.title}</h2>
        <p class="project-detail-desc">${project.description}</p>
        <div class="project-detail-meta">
          <div class="project-tech">${tech}</div>
          ${links ? `<div class="project-links">${links}</div>` : ''}
        </div>
      </article>
    `;
  }

  /**
   * Build tag filter buttons from post data.
   */
  function buildFilters(posts, container) {
    const allTags = new Set();
    posts.forEach(p => (p.tags || []).forEach(t => allTags.add(t)));

    // Keep existing "All" button, add tag buttons
    const sortedTags = [...allTags].sort();
    sortedTags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.filter = tag.toLowerCase();
      btn.textContent = tag;
      container.appendChild(btn);
    });

    // Click handler for filtering
    container.addEventListener('click', (e) => {
      if (!e.target.classList.contains('filter-btn')) return;

      // Update active state
      container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      const filter = e.target.dataset.filter;
      const items = document.querySelectorAll('.post-list-item');

      items.forEach(item => {
        if (filter === 'all') {
          item.style.display = '';
        } else {
          const tags = (item.dataset.tags || '').split(',');
          item.style.display = tags.includes(filter) ? '' : 'none';
        }
      });
    });
  }

  /**
   * Sort posts by date, newest first.
   */
  function sortByDate(posts) {
    return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Initialize: detect which page we're on and load appropriate data.
   */
  async function init() {
    const page = window.location.pathname.split('/').pop() || 'index.html';

    try {
      // --- INDEX PAGE: load featured posts + projects ---
      if (page === 'index.html' || page === '') {
        const featuredPostsEl = document.getElementById('featured-posts');
        const featuredProjectsEl = document.getElementById('featured-projects');

        if (featuredPostsEl) {
          const res = await fetch('posts/index.json');
          if (res.ok) {
            const posts = sortByDate(await res.json());
            featuredPostsEl.innerHTML = posts.slice(0, 3).map(postCardHTML).join('');
          }
        }

        if (featuredProjectsEl) {
          const res = await fetch('projects/index.json');
          if (res.ok) {
            const projects = await res.json();
            const featured = projects.filter(p => p.featured);
            featuredProjectsEl.innerHTML = featured.map(projectCardHTML).join('');
          }
        }
      }

      // --- BLOG PAGE: load all posts + set up filters ---
      if (page === 'blog.html') {
        const postListEl = document.getElementById('post-list');
        const filtersEl = document.getElementById('blog-filters');

        if (postListEl) {
          const res = await fetch('posts/index.json');
          if (res.ok) {
            const posts = sortByDate(await res.json());
            postListEl.innerHTML = posts.map(postListItemHTML).join('');

            // Stagger fade-in animation
            postListEl.querySelectorAll('.post-list-item').forEach((item, i) => {
              item.style.animationDelay = `${i * 0.08}s`;
            });

            if (filtersEl) buildFilters(posts, filtersEl);
          }
        }
      }

      // --- PROJECTS PAGE: load all projects ---
      if (page === 'projects.html') {
        const projectListEl = document.getElementById('project-list');

        if (projectListEl) {
          const res = await fetch('projects/index.json');
          if (res.ok) {
            const projects = await res.json();
            projectListEl.innerHTML = projects.map(projectDetailHTML).join('');
          }
        }
      }

    } catch (err) {
      console.error('Router error:', err);
    }
  }

  return { init };
})();

// Run on DOM ready
document.addEventListener('DOMContentLoaded', SiteRouter.init);
