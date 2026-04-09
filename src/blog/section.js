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

function itemUrl(item) {
  return `/post.html?item=${encodeURIComponent(item.id)}`;
}

function renderItemCard(item) {
  const img = item.image_url || `https://picsum.photos/seed/${item.id}/800/600`;
  const objPos = item.image_position || 'center center';
  return `
    <a href="${itemUrl(item)}" class="section-card">
      <div class="img-wrap">
        <img src="${esc(img)}" alt="${esc(item.title)}" style="object-position: ${esc(objPos)};">
      </div>
      ${item.category ? `<span class="cat">${esc(item.category)}</span>` : ''}
      <h3>${esc(item.title)}</h3>
      ${item.excerpt ? `<p>${esc(item.excerpt)}</p>` : ''}
    </a>
  `;
}

function renderSection(section, items) {
  const gridClass = section.type === 'grid-2' || section.type === 'duo'
    ? 'section-grid grid-2'
    : 'section-grid';

  const cards = items.length
    ? items.map(renderItemCard).join('')
    : '<p style="color:var(--text-muted); grid-column: 1 / -1; text-align: center; padding: 40px;">Nenhum item nesta seção ainda.</p>';

  return `
    <a href="/" class="back-link">← Voltar</a>
    <div class="section-detail-header">
      <h1>${esc(section.title)}</h1>
    </div>
    <div class="${gridClass}">
      ${cards}
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

async function loadSection() {
  const container = document.getElementById('sectionDetail');
  const params = new URLSearchParams(window.location.search);
  const sectionId = params.get('id');

  if (!sectionId) {
    container.innerHTML = `
      <a href="/" class="back-link">← Voltar</a>
      <div class="post-detail-error">
        <h1>Seção não encontrada</h1>
        <p>O link que você acessou está faltando o identificador da seção.</p>
      </div>
    `;
    return;
  }

  const [
    { data: section, error: sectionError },
    { data: items, error: itemsError },
    { data: configRows },
  ] = await Promise.all([
    supabase.from('sections').select('*').eq('id', sectionId).maybeSingle(),
    supabase
      .from('section_items')
      .select('*')
      .eq('section_id', sectionId)
      .order('position', { ascending: true }),
    supabase.from('site_config').select('*'),
  ]);

  const config = {};
  (configRows || []).forEach(row => { config[row.key] = row.value; });

  mountLogo('siteLogo', config);

  const footerSlot = document.getElementById('footer-slot');
  if (footerSlot) footerSlot.innerHTML = renderFooter(config);

  if (sectionError || itemsError) {
    container.innerHTML = `
      <a href="/" class="back-link">← Voltar</a>
      <div class="post-detail-error">
        <h1>Erro ao carregar</h1>
        <p>${esc((sectionError || itemsError).message)}</p>
      </div>
    `;
    return;
  }

  if (!section) {
    container.innerHTML = `
      <a href="/" class="back-link">← Voltar</a>
      <div class="post-detail-error">
        <h1>Seção não encontrada</h1>
        <p>Não achamos nenhuma seção com esse identificador.</p>
      </div>
    `;
    return;
  }

  document.title = `${section.title} - Partiu Intercâmbio`;
  container.innerHTML = renderSection(section, items || []);
}

initTheme();
initSearch(supabase);
loadSection();
