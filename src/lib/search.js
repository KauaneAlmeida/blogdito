// Shared search — wires up the search overlay (#searchOverlay) with live
// queries across posts, section_items and sidebar_posts.
// Results link to /post.html?id=X, ?item=X or ?sidebar=X depending on the source.

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Tiny debounce so we don't hammer the DB on every keystroke
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

function resultUrl(result) {
  if (result.source === 'post') return `/post.html?id=${encodeURIComponent(result.id)}`;
  if (result.source === 'item') return `/post.html?item=${encodeURIComponent(result.id)}`;
  if (result.source === 'sidebar') return `/post.html?sidebar=${encodeURIComponent(result.id)}`;
  return '#';
}

function sourceLabel(source) {
  if (source === 'post') return 'Post';
  if (source === 'item') return 'Card';
  if (source === 'sidebar') return 'Sidebar';
  return '';
}

function renderResults(results, query) {
  if (!query.trim()) {
    return '<div class="search-empty">Digite algo pra buscar…</div>';
  }
  if (results.length === 0) {
    return `<div class="search-empty">Nenhum resultado para <strong>${esc(query)}</strong>.</div>`;
  }
  return `
    <ul class="search-results-list">
      ${results.map(r => `
        <li>
          <a href="${resultUrl(r)}">
            <div class="search-result-thumb">
              ${r.image_url
                ? `<img src="${esc(r.image_url)}" alt="" style="object-position: ${esc(r.image_position || 'center center')};">`
                : '<div class="search-result-thumb-empty"></div>'}
            </div>
            <div class="search-result-info">
              <span class="search-result-meta">
                <span class="search-result-source">${esc(sourceLabel(r.source))}</span>
                ${r.category ? `<span class="search-result-cat">${esc(r.category)}</span>` : ''}
              </span>
              <h4>${esc(r.title)}</h4>
              ${r.excerpt ? `<p>${esc(r.excerpt)}</p>` : ''}
            </div>
          </a>
        </li>
      `).join('')}
    </ul>
  `;
}

async function runSearch(supabase, query) {
  const q = query.trim();
  if (!q) return [];

  // Build ilike pattern — escape % and _ so the literal characters work
  const pattern = `%${q.replace(/[%_]/g, m => '\\' + m)}%`;

  const [posts, items, sidebar] = await Promise.all([
    supabase
      .from('posts')
      .select('id, title, category, excerpt, image_url, image_position')
      .or(`title.ilike.${pattern},excerpt.ilike.${pattern},category.ilike.${pattern}`)
      .limit(8),
    supabase
      .from('section_items')
      .select('id, title, category, excerpt, image_url, image_position')
      .or(`title.ilike.${pattern},excerpt.ilike.${pattern},category.ilike.${pattern}`)
      .limit(8),
    supabase
      .from('sidebar_posts')
      .select('id, title, category, excerpt, image_url, image_position')
      .or(`title.ilike.${pattern},excerpt.ilike.${pattern},category.ilike.${pattern}`)
      .limit(8),
  ]);

  const all = [];
  (posts.data || []).forEach(p => all.push({ ...p, source: 'post' }));
  (items.data || []).forEach(i => all.push({ ...i, source: 'item' }));
  (sidebar.data || []).forEach(s => all.push({ ...s, source: 'sidebar' }));
  return all.slice(0, 15);
}

export function initSearch(supabase) {
  const overlay = document.getElementById('searchOverlay');
  const openBtn = document.getElementById('searchOpenBtn');
  const closeBtn = document.getElementById('searchCloseBtn');
  const input = document.getElementById('searchInput');
  const resultsEl = document.getElementById('searchResults');

  if (!overlay || !openBtn || !input || !resultsEl) return;

  const open = () => {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => input.focus(), 50);
    if (!input.value.trim()) {
      resultsEl.innerHTML = renderResults([], '');
    }
  };
  const close = () => {
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
  };

  openBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    overlay.classList.contains('active') ? close() : open();
  });
  if (closeBtn) closeBtn.addEventListener('click', close);

  // Close on click outside of overlay or the open button
  document.addEventListener('click', (e) => {
    if (!overlay.classList.contains('active')) return;
    if (overlay.contains(e.target) || openBtn.contains(e.target)) return;
    close();
  });

  // Close on Escape; open on Cmd/Ctrl+K
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      close();
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      overlay.classList.contains('active') ? close() : open();
    }
  });

  const debounced = debounce(async (q) => {
    if (!q.trim()) {
      resultsEl.innerHTML = renderResults([], '');
      return;
    }
    resultsEl.innerHTML = '<div class="search-empty">Buscando…</div>';
    try {
      const results = await runSearch(supabase, q);
      resultsEl.innerHTML = renderResults(results, q);
    } catch (err) {
      console.error(err);
      resultsEl.innerHTML = `<div class="search-empty">Erro ao buscar: ${esc(err.message)}</div>`;
    }
  }, 250);

  input.addEventListener('input', (e) => debounced(e.target.value));
}
