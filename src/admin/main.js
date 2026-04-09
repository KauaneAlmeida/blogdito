import './style.css';
import { supabase, ADMIN_EMAIL } from '../lib/supabase.js';
import { mountLogo } from '../lib/logo.js';
import { toast } from './ui.js';
import { loadPosts, openPostModal } from './posts.js';
import { loadBanners, openBannerModal } from './banners.js';
import { loadSidebar, openSidebarModal } from './sidebar.js';
import { loadSections, openSectionModal } from './sections.js';
import { loadConfig } from './config.js';
import { startTour } from './tour.js';

// Load logo config once and mount it on login + admin header
async function loadAndMountLogo() {
  const { data } = await supabase.from('site_config').select('*');
  const config = {};
  (data || []).forEach(row => { config[row.key] = row.value; });
  mountLogo('loginLogo', config);
  mountLogo('adminLogo', config, { subOverride: 'ADMIN' });
}
loadAndMountLogo();

const loginWrap = document.getElementById('loginWrap');
const adminWrap = document.getElementById('adminWrap');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailEl = document.getElementById('userEmail');

// ===== Session =====
async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    showAdmin(session.user);
  } else {
    showLogin();
  }
}

function showLogin() {
  loginWrap.style.display = 'flex';
  adminWrap.classList.remove('active');
}

function showAdmin(user) {
  loginWrap.style.display = 'none';
  adminWrap.classList.add('active');
  userEmailEl.textContent = user.email;

  if (user.email !== ADMIN_EMAIL) {
    toast('Atenção: você não tem permissão de edição com este email. A escrita será bloqueada pelas políticas do banco.', 'error');
  }

  // Load initial tab
  loadPosts();
  loadBanners();
  loadSidebar();
  loadSections();
  loadConfig();

  // Start the virtual tour on first access (skipped automatically if already seen)
  setTimeout(() => startTour(), 400);
}

// ===== Login =====
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginBtn.disabled = true;
  loginBtn.textContent = 'Entrando...';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    toast('Erro: ' + error.message, 'error');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar';
    return;
  }

  toast('Bem-vindo!', 'success');
  showAdmin(data.user);
});

// ===== Logout =====
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  toast('Até mais!', 'success');
  setTimeout(() => location.reload(), 400);
});

// ===== Tabs =====
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.querySelector(`[data-panel="${target}"]`).classList.add('active');
  });
});

// ===== Buttons =====
document.getElementById('newPostBtn').addEventListener('click', () => openPostModal());
document.getElementById('newBannerBtn').addEventListener('click', () => openBannerModal());
document.getElementById('newSidebarBtn').addEventListener('click', () => openSidebarModal());
document.getElementById('newSectionBtn').addEventListener('click', () => openSectionModal());

// ===== Init =====
checkSession();
