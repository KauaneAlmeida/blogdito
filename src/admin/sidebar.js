import { supabase } from '../lib/supabase.js';
import { toast, openModal, closeModal, esc, confirmDialog } from './ui.js';
import { imageUploadHtml, bindImageUpload } from './upload.js';

// Default suggestions — the admin can type any category
const CATEGORY_SUGGESTIONS = [
  'DESTAQUE',
  'NOVIDADES',
  'DICAS',
  'GUIAS',
  'NOTÍCIAS',
  'TUTORIAL',
];

let categorySuggestions = [...CATEGORY_SUGGESTIONS];

async function loadCategorySuggestions() {
  // Merge posts + sidebar_posts categories so suggestions stay consistent across tabs
  const [{ data: postsData }, { data: sidebarData }] = await Promise.all([
    supabase.from('posts').select('category').not('category', 'is', null),
    supabase.from('sidebar_posts').select('category').not('category', 'is', null),
  ]);
  const unique = new Set([...CATEGORY_SUGGESTIONS]);
  (postsData || []).forEach(r => { if (r.category) unique.add(r.category); });
  (sidebarData || []).forEach(r => { if (r.category) unique.add(r.category); });
  categorySuggestions = Array.from(unique).sort();
}

function renderSidebarPreview({ title, category, excerpt, imageUrl, position, imagePosition }) {
  const posBlock = (position != null && position !== '')
    ? `<span class="prev-position">posição ${esc(String(position))}</span>`
    : '';
  const imgBlock = imageUrl
    ? `<div class="prev-sidebar-thumb"><img src="${esc(imageUrl)}" alt="" style="object-position: ${esc(imagePosition || 'center center')};"></div>`
    : '';
  const excerptBlock = excerpt
    ? `<p class="prev-sidebar-excerpt">${esc(excerpt)}</p>`
    : '';
  return `
    <div class="prev-sidebar-item">
      ${imgBlock}
      <span class="prev-cat">${esc(category || 'CATEGORIA')}</span>
      <h3>${esc(title || 'Título do item da sidebar')}</h3>
      ${excerptBlock}
      ${posBlock}
    </div>
  `;
}

export async function loadSidebar() {
  const list = document.getElementById('sidebarList');
  list.innerHTML = '<div class="loading-state">Carregando...</div>';

  // Refresh the datalist in parallel so suggestions stay fresh
  loadCategorySuggestions();

  const { data, error } = await supabase
    .from('sidebar_posts')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    list.innerHTML = `<div class="error-state">Erro: ${esc(error.message)}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhum item na sidebar. Clique em "+ Novo Item".</div>';
    return;
  }

  list.innerHTML = data.map(p => `
    <div class="post-item" data-id="${p.id}">
      <div style="width:120px; height:80px; background:var(--input-bg); display:flex; align-items:center; justify-content:center; color: var(--accent); font-weight:800; font-size:10px;">${esc((p.category || '—').slice(0, 12))}</div>
      <div class="post-item-info">
        <span class="post-item-cat">${esc(p.category || '—')}</span>
        <h4>${esc(p.title)}</h4>
        <p>Posição: ${p.position}</p>
      </div>
      <div class="post-item-actions">
        <button class="btn btn-secondary btn-sm edit-sb" data-id="${p.id}">Editar</button>
        <button class="btn btn-danger btn-sm delete-sb" data-id="${p.id}">Excluir</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.edit-sb').forEach(btn => {
    btn.addEventListener('click', () => openSidebarModal(data.find(p => p.id === btn.dataset.id)));
  });
  list.querySelectorAll('.delete-sb').forEach(btn => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.id));
  });
}

