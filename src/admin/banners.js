import { supabase } from '../lib/supabase.js';
import { toast, openModal, closeModal, esc, confirmDialog } from './ui.js';
import { imageUploadHtml, bindImageUpload } from './upload.js';

function renderBannerPreview({ badge, title, subtitle, buttonLabel, imageUrl, imagePosition }) {
  const bgStyle = imageUrl
    ? `background-image: url('${esc(imageUrl)}'); background-position: ${esc(imagePosition || 'center center')};`
    : '';
  return `
    <div class="prev-banner prev-banner-bg" style="${bgStyle}">
      <div class="prev-banner-bg-overlay">
        ${badge ? `<span class="prev-banner-badge">${esc(badge)}</span>` : ''}
        <h2>${esc(title || 'Título do banner')}</h2>
        ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
        ${buttonLabel ? `<div class="prev-banner-btn"><span>${esc(buttonLabel)}</span></div>` : ''}
      </div>
      ${!imageUrl ? '<div class="prev-banner-bg-empty">sem imagem</div>' : ''}
    </div>
  `;
}

export async function loadBanners() {
  const list = document.getElementById('bannerList');
  list.innerHTML = '<div class="loading-state">Carregando...</div>';

  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    list.innerHTML = `<div class="error-state">Erro: ${esc(error.message)}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhum banner ainda. Clique em "+ Novo Banner".</div>';
    return;
  }

  list.innerHTML = data.map(b => `
    <div class="post-item" data-id="${b.id}">
      <img src="${esc(b.image_url || 'https://picsum.photos/seed/placeholder/120/80')}" alt="">
      <div class="post-item-info">
        <span class="post-item-cat">${esc(b.badge || '—')}${b.is_visible ? '' : ' · oculto'}</span>
        <h4>${esc(b.title)}</h4>
        <p>${esc(b.subtitle || '')}</p>
      </div>
      <div class="post-item-actions">
        <button class="btn btn-secondary btn-sm toggle-visible-bn" data-id="${b.id}" data-visible="${b.is_visible}">${b.is_visible ? 'Ocultar' : 'Mostrar'}</button>
        <button class="btn btn-secondary btn-sm edit-bn" data-id="${b.id}">Editar</button>
        <button class="btn btn-danger btn-sm delete-bn" data-id="${b.id}">Excluir</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.edit-bn').forEach(btn => {
    btn.addEventListener('click', () => openBannerModal(data.find(b => b.id === btn.dataset.id)));
  });
  list.querySelectorAll('.delete-bn').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id));
  });
  list.querySelectorAll('.toggle-visible-bn').forEach(btn => {
    btn.addEventListener('click', () => toggleVisible(btn.dataset.id, btn.dataset.visible === 'true'));
  });
}

