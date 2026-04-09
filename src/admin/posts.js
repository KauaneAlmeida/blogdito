import { supabase } from '../lib/supabase.js';
import { toast, openModal, closeModal, esc, confirmDialog } from './ui.js';
import { imageUploadHtml, bindImageUpload } from './upload.js';

// Default suggestions shown in the datalist — the admin can type any category
const CATEGORY_SUGGESTIONS = [
  'DESTAQUE',
  'NOVIDADES',
  'DICAS',
  'GUIAS',
  'NOTÍCIAS',
  'TUTORIAL',
];

// Dynamically-loaded categories from existing posts, merged with suggestions
let categorySuggestions = [...CATEGORY_SUGGESTIONS];

async function loadCategorySuggestions() {
  const { data } = await supabase
    .from('posts')
    .select('category')
    .not('category', 'is', null);
  if (!data) return;
  const unique = new Set([...CATEGORY_SUGGESTIONS]);
  data.forEach(row => { if (row.category) unique.add(row.category); });
  categorySuggestions = Array.from(unique).sort();
}

function renderPostPreview({ title, category, excerpt, imageUrl, isFeatured, position, imagePosition }) {
  const imgBlock = imageUrl
    ? `<div class="prev-img-wrap"><img src="${esc(imageUrl)}" alt="" style="object-position: ${esc(imagePosition || 'center center')};"></div>`
    : `<div class="prev-img-wrap empty">sem imagem</div>`;
  const posBlock = (position != null && position !== '')
    ? `<span class="prev-position">posição ${esc(String(position))}</span>`
    : '';
  return `
    <article class="prev-post-card">
      <div class="prev-card-bar"></div>
      <div class="prev-post-content">
        <span class="prev-cat">${esc(category || 'CATEGORIA')}${isFeatured ? '<span class="prev-featured-badge">Destaque</span>' : ''}</span>
        <h3>${esc(title || 'Título do post')}</h3>
        <p>${esc(excerpt || 'O resumo do post aparece aqui. Digite algo no campo "Resumo" pra ver como fica.')}</p>
        ${posBlock}
      </div>
      ${imgBlock}
      <div class="prev-read-more">Leia mais →</div>
    </article>
  `;
}

export async function loadPosts() {
  const list = document.getElementById('postList');
  list.innerHTML = '<div class="loading-state">Carregando...</div>';

  // Refresh the category datalist in parallel so the modal always has the latest
  loadCategorySuggestions();

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('position', { ascending: true });

  if (error) {
    list.innerHTML = `<div class="error-state">Erro: ${esc(error.message)}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = '<div class="empty-state">Nenhum post ainda. Clique em "+ Novo Post".</div>';
    return;
  }

  list.innerHTML = data.map(p => `
    <div class="post-item" data-id="${p.id}">
      <img src="${esc(p.image_url || 'https://picsum.photos/seed/placeholder/120/80')}" alt="">
      <div class="post-item-info">
        <span class="post-item-cat">${esc(p.category)}${p.is_featured ? '<span class="badge-featured">Destaque</span>' : ''}</span>
        <h4>${esc(p.title)}</h4>
        <p>${esc(p.excerpt || '')}</p>
      </div>
      <div class="post-item-actions">
        <button class="btn btn-secondary btn-sm edit-post" data-id="${p.id}">Editar</button>
        <button class="btn btn-danger btn-sm delete-post" data-id="${p.id}">Excluir</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.edit-post').forEach(btn => {
    btn.addEventListener('click', () => openPostModal(data.find(p => p.id === btn.dataset.id)));
  });
  list.querySelectorAll('.delete-post').forEach(btn => {
    btn.addEventListener('click', () => handleDeletePost(btn.dataset.id));
  });
}

