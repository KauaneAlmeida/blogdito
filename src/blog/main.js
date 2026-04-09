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

// ===== Escape HTML to prevent XSS =====
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ===== Render functions =====
function renderBannerSlide(b) {
  const img = b.image_url || 'https://picsum.photos/seed/student/1200/400';
  const bgPos = b.image_position || 'center center';
  return `
    <div class="banner-slide banner-slide-bg" data-id="${esc(b.id)}" style="background-image: url('${esc(img)}'); background-position: ${esc(bgPos)};">
      <div class="banner-slide-bg-overlay">
        ${b.badge ? `<span class="banner-badge">${esc(b.badge)}</span>` : ''}
        <h2>${esc(b.title || '')}</h2>
        ${b.subtitle ? `<p>${esc(b.subtitle)}</p>` : ''}
        ${b.button_label ? `
          <div class="banner-btn">
            <a href="${esc(b.button_url || '#')}">${esc(b.button_label)}</a>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderBannerCarousel(banners) {
  if (!banners || banners.length === 0) return '';

  // Single banner: no arrows, no dots
  if (banners.length === 1) {
    return `
      <section class="banner-carousel single">
        <div class="banner-viewport">
          ${renderBannerSlide(banners[0])}
        </div>
      </section>
    `;
  }

  const dots = banners.map((_, i) => `
    <button class="banner-dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Banner ${i + 1}"></button>
  `).join('');

  return `
    <section class="banner-carousel">
      <button class="banner-nav banner-prev" aria-label="Banner anterior">‹</button>
      <div class="banner-viewport">
        <div class="banner-track">
          ${banners.map(renderBannerSlide).join('')}
        </div>
      </div>
      <button class="banner-nav banner-next" aria-label="Próximo banner">›</button>
      <div class="banner-dots">${dots}</div>
    </section>
  `;
}

function initBannerCarousel() {
  const carousel = document.querySelector('.banner-carousel:not(.single)');
  if (!carousel) return;

  const track = carousel.querySelector('.banner-track');
  const slides = carousel.querySelectorAll('.banner-slide');
  const prevBtn = carousel.querySelector('.banner-prev');
  const nextBtn = carousel.querySelector('.banner-next');
  const dots = carousel.querySelectorAll('.banner-dot');
  const total = slides.length;
  let current = 0;
  let timer;

  const goTo = (idx) => {
    current = (idx + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  };

  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  const startAuto = () => {
    stopAuto();
    timer = setInterval(next, 6000);
  };
  const stopAuto = () => {
    if (timer) clearInterval(timer);
  };

  prevBtn.addEventListener('click', () => { prev(); startAuto(); });
  nextBtn.addEventListener('click', () => { next(); startAuto(); });
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { goTo(i); startAuto(); });
  });

  // Pause on hover
  carousel.addEventListener('mouseenter', stopAuto);
  carousel.addEventListener('mouseleave', startAuto);

  startAuto();
}

function postUrl(post) {
  return `/post.html?id=${encodeURIComponent(post.id)}`;
}

function renderFeatured(post) {
  if (!post) return '';
  const img = post.image_url || 'https://picsum.photos/seed/default/1400/600';
  const bgPos = post.image_position || 'center center';
  return `
    <a href="${postUrl(post)}" class="featured-link">
      <article class="featured" style="background-image: url('${esc(img)}'); background-position: ${esc(bgPos)};">
        <div class="featured-text">
          <span class="category-badge">${esc(post.category)}</span>
          <h1>${esc(post.title)}</h1>
          <p>${esc(post.excerpt || '')}</p>
        </div>
      </article>
    </a>
  `;
}

function renderPostCard(post) {
  const img = post.image_url || 'https://picsum.photos/seed/default/800/440';
  const href = postUrl(post);
  const objPos = post.image_position || 'center center';
  return `
    <article class="post-card">
      <a href="${href}" class="post-card-link">
        <div class="card-bar"></div>
        <div class="post-content">
          <span class="cat">${esc(post.category)}</span>
          <h3>${esc(post.title)}</h3>
          <p>${esc(post.excerpt || '')}</p>
        </div>
        <div class="img-wrap"><img src="${esc(img)}" alt="${esc(post.title)}" style="object-position: ${esc(objPos)};"></div>
        <span class="read-more">Leia mais →</span>
      </a>
    </article>
  `;
}

function renderSidebar(items) {
  return items.map((item, i) => `
    <li>
      <a href="/post.html?sidebar=${encodeURIComponent(item.id)}">
        <span class="cat">${esc(item.category)}</span>
        <h3>${esc(item.title)}</h3>
      </a>
      ${i < items.length - 1 ? '<hr>' : ''}
    </li>
  `).join('');
}

function renderMarquee(line1, line2) {
  const l1 = esc(line1 || '');
  const l2 = esc(line2 || '');
  return `
    <section class="marquee-section">
      <div class="marquee-track marquee-left">
        <div class="marquee-content">${l1} ${l1}</div>
        <div class="marquee-content" aria-hidden="true">${l1} ${l1}</div>
      </div>
      <div class="marquee-track marquee-right">
        <div class="marquee-content">${l2} ${l2}</div>
        <div class="marquee-content" aria-hidden="true">${l2} ${l2}</div>
      </div>
    </section>
  `;
}

