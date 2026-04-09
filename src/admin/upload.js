import { supabase } from '../lib/supabase.js';

const BUCKET = 'blog-images';

// Parse a CSS object-position string like "50% 30%" or "center top" into {x, y} percentages
function parsePosition(value) {
  if (!value) return { x: 50, y: 50 };
  const v = String(value).trim().toLowerCase();
  const keywordMap = { left: 0, top: 0, center: 50, right: 100, bottom: 100 };
  const parts = v.split(/\s+/);
  const toPct = (part, isX) => {
    if (part in keywordMap) return keywordMap[part];
    const m = part.match(/^(-?\d+(?:\.\d+)?)%?$/);
    if (m) return Math.max(0, Math.min(100, parseFloat(m[1])));
    return isX ? 50 : 50;
  };
  if (parts.length === 1) return { x: toPct(parts[0], true), y: 50 };
  return { x: toPct(parts[0], true), y: toPct(parts[1], false) };
}

export async function uploadImage(file) {
  if (!file) return null;
  const ext = file.name.split('.').pop().toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, file, {
      cacheControl: '31536000', // 1 year — images are content-addressed by filename
      upsert: false,
      contentType: file.type || undefined,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

// Each imageUploadHtml call gets a unique scope id. bindImageUpload finds
// widgets by scope, not by fixed ids, so multiple upload widgets can coexist
// on the same page (e.g. the logo uploader in Config tab + a modal upload).
let uploadScopeCounter = 0;

// Renders the image upload + inline positioning area.
// Options:
//   positionable (bool) — when true, after a file is uploaded the image
//     fills the area and the admin can drag it to set the focal point.
//   position (string) — initial CSS object-position value (e.g. "50% 30%")
//   positionInputId (string) — id of the hidden input that holds the position value.
//     Must be unique across the page when positionable is true.
export function imageUploadHtml(currentUrl = '', options = {}) {
  const positionable = options.positionable !== false; // default: on
  const position = options.position || 'center center';
  const scope = `iu-${++uploadScopeCounter}`;
  const positionInputId = options.positionInputId || `imagePosition-${uploadScopeCounter}`;
  const { x, y } = parsePosition(position);
  const hasImage = !!currentUrl;

  return `
    <div class="image-upload ${positionable ? 'positionable' : ''} ${hasImage ? 'has-image' : ''}"
         data-upload-scope="${scope}"
         data-position-input-id="${positionInputId}">
      <img
        class="preview ${hasImage ? 'visible' : ''}"
        data-role="preview"
        src="${currentUrl || ''}"
        alt=""
        draggable="false"
        style="object-position: ${x}% ${y}%;"
      >
      <div class="image-upload-overlay" data-role="overlay">
        <div class="image-upload-overlay-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/>
            <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/>
            <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/>
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
          </svg>
          <span>Arraste para reposicionar</span>
        </div>
        <button type="button" class="image-upload-change-btn" data-role="change-btn">Trocar imagem</button>
      </div>
      <div class="image-upload-crosshair" data-role="crosshair" style="left: ${x}%; top: ${y}%;"><span></span></div>
      <div class="image-upload-empty" data-role="empty">
        <p data-role="text">Clique ou arraste uma imagem pra cá</p>
      </div>
      <input type="file" data-role="file-input" accept="image/*">
      <input type="hidden" data-role="url-input" value="${currentUrl}">
      ${positionable ? `<input type="hidden" data-role="position-input" id="${positionInputId}" value="${x}% ${y}%">` : ''}
    </div>
  `;
}

// Binds the most recently rendered (unbound) upload widget on the page.
// onPositionChange fires in real time as the admin drags the focal point.
export function bindImageUpload(onUploadStart, onUploadEnd, onPositionChange) {
  // Find the latest unbound widget. Typical flow: a modal just rendered
  // its bodyHtml with one imageUploadHtml call, and now we're binding it.
  const widgets = document.querySelectorAll('.image-upload:not([data-bound])');
  const dropzone = widgets[widgets.length - 1];
  if (!dropzone) return;
  dropzone.setAttribute('data-bound', '1');

  const find = (role) => dropzone.querySelector(`[data-role="${role}"]`);
  const input = find('file-input');
  const preview = find('preview');
  const urlInput = find('url-input');
  const textEl = find('text');
  const crosshair = find('crosshair');
  const positionInput = find('position-input');
  const overlay = find('overlay');
  const changeBtn = find('change-btn');

  if (!input) return;

  const setHasImage = (hasImage) => {
    dropzone.classList.toggle('has-image', hasImage);
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      if (textEl) textEl.textContent = 'Só é possível enviar imagens.';
      return;
    }
    try {
      if (textEl) textEl.textContent = 'Enviando...';
      onUploadStart && onUploadStart();
      const url = await uploadImage(file);
      urlInput.value = url;
      preview.src = url;
      preview.classList.add('visible');
      setHasImage(true);
      if (textEl) textEl.textContent = 'Clique ou arraste pra cá';
      onUploadEnd && onUploadEnd(url);
    } catch (err) {
      if (textEl) textEl.textContent = 'Erro ao enviar. Tente novamente.';
      console.error(err);
      onUploadEnd && onUploadEnd(null, err);
    }
  };

  input.addEventListener('change', (e) => handleFile(e.target.files[0]));

  // Empty-state click: clicking the dropzone (when there's no image) opens the file picker
  dropzone.addEventListener('click', (e) => {
    if (dropzone.classList.contains('has-image')) return;
    if (e.target.closest('button') || e.target.closest('a')) return;
    input.click();
  });

  // "Trocar imagem" button
  if (changeBtn) {
    changeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      input.click();
    });
  }

  // File drag & drop from OS
  const isFileDrag = (e) => e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files');

  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dragging');
    });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dragging');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    if (!isFileDrag(e)) return;
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  // Prevent native image drag ghost
  preview.addEventListener('dragstart', (e) => e.preventDefault());

  // ===== Focal point drag =====
  if (!dropzone.classList.contains('positionable')) return;

  const updatePositionFromEvent = (clientX, clientY) => {
    const rect = dropzone.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    const value = `${Math.round(x)}% ${Math.round(y)}%`;
    preview.style.objectPosition = value;
    if (crosshair) {
      crosshair.style.left = `${x}%`;
      crosshair.style.top = `${y}%`;
    }
    if (positionInput) positionInput.value = value;
    if (onPositionChange) onPositionChange(value);
  };

  // Mouse drag with document-level move/up so the drag persists when the
  // cursor leaves the dropzone
  let dragging = false;

  const onMove = (e) => {
    if (!dragging) return;
    updatePositionFromEvent(e.clientX, e.clientY);
    e.preventDefault();
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    dropzone.classList.remove('positioning');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  const onDown = (e) => {
    if (e.button !== 0) return;
    if (!dropzone.classList.contains('has-image')) return;
    if (e.target.closest('button') || e.target.closest('a')) return;

    dragging = true;
    dropzone.classList.add('positioning');
    updatePositionFromEvent(e.clientX, e.clientY);
    e.preventDefault();
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // Attach to both preview and dropzone — redundant but defensive
  preview.addEventListener('mousedown', onDown);
  dropzone.addEventListener('mousedown', onDown);
  if (overlay) overlay.addEventListener('mousedown', onDown);
  if (crosshair) crosshair.addEventListener('mousedown', onDown);

  // Touch support
  let touchDragging = false;
  const onTouchMove = (e) => {
    if (!touchDragging) return;
    const t = e.touches[0];
    if (t) updatePositionFromEvent(t.clientX, t.clientY);
    e.preventDefault();
  };
  const onTouchEnd = () => {
    if (!touchDragging) return;
    touchDragging = false;
    dropzone.classList.remove('positioning');
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('touchcancel', onTouchEnd);
  };
  const onTouchStart = (e) => {
    if (!dropzone.classList.contains('has-image')) return;
    if (e.target.closest('button') || e.target.closest('a')) return;
    touchDragging = true;
    dropzone.classList.add('positioning');
    const t = e.touches[0];
    if (t) updatePositionFromEvent(t.clientX, t.clientY);
    e.preventDefault();
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
  };
  preview.addEventListener('touchstart', onTouchStart, { passive: false });
  dropzone.addEventListener('touchstart', onTouchStart, { passive: false });
}
