import { supabase } from '../lib/supabase.js';
import { toast, openModal, closeModal, esc, confirmDialog } from './ui.js';
import { imageUploadHtml, bindImageUpload } from './upload.js';

export async function loadSections() {
  const container = document.getElementById('sectionsList');
  container.innerHTML = '<div class="loading-state">Carregando...</div>';

  const { data: sections, error } = await supabase
    .from('sections')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    container.innerHTML = `<div class="error-state">Erro: ${esc(error.message)}</div>`;
    return;
  }

  if (!sections || sections.length === 0) {
    container.innerHTML = '<div class="empty-state">Nenhuma seção criada. Clique em "+ Nova Seção".</div>';
    return;
  }

  // Load items for all sections
  const sectionIds = sections.map(s => s.id);
  const { data: itemsData } = await supabase
    .from('section_items')
    .select('*')
    .in('section_id', sectionIds)
    .order('position', { ascending: true });
  const items = itemsData || [];

  const itemsBySection = {};
  items.forEach(item => {
    if (!itemsBySection[item.section_id]) itemsBySection[item.section_id] = [];
    itemsBySection[item.section_id].push(item);
  });

  container.innerHTML = sections.map(s => renderSectionBlock(s, itemsBySection[s.id] || [])).join('');

  // Bind buttons
  container.querySelectorAll('.edit-section').forEach(b => b.addEventListener('click', () => openSectionModal(sections.find(s => s.id === b.dataset.id))));
  container.querySelectorAll('.delete-section').forEach(b => b.addEventListener('click', () => handleDeleteSection(b.dataset.id)));
  container.querySelectorAll('.move-up').forEach(b => b.addEventListener('click', () => moveSection(b.dataset.id, -1, sections)));
  container.querySelectorAll('.move-down').forEach(b => b.addEventListener('click', () => moveSection(b.dataset.id, 1, sections)));
  container.querySelectorAll('.toggle-visible').forEach(b => b.addEventListener('click', () => toggleVisible(b.dataset.id, b.dataset.visible === 'true')));
  container.querySelectorAll('.add-item').forEach(b => b.addEventListener('click', () => openItemModal(b.dataset.section)));
  container.querySelectorAll('.edit-item').forEach(b => b.addEventListener('click', () => {
    const item = items.find(i => i.id === b.dataset.id);
    if (item) openItemModal(item.section_id, item);
  }));
  container.querySelectorAll('.delete-item').forEach(b => b.addEventListener('click', () => handleDeleteItem(b.dataset.id)));
}

