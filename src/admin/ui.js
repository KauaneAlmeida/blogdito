// Toast notifications
export function toast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// Modal helpers
const overlay = () => document.getElementById('modalOverlay');

export function openModal({ title, bodyHtml, footerHtml, previewHtml, wide }) {
  document.getElementById('modalTitle').textContent = title;
  const body = document.getElementById('modalBody');

  if (previewHtml != null) {
    body.innerHTML = `
      <div class="modal-split">
        <div class="modal-form-col">${bodyHtml}</div>
        <div class="modal-preview-col">
          <div class="preview-label">Preview ao vivo</div>
          <div class="preview-stage" id="modalPreviewStage">${previewHtml}</div>
        </div>
      </div>
    `;
  } else {
    body.innerHTML = bodyHtml;
  }

  document.getElementById('modalFooter').innerHTML = footerHtml || '';
  const modal = document.getElementById('modal');
  modal.classList.toggle('modal-wide', !!(wide || previewHtml));
  overlay().classList.add('active');
}

export function closeModal() {
  overlay().classList.remove('active');
  document.getElementById('modalBody').innerHTML = '';
  document.getElementById('modalFooter').innerHTML = '';
  document.getElementById('modal').classList.remove('modal-wide');
}

// Close modal on overlay click or close button.
// We track mousedown AND mouseup on the overlay — this prevents accidental closes
// when the user starts a text selection inside an input and releases outside the
// modal (previously the click event would fire with target=overlay and close it).
let mousedownOnOverlay = false;
document.addEventListener('mousedown', (e) => {
  mousedownOnOverlay = e.target === overlay();
});
document.addEventListener('click', (e) => {
  if (e.target.id === 'modalClose') {
    closeModal();
    return;
  }
  if (e.target === overlay() && mousedownOnOverlay) {
    closeModal();
  }
  mousedownOnOverlay = false;
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && overlay().classList.contains('active')) closeModal();
});

// Escape HTML
export function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Confirm dialog
export function confirmDialog(message) {
  return new Promise((resolve) => {
    openModal({
      title: 'Confirmar',
      bodyHtml: `<p style="color: var(--text); font-size: 14px;">${esc(message)}</p>`,
      footerHtml: `
        <button class="btn btn-secondary" id="confirmCancel">Cancelar</button>
        <button class="btn btn-danger" id="confirmOk">Confirmar</button>
      `,
    });
    document.getElementById('confirmCancel').onclick = () => { closeModal(); resolve(false); };
    document.getElementById('confirmOk').onclick = () => { closeModal(); resolve(true); };
  });
}