async function renderDynamicSection(section) {
  const { data: items } = await supabase
    .from('section_items')
    .select('*')
    .eq('section_id', section.id)
    .order('position', { ascending: true });

  const list = items || [];
  const config = section.config || {};
  const showTitle = config.show_title !== false;

  const itemUrl = (item) => `/post.html?item=${encodeURIComponent(item.id)}`;
  const sectionHref = `/section.html?id=${encodeURIComponent(section.id)}`;

  const header = showTitle ? `
    <div class="section-header">
      <h2>${esc(section.title)}</h2>
      <a href="${sectionHref}" class="view-more">Veja mais →</a>
    </div>
  ` : '';

  // DUO: 2 colunas grandes, cada uma com imagem grande + título + excerpt + "Leia mais →"
  if (section.type === 'duo') {
    const cols = list.slice(0, 2).map(item => `
      <a href="${itemUrl(item)}" class="duo-col">
        <div class="duo-col-header">
          <h2>${esc(item.title)}</h2>
          <span class="view-more">Leia mais →</span>
        </div>
        <div class="duo-img">
          <img src="${esc(item.image_url || 'https://picsum.photos/seed/' + item.id + '/1200/800')}" alt="${esc(item.title)}" style="object-position: ${esc(item.image_position || 'center center')};">
        </div>
        ${item.excerpt ? `<h3 class="duo-subtitle">${esc(item.excerpt)}</h3>` : ''}
      </a>
    `).join('');
    return `
      <section class="section-block">
        <div class="container">
          ${header}
          <div class="duo-grid">
            ${cols || '<p style="color:var(--text-muted);">Adicione até 2 cards nesta seção.</p>'}
          </div>
        </div>
      </section>
    `;
  }

  // CAROUSEL: scroll horizontal de cards pequenos + botões embaixo
  if (section.type === 'carousel') {
    const cards = list.map(item => `
      <a href="${itemUrl(item)}" class="carousel-card">
        <div class="img-wrap">
          <img src="${esc(item.image_url || 'https://picsum.photos/seed/' + item.id + '/800/600')}" alt="${esc(item.title)}" style="object-position: ${esc(item.image_position || 'center center')};">
        </div>
        ${item.category ? `<span class="cat">${esc(item.category)}</span>` : ''}
        <h3>${esc(item.title)}</h3>
        ${item.excerpt ? `<p>${esc(item.excerpt)}</p>` : ''}
      </a>
    `).join('');

    const buttons = Array.isArray(config.buttons) ? config.buttons : [];
    const buttonsHtml = buttons.length ? `
      <div class="carousel-buttons">
        ${buttons.map(b => `<a href="${esc(b.url || '#')}" class="pill-btn">${esc(b.label || '')}</a>`).join('')}
      </div>
    ` : '';

    return `
      <section class="section-block">
        <div class="container">
          ${header}
          <div class="carousel-wrap">
            <button class="carousel-nav carousel-prev" aria-label="Anterior">‹</button>
            <div class="carousel-track">
              ${cards || '<p style="color:var(--text-muted);">Nenhum item no carrossel ainda.</p>'}
            </div>
            <button class="carousel-nav carousel-next" aria-label="Próximo">›</button>
          </div>
          ${buttonsHtml}
        </div>
      </section>
    `;
  }

  // Default: grid-3, grid-2, featured
  const gridClass = section.type === 'grid-2' ? 'section-grid grid-2' : 'section-grid';
  const cards = list.map(item => `
    <a href="${itemUrl(item)}" class="section-card">
      <div class="img-wrap"><img src="${esc(item.image_url || 'https://picsum.photos/seed/' + item.id + '/800/600')}" alt="${esc(item.title)}" style="object-position: ${esc(item.image_position || 'center center')};"></div>
      ${item.category ? `<span class="cat">${esc(item.category)}</span>` : ''}
      <h3>${esc(item.title)}</h3>
      ${item.excerpt ? `<p>${esc(item.excerpt)}</p>` : ''}
    </a>
  `).join('');

  return `
    <section class="section-block">
      <div class="container">
        ${header}
        <div class="${gridClass}">${cards || '<p style="color:var(--text-muted);">Nenhum item nesta seção ainda.</p>'}</div>
      </div>
    </section>
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
              <li><a href="#">Sobre</a></li>
              <li><a href="#">Mentoria</a></li>
              <li><a href="#">Consultoria</a></li>
              <li><a href="#">Contato</a></li>
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

// ===== Carousel nav =====
function initCarousels() {
  document.querySelectorAll('.carousel-wrap').forEach(wrap => {
    const track = wrap.querySelector('.carousel-track');
    const prev = wrap.querySelector('.carousel-prev');
    const next = wrap.querySelector('.carousel-next');
    if (!track || !prev || !next) return;

    const scrollByAmount = () => {
      const card = track.querySelector('.carousel-card');
      if (!card) return 300;
      return card.offsetWidth + 24; // card width + gap
    };

    // Auto-scroll state and helpers (declared FIRST so button handlers can use them)
    let timer = null;
    const stopAuto = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const tick = () => {
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (maxScroll <= 0) return;
      if (track.scrollLeft >= maxScroll - 4) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: scrollByAmount(), behavior: 'smooth' });
      }
    };
    const startAuto = () => {
      stopAuto();
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (maxScroll <= 0) return; // nothing to scroll
      timer = setInterval(tick, 5000);
    };

    // Manual nav buttons — pause, move, then resume auto-scroll
    prev.addEventListener('click', () => {
      stopAuto();
      track.scrollBy({ left: -scrollByAmount(), behavior: 'smooth' });
      setTimeout(startAuto, 800);
    });
    next.addEventListener('click', () => {
      stopAuto();
      track.scrollBy({ left: scrollByAmount(), behavior: 'smooth' });
      setTimeout(startAuto, 800);
    });

    // Pause on hover / touch
    wrap.addEventListener('mouseenter', stopAuto);
    wrap.addEventListener('mouseleave', startAuto);
    track.addEventListener('touchstart', stopAuto, { passive: true });
    track.addEventListener('touchend', startAuto, { passive: true });

    // Kick off auto-scroll after layout settles (images may still be loading)
    setTimeout(startAuto, 1000);
  });
}

// ===== Skeleton =====
function showSkeleton() {
  const featured = document.getElementById('featured-slot');
  const grid = document.getElementById('post-grid-slot');
  const sidebar = document.getElementById('sidebar-slot');

  if (featured) featured.innerHTML = '<div class="featured skeleton" style="background:var(--bar-bg);"></div>';
  if (grid) {
    grid.innerHTML = Array(6).fill(0).map(() => `
      <article class="post-card">
        <div class="card-bar"></div>
        <div class="post-content">
          <div class="skeleton skeleton-text" style="width:40%;"></div>
          <div class="skeleton skeleton-title" style="width:90%;"></div>
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text" style="width:80%;"></div>
        </div>
        <div class="img-wrap skeleton skeleton-img"></div>
      </article>
    `).join('');
  }
  if (sidebar) {
    sidebar.innerHTML = Array(6).fill(0).map(() => `
      <li>
        <div class="skeleton skeleton-text" style="width:50%;"></div>
        <div class="skeleton skeleton-title" style="width:95%;"></div>
        <hr>
      </li>
    `).join('');
  }
}

// ===== Load everything =====
async function loadBlog() {
  showSkeleton();

  try {
    const [
      { data: posts },
      { data: sidebarPosts },
      { data: sections },
      { data: configRows },
      { data: banners },
    ] = await Promise.all([
      supabase.from('posts').select('*').order('position', { ascending: true }),
      supabase.from('sidebar_posts').select('*').order('position', { ascending: true }),
      supabase.from('sections').select('*').eq('is_visible', true).order('order_index', { ascending: true }),
      supabase.from('site_config').select('*'),
      supabase.from('banners').select('*').eq('is_visible', true).order('position', { ascending: true }),
    ]);

    const config = {};
    (configRows || []).forEach(row => { config[row.key] = row.value; });

    // Site logo
    mountLogo('siteLogo', config);

    // Banner carousel
    const bannerSlot = document.getElementById('banner-slot');
    if (bannerSlot) {
      bannerSlot.innerHTML = renderBannerCarousel(banners || []);
      initBannerCarousel();
    }

    // Featured + grid
    const featured = (posts || []).find(p => p.is_featured);
    const gridPosts = (posts || []).filter(p => !p.is_featured);

    const featuredSlot = document.getElementById('featured-slot');
    if (featuredSlot) featuredSlot.innerHTML = renderFeatured(featured);

    const gridSlot = document.getElementById('post-grid-slot');
    if (gridSlot) gridSlot.innerHTML = gridPosts.map(renderPostCard).join('');

    // Sidebar
    const sidebarSlot = document.getElementById('sidebar-slot');
    if (sidebarSlot) sidebarSlot.innerHTML = renderSidebar(sidebarPosts || []);

    // Marquee
    const marqueeSlot = document.getElementById('marquee-slot');
    if (marqueeSlot) marqueeSlot.innerHTML = renderMarquee(config.marquee_line_1, config.marquee_line_2);

    // Dynamic sections
    const sectionsSlot = document.getElementById('sections-slot');
    if (sectionsSlot) {
      const sectionHtml = await Promise.all((sections || []).map(renderDynamicSection));
      sectionsSlot.innerHTML = sectionHtml.join('');
      initCarousels();
    }

    // Footer
    const footerSlot = document.getElementById('footer-slot');
    if (footerSlot) footerSlot.innerHTML = renderFooter(config);

  } catch (err) {
    console.error('Erro carregando blog:', err);
    document.getElementById('post-grid-slot').innerHTML = `
      <p style="color:var(--text-muted); grid-column: 1 / -1; text-align: center; padding: 40px;">
        Erro ao carregar conteúdo. Tente recarregar a página.
      </p>
    `;
  }
}

initTheme();
initSearch(supabase);
loadBlog();