function renderSectionBlock(section, items) {
  return `
    <div class="section-block-admin">
      <div class="section-block-header">
        <div>
          <h4>${esc(section.title)} <span style="font-size:11px; color:var(--text-muted); font-weight:500;">(${esc(section.type)}${section.is_visible ? '' : ' · oculto'})</span></h4>
        </div>
        <div class="section-block-meta">
          <button class="btn btn-secondary btn-sm move-up" data-id="${section.id}" title="Mover pra cima">↑</button>
          <button class="btn btn-secondary btn-sm move-down" data-id="${section.id}" title="Mover pra baixo">↓</button>
          <button class="btn btn-secondary btn-sm toggle-visible" data-id="${section.id}" data-visible="${section.is_visible}">${section.is_visible ? 'Ocultar' : 'Mostrar'}</button>
          <button class="btn btn-secondary btn-sm edit-section" data-id="${section.id}">Editar</button>
          <button class="btn btn-danger btn-sm delete-section" data-id="${section.id}">Excluir</button>
        </div>
      </div>

      ${section.type === 'marquee' ? renderMarqueeConfig(section) : `
        <div style="display:flex; justify-content: space-between; align-items:center; margin-top:8px;">
          <p style="font-size:12px; color:var(--text-muted);">${items.length} item(ns) nesta seção</p>
          <button class="btn btn-sm add-item" data-section="${section.id}">+ Adicionar card</button>
        </div>

        ${items.length === 0 ? '' : `
          <div class="section-items-grid">
            ${items.map(item => `
              <div class="section-item-card">
                <img src="${esc(item.image_url || 'https://picsum.photos/seed/' + item.id + '/300/200')}" alt="">
                <h5>${esc(item.title)}</h5>
                <div class="section-item-card-actions">
                  <button class="btn btn-secondary btn-sm edit-item" data-id="${item.id}">Editar</button>
                  <button class="btn btn-danger btn-sm delete-item" data-id="${item.id}">×</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      `}
    </div>
  `;
}

function renderMarqueeConfig() {
  return `
    <p style="font-size:12px; color:var(--text-muted); margin-top:8px;">Seção do tipo marquee. Configure o texto nas Configurações Gerais → Marquee.</p>
  `;
}

function buttonRowHtml(label = '', url = '') {
  return `
    <div class="button-row">
      <input type="text" class="btn-label" placeholder="Texto (ex: Estudar em Portugal)" value="${esc(label)}">
      <input type="text" class="btn-url" placeholder="Link (ex: # ou https://...)" value="${esc(url)}">
      <button type="button" class="btn btn-danger btn-sm btn-remove" title="Remover">×</button>
    </div>
  `;
}

function prevCardCell(item) {
  const img = item && item.image_url
    ? `<img src="${esc(item.image_url)}" alt="">`
    : '';
  const label = item && item.title ? esc(item.title) : 'card';
  return `
    <div class="prev-grid-cell ${img ? 'has-img' : ''}">
      ${img}
      <span class="prev-cell-label">${label}</span>
    </div>
  `;
}

function renderSectionPreview({ title, type, showTitle, buttons, items }) {
  const header = showTitle
    ? `<div class="prev-section-header"><h2>${esc(title || 'Título da seção')}</h2></div>`
    : '';

  const list = Array.isArray(items) ? items : [];
  const hasItems = list.length > 0;

  let layoutHtml = '';
  switch (type) {
    case 'grid-3':
      layoutHtml = `
        <div class="prev-grid cols-3">
          ${Array.from({ length: Math.max(3, list.length) }, (_, i) => prevCardCell(list[i])).join('')}
        </div>
      `;
      break;
    case 'grid-2':
      layoutHtml = `
        <div class="prev-grid cols-2">
          ${Array.from({ length: Math.max(2, list.length) }, (_, i) => prevCardCell(list[i])).join('')}
        </div>
      `;
      break;
    case 'featured': {
      const item = list[0];
      const img = item && item.image_url ? `<img src="${esc(item.image_url)}" alt="">` : '';
      const label = item && item.title ? esc(item.title) : 'card em destaque';
      layoutHtml = `
        <div class="prev-grid" style="grid-template-columns: 1fr;">
          <div class="prev-grid-cell ${img ? 'has-img' : ''}" style="aspect-ratio: 16/7;">
            ${img}
            <span class="prev-cell-label">${label}</span>
          </div>
        </div>
      `;
      break;
    }
    case 'duo': {
      const col1 = list[0];
      const col2 = list[1];
      const renderDuoCol = (item, fallbackLabel) => {
        const img = item && item.image_url ? `<img src="${esc(item.image_url)}" alt="">` : '';
        const label = item && item.title ? esc(item.title) : fallbackLabel;
        return `
          <div class="prev-duo-col">
            <div class="prev-duo-col-title">${label} →</div>
            <div class="prev-duo-col-img ${img ? 'has-img' : ''}">${img}</div>
          </div>
        `;
      };
      layoutHtml = `
        <div class="prev-duo">
          ${renderDuoCol(col1, 'Coluna 1')}
          ${renderDuoCol(col2, 'Coluna 2')}
        </div>
      `;
      break;
    }
    case 'carousel': {
      const pills = (buttons || []).filter(b => b.label).map(b =>
        `<span class="prev-pill">${esc(b.label)}</span>`
      ).join('');
      const cardsCount = Math.max(3, list.length);
      const cards = Array.from({ length: cardsCount }, (_, i) => {
        const item = list[i];
        const img = item && item.image_url ? `<img src="${esc(item.image_url)}" alt="">` : '';
        const label = item && item.title ? esc(item.title) : 'card';
        return `
          <div class="prev-carousel-card ${img ? 'has-img' : ''}">
            ${img}
            <span class="prev-cell-label">${label}</span>
          </div>
        `;
      }).join('');
      layoutHtml = `
        <div class="prev-carousel">${cards}</div>
        ${pills ? `<div class="prev-pill-btns">${pills}</div>` : ''}
      `;
      break;
    }
    case 'marquee':
      layoutHtml = `<div class="prev-empty" style="padding:40px 20px; color:#666;">Marquee — configure o texto em "Configurações"</div>`;
      break;
    default:
      layoutHtml = '';
  }

  const hint = !hasItems && type !== 'marquee' ? `
    <div class="prev-hint">
      ℹ️ Os cards cinzas são <strong>placeholders</strong>. Depois de salvar, volte na lista e clique em <strong>"+ Adicionar card"</strong> pra colocar as imagens e textos reais.
    </div>
  ` : '';

  return `
    <div class="prev-section-block">
      ${header}
      ${layoutHtml}
      ${hint}
    </div>
  `;
}

export async function openSectionModal(section = null) {
  const isEdit = !!section;
  const s = section || { title: '', type: 'grid-3', order_index: 0, is_visible: true, config: {} };
  const config = s.config || {};
  const buttons = Array.isArray(config.buttons) ? config.buttons : [];
  const showTitle = config.show_title !== false; // default true

  // Load existing items so the preview can show real cards (not just placeholders)
  let sectionItems = [];
  if (isEdit && s.id) {
    const { data } = await supabase
      .from('section_items')
      .select('*')
      .eq('section_id', s.id)
      .order('position', { ascending: true });
    sectionItems = data || [];
  }

  openModal({
    title: isEdit ? 'Editar Seção' : 'Nova Seção',
    bodyHtml: `
      <form id="sectionForm">
        <div class="form-group">
          <label>Título da seção</label>
          <input type="text" id="sf-title" value="${esc(s.title)}" required placeholder="Ex: Guias, Mais Lidas">
        </div>
        <div class="form-group">
          <label>Tipo de layout</label>
          <select id="sf-type">
            <option value="grid-3" ${s.type === 'grid-3' ? 'selected' : ''}>Grid 3 colunas (cards grandes)</option>
            <option value="grid-2" ${s.type === 'grid-2' ? 'selected' : ''}>Grid 2 colunas</option>
            <option value="featured" ${s.type === 'featured' ? 'selected' : ''}>Featured (um card destaque)</option>
            <option value="duo" ${s.type === 'duo' ? 'selected' : ''}>Duo (2 colunas grandes com "Leia mais")</option>
            <option value="carousel" ${s.type === 'carousel' ? 'selected' : ''}>Carrossel (scroll horizontal + botões)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="checkbox-label" for="sf-show-title">
            <input type="checkbox" id="sf-show-title" ${showTitle ? 'checked' : ''}>
            <span>Exibir o título da seção na home</span>
          </label>
        </div>
        <div class="form-group">
          <label>Ordem de exibição</label>
          <input type="number" id="sf-order" value="${s.order_index || 0}">
        </div>
        <div class="form-group" id="sf-buttons-group" style="display: ${s.type === 'carousel' ? 'block' : 'none'};">
          <label>Botões abaixo do carrossel</label>
          <p style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">
            Adicione os botões que vão aparecer embaixo do carrossel (ex: "Ver categoria", "Ver mais", ou qualquer link personalizado). Deixe em branco pra não mostrar botões.
          </p>
          <div id="sf-buttons-list">
            ${buttons.length ? buttons.map(b => buttonRowHtml(b.label, b.url)).join('') : ''}
          </div>
          <button type="button" class="btn btn-secondary btn-sm" id="sf-add-button" style="margin-top:8px;">+ Adicionar botão</button>
        </div>
      </form>
    `,
    previewHtml: renderSectionPreview({
      title: s.title,
      type: s.type,
      showTitle,
      buttons,
      items: sectionItems,
    }),
    footerHtml: `
      <button class="btn btn-secondary" id="sf-cancel">Cancelar</button>
      <button class="btn" id="sf-save">${isEdit ? 'Salvar' : 'Criar'}</button>
    `,
  });

  // Show/hide buttons editor based on selected type (the form delegated listener
  // below handles the preview update — we only toggle visibility here)
  const typeSelect = document.getElementById('sf-type');
  const buttonsGroup = document.getElementById('sf-buttons-group');
  typeSelect.addEventListener('change', () => {
    buttonsGroup.style.display = typeSelect.value === 'carousel' ? 'block' : 'none';
  });

  // Buttons list management
  const buttonsList = document.getElementById('sf-buttons-list');
  const addBtn = document.getElementById('sf-add-button');

  addBtn.addEventListener('click', () => {
    buttonsList.insertAdjacentHTML('beforeend', buttonRowHtml());
    updatePreview();
  });

  // Delegated remove handler for button rows
  buttonsList.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove')) {
      e.target.closest('.button-row').remove();
      updatePreview();
    }
  });

  // Live preview
  const stage = document.getElementById('modalPreviewStage');
  const collectButtons = () => {
    const rows = buttonsList.querySelectorAll('.button-row');
    const out = [];
    rows.forEach(row => {
      const label = row.querySelector('.btn-label').value.trim();
      const url = row.querySelector('.btn-url').value.trim();
      if (label) out.push({ label, url: url || '#' });
    });
    return out;
  };
  const updatePreview = () => {
    stage.innerHTML = renderSectionPreview({
      title: document.getElementById('sf-title').value,
      type: document.getElementById('sf-type').value,
      showTitle: document.getElementById('sf-show-title').checked,
      buttons: collectButtons(),
      items: sectionItems,
    });
  };
  // Delegated listeners on the whole form — any input/change updates the preview
  const form = document.getElementById('sectionForm');
  form.addEventListener('input', updatePreview);
  form.addEventListener('change', updatePreview);

  document.getElementById('sf-cancel').onclick = closeModal;
  document.getElementById('sf-save').onclick = async () => {
    const btn = document.getElementById('sf-save');
    btn.disabled = true;

    const newConfig = { ...config };
    newConfig.show_title = document.getElementById('sf-show-title').checked;

    // Always read the current selected type (editable on both create and edit)
    const selectedType = document.getElementById('sf-type').value;
    if (selectedType === 'carousel') {
      const rows = buttonsList.querySelectorAll('.button-row');
      const collected = [];
      rows.forEach(row => {
        const label = row.querySelector('.btn-label').value.trim();
        const url = row.querySelector('.btn-url').value.trim();
        if (label) collected.push({ label, url: url || '#' });
      });
      newConfig.buttons = collected;
    }

    const payload = {
      title: document.getElementById('sf-title').value.trim(),
      order_index: parseInt(document.getElementById('sf-order').value) || 0,
      config: newConfig,
      type: selectedType,
    };

    if (!payload.title) {
      toast('Título obrigatório', 'error');
      btn.disabled = false;
      return;
    }

    let error;
    if (isEdit) {
      ({ error } = await supabase.from('sections').update(payload).eq('id', s.id));
    } else {
      ({ error } = await supabase.from('sections').insert(payload));
    }

    if (error) {
      toast('Erro: ' + error.message, 'error');
      btn.disabled = false;
      return;
    }

    toast('Salvo!', 'success');
    closeModal();
    loadSections();
  };
}

