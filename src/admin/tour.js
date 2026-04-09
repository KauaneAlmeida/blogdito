// Virtual tour for the admin panel.
// Highlights key UI elements the first time the admin logs in, with
// Next / Prev / Skip / Close controls. State is persisted in localStorage
// so it doesn't keep popping up on every login.

const STORAGE_KEY = 'admin-tour-completed';

const steps = [
  {
    selector: '.admin-tabs',
    title: 'Bem-vindo ao painel!',
    body: 'Por aqui você edita tudo que aparece no site. Use as abas pra trocar entre Posts, Banners, Sidebar, Seções e Configurações.',
    placement: 'bottom',
  },
  {
    selector: '[data-tab="posts"]',
    title: 'Posts do blog',
    body: 'Aqui você cria e edita os posts principais. O post marcado como "Featured" aparece em destaque na home; os outros preenchem o grid.',
    placement: 'bottom',
  },
  {
    selector: '[data-tab="banners"]',
    title: 'Banners',
    body: 'Banners são os cards que rodam no carrossel no topo da home. Você controla título, subtítulo, imagem, botão e ordem.',
    placement: 'bottom',
  },
  {
    selector: '[data-tab="sidebar"]',
    title: 'Sidebar',
    body: 'A lista de artigos que aparece do lado direito do post em destaque na home.',
    placement: 'bottom',
  },
  {
    selector: '[data-tab="sections"]',
    title: 'Seções dinâmicas',
    body: 'Crie seções customizadas tipo "Guias" ou "Mais Lidas". Você escolhe o layout (grid, duo, carrossel...) e adiciona cards dentro.',
    placement: 'bottom',
  },
  {
    selector: '[data-tab="config"]',
    title: 'Configurações gerais',
    body: 'Logo do site, marquee (texto rolante), textos do rodapé e outros ajustes globais ficam aqui.',
    placement: 'bottom',
  },
  {
    selector: '.admin-header-right',
    title: 'Ver o site e sair',
    body: 'Use "Ver site" pra abrir o blog em uma nova aba e checar como ficaram suas alterações. "Sair" encerra sua sessão.',
    placement: 'bottom',
  },
];

let current = 0;
let overlayEl = null;
let tooltipEl = null;
let highlightEl = null;
let resizeHandler = null;

function createElements() {
  overlayEl = document.createElement('div');
  overlayEl.className = 'tour-overlay';

  highlightEl = document.createElement('div');
  highlightEl.className = 'tour-highlight';

  tooltipEl = document.createElement('div');
  tooltipEl.className = 'tour-tooltip';

  document.body.appendChild(overlayEl);
  document.body.appendChild(highlightEl);
  document.body.appendChild(tooltipEl);
}

function removeElements() {
  [overlayEl, highlightEl, tooltipEl].forEach(el => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
  overlayEl = null;
  highlightEl = null;
  tooltipEl = null;
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    window.removeEventListener('scroll', resizeHandler, true);
    resizeHandler = null;
  }
}

function renderStep() {
  const step = steps[current];
  const target = document.querySelector(step.selector);
  if (!target) {
    // Skip missing target (e.g. tab not rendered yet) — go next
    next();
    return;
  }

  // Scroll target into view if needed
  target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

  // Delay positioning a frame so scroll finishes
  requestAnimationFrame(() => {
    const rect = target.getBoundingClientRect();
    const pad = 8;
    highlightEl.style.top = `${rect.top - pad}px`;
    highlightEl.style.left = `${rect.left - pad}px`;
    highlightEl.style.width = `${rect.width + pad * 2}px`;
    highlightEl.style.height = `${rect.height + pad * 2}px`;

    const isLast = current === steps.length - 1;
    const isFirst = current === 0;
    tooltipEl.innerHTML = `
      <button class="tour-close" type="button" aria-label="Fechar tour">×</button>
      <div class="tour-step-count">Passo ${current + 1} de ${steps.length}</div>
      <h4 class="tour-title">${step.title}</h4>
      <p class="tour-body">${step.body}</p>
      <div class="tour-actions">
        <button class="tour-skip" type="button">Pular tour</button>
        <div class="tour-nav">
          ${isFirst ? '' : '<button class="tour-prev" type="button">Voltar</button>'}
          <button class="tour-next" type="button">${isLast ? 'Concluir' : 'Próximo'}</button>
        </div>
      </div>
    `;

    // Position tooltip below or above the target depending on viewport space
    const tooltipRect = tooltipEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 16;

    let top;
    if (step.placement === 'top' || rect.bottom + tooltipRect.height + margin > vh) {
      top = rect.top - tooltipRect.height - margin;
    } else {
      top = rect.bottom + margin;
    }
    top = Math.max(margin, Math.min(top, vh - tooltipRect.height - margin));

    let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
    left = Math.max(margin, Math.min(left, vw - tooltipRect.width - margin));

    tooltipEl.style.top = `${top}px`;
    tooltipEl.style.left = `${left}px`;

    // Bind buttons (fresh bind each render since innerHTML wipes them)
    tooltipEl.querySelector('.tour-close').addEventListener('click', finish);
    tooltipEl.querySelector('.tour-skip').addEventListener('click', finish);
    tooltipEl.querySelector('.tour-next').addEventListener('click', next);
    const prevBtn = tooltipEl.querySelector('.tour-prev');
    if (prevBtn) prevBtn.addEventListener('click', prev);
  });
}

function next() {
  if (current < steps.length - 1) {
    current += 1;
    renderStep();
  } else {
    finish();
  }
}

function prev() {
  if (current > 0) {
    current -= 1;
    renderStep();
  }
}

function finish() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore storage errors (private mode, etc.)
  }
  removeElements();
  document.removeEventListener('keydown', onKeydown);
}

function onKeydown(e) {
  if (e.key === 'Escape') finish();
  else if (e.key === 'ArrowRight') next();
  else if (e.key === 'ArrowLeft') prev();
}

export function startTour({ force = false } = {}) {
  if (!force) {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      // ignore
    }
  }
  current = 0;
  createElements();
  renderStep();

  // Reposition on resize/scroll so the highlight follows the target
  resizeHandler = () => {
    if (!tooltipEl) return;
    renderStep();
  };
  window.addEventListener('resize', resizeHandler);
  window.addEventListener('scroll', resizeHandler, true);

  document.addEventListener('keydown', onKeydown);
}

export function resetTour() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
