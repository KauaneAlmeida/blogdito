// Shared logo renderer — reads site_config and returns the HTML
// for either a text logo or an image logo.

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// config is an object mapping site_config keys to their values
export function renderLogoHtml(config, { subOverride } = {}) {
  const type = config.logo_type || 'text';

  if (type === 'image' && config.logo_image_url) {
    return `<img src="${esc(config.logo_image_url)}" alt="${esc(config.logo_text_brand || 'Logo')}" class="logo-img">`;
  }

  const brand = (config.logo_text_brand || '').trim();
  const sub = (subOverride != null ? subOverride : config.logo_text_sub) || '';

  // Empty state — placeholder shown when nothing is configured yet
  if (!brand && !sub) {
    return `
      <span class="logo-placeholder">SUA LOGO AQUI</span>
    `;
  }

  return `
    <span class="brand">${esc(brand)}</span>
    ${sub ? `<span class="sub">${esc(sub)}</span>` : ''}
  `;
}

// Convenience: mount a logo into a given element by id
export function mountLogo(elementId, config, opts) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.innerHTML = renderLogoHtml(config, opts);
  el.classList.toggle('logo-empty', !config.logo_text_brand && !config.logo_image_url);
}