async function handleDeleteSection(id) {
  const ok = await confirmDialog('Excluir esta seção? Todos os itens dentro dela também serão excluídos.');
  if (!ok) return;
  const { error } = await supabase.from('sections').delete().eq('id', id);
  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }
  toast('Seção excluída', 'success');
  loadSections();
}

async function moveSection(id, direction, sections) {
  const sorted = [...sections].sort((a, b) => a.order_index - b.order_index);
  const idx = sorted.findIndex(s => s.id === id);
  const swapIdx = idx + direction;
  if (swapIdx < 0 || swapIdx >= sorted.length) return;

  const a = sorted[idx];
  const b = sorted[swapIdx];
  const tmpOrder = a.order_index;

  const { error: e1 } = await supabase.from('sections').update({ order_index: b.order_index }).eq('id', a.id);
  const { error: e2 } = await supabase.from('sections').update({ order_index: tmpOrder }).eq('id', b.id);

  if (e1 || e2) {
    toast('Erro ao reordenar', 'error');
    return;
  }
  loadSections();
}

async function toggleVisible(id, current) {
  const { error } = await supabase.from('sections').update({ is_visible: !current }).eq('id', id);
  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }
  toast('Atualizado', 'success');
  loadSections();
}

function renderItemPreview({ title, category, excerpt, imageUrl, position, imagePosition }) {
  const imgBlock = imageUrl
    ? `<div class="prev-img-wrap"><img src="${esc(imageUrl)}" alt="" style="object-position: ${esc(imagePosition || 'center center')};"></div>`
    : `<div class="prev-img-wrap empty">sem imagem</div>`;
  const catBlock = category ? `<span class="prev-cat">${esc(category)}</span>` : '';
  const excerptBlock = excerpt ? `<p class="prev-excerpt">${esc(excerpt)}</p>` : '';
  const posBlock = (position != null && position !== '') ? `<span class="prev-position">posição ${esc(String(position))}</span>` : '';
  return `
    <article class="prev-section-card">
      ${imgBlock}
      ${catBlock}
      <h3>${esc(title || 'Título do card')}</h3>
      ${excerptBlock}
      ${posBlock}
    </article>
  `;
}