export function openBannerModal(banner = null) {
  const isEdit = !!banner;
  const b = banner || {
    badge: '',
    title: '',
    subtitle: '',
    button_label: 'CONFIRA',
    button_url: '#',
    image_url: '',
    image_position: 'center center',
    position: 0,
    is_visible: true,
  };

  openModal({
    title: isEdit ? 'Editar Banner' : 'Novo Banner',
    bodyHtml: `
      <form id="bannerForm">
        <div class="form-group">
          <label>Badge (etiqueta pequena, opcional)</label>
          <input type="text" id="bn-badge" value="${esc(b.badge || '')}" placeholder="Ex: DESTAQUE, NOVIDADE, OFERTA">
        </div>
        <div class="form-group">
          <label>Título principal</label>
          <textarea id="bn-title" required>${esc(b.title || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Subtítulo</label>
          <textarea id="bn-subtitle">${esc(b.subtitle || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Texto do botão</label>
          <input type="text" id="bn-button-label" value="${esc(b.button_label || '')}" placeholder="Ex: CONFIRA">
        </div>
        <div class="form-group">
          <label>Link do botão</label>
          <input type="text" id="bn-button-url" value="${esc(b.button_url || '')}" placeholder="Ex: # ou https://...">
        </div>
        <div class="form-group">
          <label>Imagem de fundo</label>
          ${imageUploadHtml(b.image_url, {
            positionable: true,
            position: b.image_position,
            positionInputId: 'bn-image-position',
          })}
          <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">
            A imagem cobre todo o banner. Use uma imagem larga (1200x400 ou maior). Depois de enviar, arraste diretamente na imagem pra escolher o ponto focal.
          </p>
        </div>
        <div class="form-group">
          <label>Ordem de exibição</label>
          <input type="number" id="bn-position" value="${b.position || 0}">
          <small style="display:block; margin-top:6px; color: var(--text-muted); font-size: 12px;">
            Define em que ordem o banner aparece no carrossel. Menor número = aparece primeiro. Use 0, 1, 2, 3... pra ordenar.
          </small>
        </div>
      </form>
    `,
    previewHtml: renderBannerPreview({
      badge: b.badge,
      title: b.title,
      subtitle: b.subtitle,
      buttonLabel: b.button_label,
      imageUrl: b.image_url,
      imagePosition: b.image_position,
    }),
    footerHtml: `
      <button class="btn btn-secondary" id="bn-cancel">Cancelar</button>
      <button class="btn" id="bn-save">${isEdit ? 'Salvar' : 'Criar'}</button>
    `,
  });

  // Live preview
  const stage = document.getElementById('modalPreviewStage');
  const form = document.getElementById('bannerForm');
  const getUrlField = () => form.querySelector('[data-role="url-input"]');
  const updatePreview = () => {
    stage.innerHTML = renderBannerPreview({
      badge: document.getElementById('bn-badge').value,
      title: document.getElementById('bn-title').value,
      subtitle: document.getElementById('bn-subtitle').value,
      buttonLabel: document.getElementById('bn-button-label').value,
      imageUrl: getUrlField().value,
      imagePosition: document.getElementById('bn-image-position').value,
    });
  };
  form.addEventListener('input', updatePreview);
  form.addEventListener('change', updatePreview);

  bindImageUpload(
    null,
    (url) => {
      if (url) {
        toast('Imagem enviada', 'success');
        updatePreview();
      }
    },
    // onPositionChange: fires continuously while the admin drags. Instead of
    // re-rendering the whole preview (which causes flicker and could break the
    // drag), we update the background-position of the existing banner element
    // directly. The full re-render still happens on other field changes.
    (value) => {
      const liveBanner = stage.querySelector('.prev-banner-bg');
      if (liveBanner) liveBanner.style.backgroundPosition = value;
    },
  );

  document.getElementById('bn-cancel').onclick = closeModal;
  document.getElementById('bn-save').onclick = async () => {
    const btn = document.getElementById('bn-save');
    btn.disabled = true;

    const payload = {
      badge: document.getElementById('bn-badge').value.trim(),
      title: document.getElementById('bn-title').value.trim(),
      subtitle: document.getElementById('bn-subtitle').value.trim(),
      button_label: document.getElementById('bn-button-label').value.trim(),
      button_url: document.getElementById('bn-button-url').value.trim(),
      image_url: getUrlField().value.trim(),
      image_position: document.getElementById('bn-image-position').value,
      position: parseInt(document.getElementById('bn-position').value) || 0,
    };

    if (!payload.title) {
      toast('Título obrigatório', 'error');
      btn.disabled = false;
      return;
    }

    let error;
    if (isEdit) {
      ({ error } = await supabase.from('banners').update(payload).eq('id', b.id));
    } else {
      ({ error } = await supabase.from('banners').insert(payload));
    }

    if (error) {
      toast('Erro: ' + error.message, 'error');
      btn.disabled = false;
      return;
    }

    toast('Salvo!', 'success');
    closeModal();
    loadBanners();
  };
}

async function handleDelete(id) {
  const ok = await confirmDialog('Excluir este banner?');
  if (!ok) return;
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }
  toast('Excluído', 'success');
  loadBanners();
}

async function toggleVisible(id, current) {
  const { error } = await supabase.from('banners').update({ is_visible: !current }).eq('id', id);
  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }
  toast('Atualizado', 'success');
  loadBanners();
}