export function openSidebarModal(item = null) {
  const isEdit = !!item;
  const p = item || { title: '', category: '', excerpt: '', content: '', image_url: '', image_position: 'center center', position: 0 };

  openModal({
    title: isEdit ? 'Editar Item da Sidebar' : 'Novo Item da Sidebar',
    bodyHtml: `
      <form id="sbForm">
        <div class="form-group">
          <label>Título</label>
          <input type="text" id="sb-title" value="${esc(p.title)}" required>
        </div>
        <div class="form-group">
          <label>Categoria</label>
          <input type="text" id="sb-category" list="sb-category-list" value="${esc(p.category || '')}" placeholder="Digite uma categoria (ex: GUIAS, DICAS)">
          <datalist id="sb-category-list">
            ${categorySuggestions.map(c => `<option value="${esc(c)}"></option>`).join('')}
          </datalist>
          <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">Qualquer categoria funciona. Escolha uma sugerida ou crie uma nova.</p>
        </div>
        <div class="form-group">
          <label>Resumo (opcional)</label>
          <textarea id="sb-excerpt">${esc(p.excerpt || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Conteúdo completo (aparece ao clicar no item)</label>
          <textarea id="sb-content" style="min-height: 140px;" placeholder="Pra criar link: [texto do link](https://exemplo.com) ou [https://exemplo.com]">${esc(p.content || '')}</textarea>
          <small style="display:block; margin-top:6px; color: var(--text-muted); font-size: 12px; line-height: 1.5;">
            Formas de criar link:<br>
            • <code>[texto do link](https://url.com)</code> — link com texto customizado<br>
            • <code>[https://url.com]</code> — link usando a própria URL como texto
          </small>
        </div>
        <div class="form-group">
          <label>Imagem de capa (aparece na página de detalhe)</label>
          ${imageUploadHtml(p.image_url, {
            positionable: true,
            position: p.image_position,
            positionInputId: 'sb-image-position',
          })}
          <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">
            Depois de enviar, arraste diretamente na imagem pra escolher o ponto focal.
          </p>
        </div>
        <div class="form-group">
          <label>Ordem de exibição</label>
          <input type="number" id="sb-position" value="${p.position || 0}">
          <small style="display:block; margin-top:6px; color: var(--text-muted); font-size: 12px;">
            Define em que posição esse item aparece na sidebar. Menor número = aparece primeiro. Use 0, 1, 2, 3... pra ordenar.
          </small>
        </div>
      </form>
    `,
    previewHtml: renderSidebarPreview({
      title: p.title,
      category: p.category,
      excerpt: p.excerpt,
      imageUrl: p.image_url,
      position: p.position,
      imagePosition: p.image_position,
    }),
    footerHtml: `
      <button class="btn btn-secondary" id="sb-cancel">Cancelar</button>
      <button class="btn" id="sb-save">${isEdit ? 'Salvar' : 'Criar'}</button>
    `,
  });

  // Live preview — delegated: any input/change in the form updates
  const stage = document.getElementById('modalPreviewStage');
  const form = document.getElementById('sbForm');
  const getUrlField = () => form.querySelector('[data-role="url-input"]');
  const updatePreview = () => {
    stage.innerHTML = renderSidebarPreview({
      title: document.getElementById('sb-title').value,
      category: document.getElementById('sb-category').value,
      excerpt: document.getElementById('sb-excerpt').value,
      imageUrl: getUrlField().value,
      position: document.getElementById('sb-position').value,
      imagePosition: document.getElementById('sb-image-position').value,
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
      const previewImg = stage.querySelector('.prev-sidebar-thumb img');
      if (previewImg) previewImg.style.objectPosition = value;
    },
  );

  document.getElementById('sb-cancel').onclick = closeModal;
  document.getElementById('sb-save').onclick = async () => {
    const btn = document.getElementById('sb-save');
    btn.disabled = true;

    const payload = {
      title: document.getElementById('sb-title').value.trim(),
      category: document.getElementById('sb-category').value,
      excerpt: document.getElementById('sb-excerpt').value.trim(),
      content: document.getElementById('sb-content').value.trim(),
      image_url: getUrlField().value.trim(),
      image_position: document.getElementById('sb-image-position').value,
      position: parseInt(document.getElementById('sb-position').value) || 0,
    };

    if (!payload.title) {
      toast('Título obrigatório', 'error');
      btn.disabled = false;
      return;
    }

    let error;
    if (isEdit) {
      ({ error } = await supabase.from('sidebar_posts').update(payload).eq('id', p.id));
    } else {
      ({ error } = await supabase.from('sidebar_posts').insert(payload));
    }

    if (error) {
      toast('Erro: ' + error.message, 'error');
      btn.disabled = false;
      return;
    }

    toast('Salvo!', 'success');
    closeModal();
    loadSidebar();
  };
}

async function handleDelete(id) {
  const ok = await confirmDialog('Excluir este item da sidebar?');
  if (!ok) return;
  const { error } = await supabase.from('sidebar_posts').delete().eq('id', id);
  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }
  toast('Excluído', 'success');
  loadSidebar();
}