export function openPostModal(post = null) {
  const isEdit = !!post;
  const p = post || { title: '', category: '', excerpt: '', image_url: '', image_position: 'center center', content: '', is_featured: false, position: 0 };

  openModal({
    title: isEdit ? 'Editar Post' : 'Novo Post',
    bodyHtml: `
      <form id="postForm">
        <div class="form-group">
          <label>Título</label>
          <input type="text" id="pf-title" value="${esc(p.title)}" required>
        </div>
        <div class="form-group">
          <label>Categoria</label>
          <input type="text" id="pf-category" list="pf-category-list" value="${esc(p.category || '')}" placeholder="Digite uma categoria (ex: GUIAS, DICAS)">
          <datalist id="pf-category-list">
            ${categorySuggestions.map(c => `<option value="${esc(c)}"></option>`).join('')}
          </datalist>
          <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">Use letras maiúsculas pra ficar consistente. Você pode criar qualquer categoria nova ou reutilizar as sugeridas.</p>
        </div>
        <div class="form-group">
          <label>Resumo (excerpt)</label>
          <textarea id="pf-excerpt">${esc(p.excerpt || '')}</textarea>
        </div>
        <div class="form-group">
          <label>Conteúdo completo</label>
          <textarea id="pf-content" style="min-height: 140px;" placeholder="Pra criar link: [texto do link](https://exemplo.com) ou [https://exemplo.com]">${esc(p.content || '')}</textarea>
          <small style="display:block; margin-top:6px; color: var(--text-muted); font-size: 12px; line-height: 1.5;">
            Formas de criar link:<br>
            • <code>[texto do link](https://url.com)</code> — link com texto customizado<br>
            • <code>[https://url.com]</code> — link usando a própria URL como texto
          </small>
        </div>
        <div class="form-group">
          <label>Imagem de capa</label>
          ${imageUploadHtml(p.image_url, {
            positionable: true,
            position: p.image_position,
            positionInputId: 'pf-image-position',
          })}
          <p style="font-size:11px; color:var(--text-muted); margin-top:4px;">
            Depois de enviar, arraste diretamente na imagem pra escolher o ponto focal.
          </p>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="pf-featured" ${p.is_featured ? 'checked' : ''}>
            Marcar como post em destaque (featured)
          </label>
        </div>
        <div class="form-group">
          <label>Ordem de exibição</label>
          <input type="number" id="pf-position" value="${p.position || 0}">
          <small style="display:block; margin-top:6px; color: var(--text-muted); font-size: 12px;">
            Define em que posição o post aparece no grid. Menor número = aparece primeiro. Use 0, 1, 2, 3... pra ordenar.
          </small>
        </div>
      </form>
    `,
    previewHtml: renderPostPreview({
      title: p.title,
      category: p.category,
      excerpt: p.excerpt,
      imageUrl: p.image_url,
      isFeatured: p.is_featured,
      position: p.position,
      imagePosition: p.image_position,
    }),
    footerHtml: `
      <button class="btn btn-secondary" id="pf-cancel">Cancelar</button>
      <button class="btn" id="pf-save">${isEdit ? 'Salvar' : 'Criar'}</button>
    `,
  });

  // Live preview — delegated: any input/change in the form updates
  const stage = document.getElementById('modalPreviewStage');
  const form = document.getElementById('postForm');
  const getUrlField = () => form.querySelector('[data-role="url-input"]');
  const updatePreview = () => {
    stage.innerHTML = renderPostPreview({
      title: document.getElementById('pf-title').value,
      category: document.getElementById('pf-category').value,
      excerpt: document.getElementById('pf-excerpt').value,
      imageUrl: getUrlField().value,
      isFeatured: document.getElementById('pf-featured').checked,
      position: document.getElementById('pf-position').value,
      imagePosition: document.getElementById('pf-image-position').value,
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
    // the preview's <img> object-position directly to avoid flicker
    (value) => {
      const previewImg = stage.querySelector('.prev-img-wrap img');
      if (previewImg) previewImg.style.objectPosition = value;
    },
  );

  document.getElementById('pf-cancel').onclick = closeModal;
  document.getElementById('pf-save').onclick = async () => {
    const btn = document.getElementById('pf-save');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    const payload = {
      title: document.getElementById('pf-title').value.trim(),
      category: document.getElementById('pf-category').value,
      excerpt: document.getElementById('pf-excerpt').value.trim(),
      content: document.getElementById('pf-content').value.trim(),
      image_url: getUrlField().value.trim(),
      image_position: document.getElementById('pf-image-position').value,
      is_featured: document.getElementById('pf-featured').checked,
      position: parseInt(document.getElementById('pf-position').value) || 0,
      updated_at: new Date().toISOString(),
    };

    if (!payload.title) {
      toast('O título é obrigatório', 'error');
      btn.disabled = false;
      btn.textContent = isEdit ? 'Salvar' : 'Criar';
      return;
    }

    // If marking as featured, unset any other featured post first
    if (payload.is_featured) {
      await supabase.from('posts').update({ is_featured: false }).neq('id', p.id || '00000000-0000-0000-0000-000000000000');
    }

    let error;
    if (isEdit) {
      ({ error } = await supabase.from('posts').update(payload).eq('id', p.id));
    } else {
      ({ error } = await supabase.from('posts').insert(payload));
    }

    if (error) {
      toast('Erro ao salvar: ' + error.message, 'error');
      btn.disabled = false;
      btn.textContent = isEdit ? 'Salvar' : 'Criar';
      return;
    }

    toast('Salvo!', 'success');
    closeModal();
    loadPosts();
  };
}

async function handleDeletePost(id) {
  const ok = await confirmDialog('Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita.');
  if (!ok) return;
  const { error } = await supabase.from('posts').delete().eq('id', id);
  if (error) {
    toast('Erro ao excluir: ' + error.message, 'error');
    return;
  }
  toast('Post excluído', 'success');
  loadPosts();
}