// ======== SECTION ITEMS ========
function openItemModal(sectionId, item = null) {
  const isEdit = !!item;
  const it = item || { title: '', category: '', excerpt: '', content: '', image_url: '', image_position: 'center center', position: 0 };

  openModal({
    title: isEdit ? 'Editar Card' : 'Novo Card',
    bodyHtml: `
      <form id="itemForm">
        <div class="form-group">
          <label>Título</label>
          <input type="text" id="it-title" value="${esc(it.title)}" required>
        </div>
        <div class="form-group">
          <label>Categoria (opcional)</label>
          <input type="text" id="it-category" value="${esc(it.category || '')}">
        </div>
        <div class="form-group">
          <label>Resumo (opcional)</label>
          <textarea id="it-excerpt">${esc(it.excerpt || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Conteúdo completo (aparece ao clicar em "Leia mais →")</label>
          <textarea id="it-content" style="min-height: 140px;" placeholder="Pra criar link: [texto do link](https://exemplo.com) ou [https://exemplo.com]">${esc(it.content || '')}</textarea>
          <small style="display:block; margin-top:6px; color: var(--text-muted); font-size: 12px; line-height: 1.5;">
            Formas de criar link:<br>
            • <code>[texto do link](https://url.com)</code> — link com texto customizado<br>
            • <code>[https://url.com]</code> — link usando a própria URL como texto
          </small>
        </div>
        <div class="form-group">
          <label>Imagem</label>
          ${imageUploadHtml(it.image_url, {
            positionable: true,
            position: it.image_position,
            positionInputId: 'it-image-position',
          })}
          <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">
            Depois de enviar, arraste diretamente na imagem pra escolher o ponto focal.
          </p>
        </div>
        <div class="form-group">
          <label>Ordem de exibição</label>
          <input type="number" id="it-position" value="${it.position || 0}">
          <small style="display:block; margin-top:6px; color: var(--text-muted); font-size: 12px;">
            Define em que posição esse card aparece dentro da seção. Menor número = aparece primeiro. Use 0, 1, 2, 3... pra ordenar.
          </small>
        </div>
      </form>
    `,
    previewHtml: renderItemPreview({
      title: it.title,
      category: it.category,
      excerpt: it.excerpt,
      imageUrl: it.image_url,
      position: it.position,
      imagePosition: it.image_position,
    }),
    footerHtml: `
      <button class="btn btn-secondary" id="it-cancel">Cancelar</button>
      <button class="btn" id="it-save">${isEdit ? 'Salvar' : 'Criar'}</button>
    `,
  });

  // Live preview — delegated: any input/change in the form updates
  const stage = document.getElementById('modalPreviewStage');
  const form = document.getElementById('itemForm');
  const getUrlField = () => form.querySelector('[data-role="url-input"]');
  const updatePreview = () => {
    stage.innerHTML = renderItemPreview({
      title: document.getElementById('it-title').value,
      category: document.getElementById('it-category').value,
      excerpt: document.getElementById('it-excerpt').value,
      imageUrl: getUrlField().value,
      position: document.getElementById('it-position').value,
      imagePosition: document.getElementById('it-image-position').value,
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
    // onPositionChange: fires continuously while the admin drags — update
    // the preview image object-position directly to avoid flicker
    (value) => {
      const previewImg = stage.querySelector('.prev-img-wrap img');
      if (previewImg) previewImg.style.objectPosition = value;
    },
  );

  document.getElementById('it-cancel').onclick = closeModal;
  document.getElementById('it-save').onclick = async () => {
    const btn = document.getElementById('it-save');
    btn.disabled = true;

    const payload = {
      section_id: sectionId,
      title: document.getElementById('it-title').value.trim(),
      category: document.getElementById('it-category').value.trim(),
      excerpt: document.getElementById('it-excerpt').value.trim(),
      content: document.getElementById('it-content').value.trim(),
      image_url: getUrlField().value.trim(),
      image_position: document.getElementById('it-image-position').value,
      position: parseInt(document.getElementById('it-position').value) || 0,
    };

    if (!payload.title) {
      toast('Título obrigatório', 'error');
      btn.disabled = false;
      return;
    }

    let error;
    if (isEdit) {
      ({ error } = await supabase.from('section_items').update(payload).eq('id', it.id));
    } else {
      ({ error } = await supabase.from('section_items').insert(payload));
    }

    if (error) {
      toast('Erro: ' + error.message, 'error');
      btn.disabled = false;
      return;
    }

    toast('Salvo!', 'success');
    closeModal();
    loadSections();
  };
}

async function handleDeleteItem(id) {
  const ok = await confirmDialog('Excluir este card?');
  if (!ok) return;
  const { error } = await supabase.from('section_items').delete().eq('id', id);
  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }
  toast('Excluído', 'success');
  loadSections();
}
