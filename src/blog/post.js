import './style.css';
import { supabase } from '../lib/supabase.js';
import { mountLogo, renderLogoHtml } from '../lib/logo.js';
import { initSearch } from '../lib/search.js';

// ===== Theme toggle =====
function initTheme() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  const body = document.body;
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    body.classList.add('light');
  }
  toggle.addEventListener('click', () => {
    body.classList.toggle('light');
    const isLight = body.classList.contains('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  });
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Only allow safe URLs in user-provided links (http, https, mailto, relative paths)
function safeUrl(url) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return '#';
  if (/^(https?:|mailto:|\/|#)/i.test(trimmed)) return trimmed;
  return '#';
}

// Converts plain-text content (with line breaks) to HTML paragraphs.
// Escapes HTML first, then reinserts markdown-style links [texto](url),
// bracket-wrapped URLs [https://url.com], and bare http(s) URLs as real
// anchor tags. This keeps XSS protection while letting admins add links
// in the textarea.
function contentToHtml(content) {
  if (!content) return '';
  const linkify = (escaped) => {
    // 1) Markdown-style: [label](url)
    let out = escaped.replace(
      /\[([^\]]+)\]\(([^)\s]+)\)/g,
      (_, label, url) => `<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${label}</a>`
    );
    // 2) Bracket-wrapped URL: [https://url.com] — renders the URL itself as the link label
    out = out.replace(
      /\[((?:https?:\/\/|mailto:)[^\]\s]+)\]/g,
      (_, url) => `<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );
    // 3) Bare http(s) URLs (not already inside an href)
    out = out.replace(
      /(^|[\s(])((?:https?:\/\/)[^\s<)]+)/g,
      (_, pre, url) => `${pre}<a href="${esc(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );
    return out;
  };
  return content
    .split(/\n{2,}/)
    .map(p => `<p>${linkify(esc(p)).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function renderPost(post) {
  const img = post.image_url || 'https://picsum.photos/seed/default/1600/900';
  const objPos = post.image_position || 'center center';
  return `
    <a href="/" class="back-link">← Voltar</a>
    <div class="post-detail-header">
      ${post.category ? `<span class="category-badge">${esc(post.category)}</span>` : ''}
      <h1>${esc(post.title)}</h1>
      ${post.excerpt ? `<p class="post-detail-excerpt">${esc(post.excerpt)}</p>` : ''}
      <div class="post-detail-meta">
        <span>Publicado em ${esc(formatDate(post.created_at))}</span>
        ${post.updated_at && post.updated_at !== post.created_at
          ? `<span> · Atualizado em ${esc(formatDate(post.updated_at))}</span>`
          : ''}
      </div>
    </div>
    <div class="post-detail-hero">
      <img src="${esc(img)}" alt="${esc(post.title)}" style="object-position: ${esc(objPos)};">
    </div>
    <div class="post-detail-body">
      ${contentToHtml(post.content) || '<p class="post-detail-empty">Este post ainda não tem conteúdo completo.</p>'}
    </div>
  `;
}

function renderFooter(config) {
  const tagline = config.footer_tagline || '';
  const copyright = config.footer_copyright || '';
  return `
    <footer>
      <div class="container">
        <div class="footer-grid">
          <div class="footer-col">
            <a href="/" class="logo">${renderLogoHtml(config)}</a>
            <p style="margin-top:14px;">${esc(tagline)}</p>
          </div>
          <div class="footer-col">
            <h4>Links Rápidos</h4>
            <ul>
              <li><a href="/">Sobre</a></li>
              <li><a href="/">Mentoria</a></li>
              <li><a href="/">Consultoria</a></li>
              <li><a href="/">Contato</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Siga nas redes</h4>
            <p>Acompanhe nossas dicas diárias</p>
            <div class="social">
              <a href="#" aria-label="Instagram">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
                </svg>
              </a>
              <a href="#" aria-label="YouTube">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"></path>
                  <path d="m10 15 5-3-5-3z"></path>
                </svg>
              </a>
              <a href="#" aria-label="Facebook">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                </svg>
              </a>
            </div>
          </div>
        </div>
        <hr>
        <p class="copyright">${esc(copyright)}</p>
      </div>
    </footer>
  `;
}

function renderSidebarPosts(items, currentId) {
  const list = (items || []).filter(p => p.id !== currentId).slice(0, 6);
  if (list.length === 0) return '';
  const urlFor = (p) => {
    if (p._source === 'item') return `/post.html?item=${encodeURIComponent(p.id)}`;
    if (p._source === 'sidebar') return `/post.html?sidebar=${encodeURIComponent(p.id)}`;
    return `/post.html?id=${encodeURIComponent(p.id)}`;
  };
  return `
    <div class="post-sidebar-block">
      <h4 class="post-sidebar-title">Leia também</h4>
      <ul class="post-sidebar-list">
        ${list.map(p => `
          <li>
            <a href="${urlFor(p)}">
              <div class="post-sidebar-thumb">
                <img src="${esc(p.image_url || 'https://picsum.photos/seed/' + p.id + '/400/280')}" alt="" style="object-position: ${esc(p.image_position || 'center center')};">
              </div>
              <div class="post-sidebar-info">
                <span class="post-sidebar-cat">${esc(p.category || '')}</span>
                <h5>${esc(p.title)}</h5>
              </div>
            </a>
          </li>
        `).join('')}
      </ul>
    </div>
  `;
}

async function loadPost() {
  const container = document.getElementById('postDetail');
  const sidebarContainer = document.getElementById('postSidebar');
  const params = new URLSearchParams(window.location.search);
  const postId = params.get('id');
  const itemId = params.get('item');
  const sidebarId = params.get('sidebar');
  let table = 'posts';
  let targetId = postId;
  if (itemId) {
    table = 'section_items';
    targetId = itemId;
  } else if (sidebarId) {
    table = 'sidebar_posts';
    targetId = sidebarId;
  }

  if (!targetId) {
    container.innerHTML = `
      <a href="/" class="back-link">← Voltar</a>
      <div class="post-detail-error">
        <h1>Conteúdo não encontrado</h1>
        <p>O link que você acessou está faltando o identificador.</p>
      </div>
    `;
    return;
  }

  // Resilient related-content fetch: tries the full select first, falls back
  // to a minimal select if the DB is missing optional columns (e.g. image_position)
  const fetchRelated = async (tableName) => {
    const full = await supabase
      .from(tableName)
      .select('id, title, category, image_url, image_position')
      .order('created_at', { ascending: false })
      .limit(6);
    if (!full.error) return full.data || [];
    const fallback = await supabase
      .from(tableName)
      .select('id, title, category, image_url')
      .limit(6);
    return fallback.data || [];
  };

  const [
    { data: post, error },
    { data: configRows },
    relatedPosts,
    relatedItems,
    relatedSidebar,
  ] = await Promise.all([
    supabase.from(table).select('*').eq('id', targetId).maybeSingle(),
    supabase.from('site_config').select('*'),
    fetchRelated('posts'),
    fetchRelated('section_items'),
    fetchRelated('sidebar_posts'),
  ]);

  // Merge related from all 3 sources, tagging each with its source so we link correctly
  const sidebarPosts = [
    ...relatedPosts.map(p => ({ ...p, _source: 'post' })),
    ...relatedItems.map(p => ({ ...p, _source: 'item' })),
    ...relatedSidebar.map(p => ({ ...p, _source: 'sidebar' })),
  ];

  const config = {};
  (configRows || []).forEach(row => { config[row.key] = row.value; });

  // Site logo in header
  mountLogo('siteLogo', config);

  const footerSlot = document.getElementById('footer-slot');
  if (footerSlot) footerSlot.innerHTML = renderFooter(config);

  if (error) {
    container.innerHTML = `
      <a href="/" class="back-link">← Voltar</a>
      <div class="post-detail-error">
        <h1>Erro ao carregar</h1>
        <p>${esc(error.message)}</p>
      </div>
    `;
    return;
  }

  if (!post) {
    container.innerHTML = `
      <a href="/" class="back-link">← Voltar</a>
      <div class="post-detail-error">
        <h1>Post não encontrado</h1>
        <p>Não achamos nenhum post com esse identificador.</p>
      </div>
    `;
    return;
  }

  document.title = `${post.title} - Partiu Intercâmbio`;
  container.innerHTML = renderPost(post);

  if (sidebarContainer) {
    sidebarContainer.innerHTML = renderSidebarPosts(sidebarPosts, targetId);
  }
}

initTheme();
initSearch(supabase);
loadPost();
