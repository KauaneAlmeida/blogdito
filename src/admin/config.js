import { supabase } from '../lib/supabase.js';
import { toast, esc } from './ui.js';
import { imageUploadHtml, bindImageUpload } from './upload.js';

const CONFIG_SECTIONS = [
  {
    title: 'Marquee (texto rolando)',
    fields: [
      { key: 'marquee_line_1', label: 'Linha 1 (rola para a esquerda)', type: 'textarea', hint: 'Texto que fica rolando horizontalmente. Você pode usar hashtags, palavras-chave, slogans... Separe com espaço.' },
      { key: 'marquee_line_2', label: 'Linha 2 (rola para a direita)', type: 'textarea', hint: 'Mesma coisa da linha 1, mas rola no sentido oposto.' },
    ],
  },
  {
    title: 'Rodapé',
    fields: [
      { key: 'footer_tagline', label: 'Frase do rodapé', type: 'textarea' },
      { key: 'footer_copyright', label: 'Texto de copyright', type: 'text' },
    ],
  },
];

function renderLogoSection(config) {
  const logoType = config.logo_type || 'text';
  const brand = config.logo_text_brand || '';
  const sub = config.logo_text_sub || '';
  const imageUrl = config.logo_image_url || '';

  return `
    <div class="config-form" style="margin-bottom: 20px;">
      <h4>Logo do site</h4>
      <p style="font-size:12px; color:var(--text-muted); margin-bottom:14px;">
        A logo aparece no topo da home, nas páginas de post e no rodapé. Escolha entre texto ou imagem.
      </p>

      <div class="form-group">
        <label>Tipo de logo</label>
        <div style="display:flex; gap:18px; margin-top:6px;">
          <label style="display:flex; align-items:center; gap:6px; font-weight:500; text-transform:none; letter-spacing:0; color:var(--text);">
            <input type="radio" name="logo_type" value="text" ${logoType === 'text' ? 'checked' : ''}>
            Texto
          </label>
          <label style="display:flex; align-items:center; gap:6px; font-weight:500; text-transform:none; letter-spacing:0; color:var(--text);">
            <input type="radio" name="logo_type" value="image" ${logoType === 'image' ? 'checked' : ''}>
            Imagem
          </label>
        </div>
      </div>

      <div id="logoTextFields" style="display: ${logoType === 'text' ? 'block' : 'none'};">
        <div class="form-group">
          <label>Nome principal</label>
          <input type="text" data-key="logo_text_brand" value="${esc(brand)}" placeholder="Ex: MEU BLOG">
        </div>
        <div class="form-group">
          <label>Subtítulo (opcional)</label>
          <input type="text" data-key="logo_text_sub" value="${esc(sub)}" placeholder="Ex: NOTÍCIAS, STUDIO, etc">
        </div>
      </div>

      <div id="logoImageFields" style="display: ${logoType === 'image' ? 'block' : 'none'};">
        <div class="form-group">
          <label>Imagem da logo (PNG com fundo transparente funciona melhor)</label>
          ${imageUploadHtml(imageUrl, { positionable: false })}
          <input type="hidden" data-key="logo_image_url" value="${esc(imageUrl)}">
        </div>
      </div>

      <!-- hidden field that actually persists the selected radio value -->
      <input type="hidden" data-key="logo_type" id="logoTypeHidden" value="${esc(logoType)}">
    </div>
  `;
}

export async function loadConfig() {
  const container = document.getElementById('configContent');
  container.innerHTML = '<div class="loading-state">Carregando...</div>';

  const { data, error } = await supabase.from('site_config').select('*');
  if (error) {
    container.innerHTML = `<div class="error-state">Erro: ${esc(error.message)}</div>`;
    return;
  }

  const config = {};
  (data || []).forEach(row => { config[row.key] = row.value; });

  const genericSections = CONFIG_SECTIONS.map(section => `
    <div class="config-form" style="margin-bottom: 20px;">
      <h4>${esc(section.title)}</h4>
      ${section.fields.map(f => {
        const val = config[f.key] || '';
        const input = f.type === 'textarea'
          ? `<textarea data-key="${f.key}">${esc(val)}</textarea>`
          : `<input type="text" data-key="${f.key}" value="${esc(val)}">`;
        return `
          <div class="form-group">
            <label>${esc(f.label)}</label>
            ${input}
            ${f.hint ? `<p style="font-size:11px; color:var(--text-muted); margin-top:4px;">${esc(f.hint)}</p>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `).join('');

  container.innerHTML = renderLogoSection(config) + genericSections + `
    <button class="btn" id="saveConfigBtn">Salvar Tudo</button>
  `;

  // Wire up the radio toggle for logo type
  const typeHidden = document.getElementById('logoTypeHidden');
  const textFields = document.getElementById('logoTextFields');
  const imageFields = document.getElementById('logoImageFields');
  document.querySelectorAll('input[name="logo_type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const v = radio.value;
      typeHidden.value = v;
      textFields.style.display = v === 'text' ? 'block' : 'none';
      imageFields.style.display = v === 'image' ? 'block' : 'none';
    });
  });

  // Wire up the image upload: mirror the uploaded URL into the hidden [data-key] field
  bindImageUpload(null, (url) => {
    if (!url) return;
    const hidden = document.querySelector('input[data-key="logo_image_url"]');
    if (hidden) hidden.value = url;
    toast('Logo enviada', 'success');
  });

  document.getElementById('saveConfigBtn').onclick = saveAllConfig;
}

async function saveAllConfig() {
  const btn = document.getElementById('saveConfigBtn');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  const inputs = document.querySelectorAll('#configContent [data-key]');
  const rows = [];
  inputs.forEach(input => {
    rows.push({ key: input.dataset.key, value: input.value, updated_at: new Date().toISOString() });
  });

  const { error } = await supabase.from('site_config').upsert(rows, { onConflict: 'key' });

  if (error) {
    toast('Erro ao salvar: ' + error.message, 'error');
  } else {
    toast('Configurações salvas!', 'success');
  }

  btn.disabled = false;
  btn.textContent = 'Salvar Tudo';
}
