/* ============ Helpers ============ */
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type === 'error' ? 'error' : ''}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

async function api(method, url, body, isForm = false) {
  const opts = { method, headers: {} };
  if (body) {
    if (isForm) {
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.message || 'Something went wrong');
  return data;
}

let confirmCallback = null;
function openConfirm(message, cb) {
  document.getElementById('confirm-message').textContent = message;
  confirmCallback = cb;
  document.getElementById('confirm-modal').classList.add('show');
}
function closeConfirm() {
  document.getElementById('confirm-modal').classList.remove('show');
  confirmCallback = null;
}
document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
document.getElementById('confirm-ok').addEventListener('click', async () => {
  if (confirmCallback) {
    try { await confirmCallback(); } catch (e) { toast(e.message, 'error'); }
  }
  closeConfirm();
});

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ============ Sidebar tab switching ============ */
const navButtons = document.querySelectorAll('.dash-nav button');
const panels = document.querySelectorAll('.dash-panel');
navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    navButtons.forEach((b) => b.classList.remove('active'));
    panels.forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.target}`).classList.add('active');
  });
});

/* ============ Image preview on upload boxes ============ */
document.querySelectorAll('.upload-box input[type=file]').forEach((input) => {
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const preview = input.closest('.upload-box').querySelector('.preview');
    if (preview) preview.src = URL.createObjectURL(file);
  });
});

/* ============ PROFILE ============ */
const profileForm = document.getElementById('profile-form');
async function loadProfile() {
  const { profile } = await api('GET', '/api/profile');
  if (!profileForm) return;
  ['name', 'role', 'bio', 'resume_link'].forEach((f) => {
    const input = profileForm.querySelector(`[name="${f}"]`);
    if (input) input.value = profile[f] || '';
  });
  if (profile.profile_photo) {
    document.querySelectorAll('.js-profile-photo-preview').forEach((img) => (img.src = profile.profile_photo));
  }
}
if (profileForm) {
  loadProfile();
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(profileForm);
      const data = await api('PUT', '/api/profile', fd, true);
      toast('Profile updated');
      const photo = data.profile.profile_photo;
      if (photo) document.querySelectorAll('.js-profile-photo-preview').forEach((img) => (img.src = photo));
    } catch (err) { toast(err.message, 'error'); }
  });
}

const passwordForm = document.getElementById('password-form');
if (passwordForm) {
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(passwordForm);
      await api('PUT', '/api/change-password', Object.fromEntries(fd));
      toast('Password changed');
      passwordForm.reset();
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ============ HERO PHOTOS ============ */
const heroForm = document.getElementById('hero-photo-form');
async function loadHeroPhotos() {
  const { items } = await api('GET', '/api/hero-photos');
  const wrap = document.getElementById('hero-photos-list');
  wrap.innerHTML = items.length
    ? items.map((it) => `
      <div class="upload-box" style="cursor:default">
        <img class="preview" src="${it.image}" alt="">
        <div class="txt" style="flex:1"><strong>Hero photo #${it.id}</strong><span>Shown in homepage hero rotation</span></div>
        <button type="button" class="icon-btn danger" data-id="${it.id}" title="Delete">✕</button>
      </div>`).join('')
    : `<div class="empty-state"><strong>No hero photos yet</strong>Upload one or more images above to feature in your homepage hero.</div>`;

  wrap.querySelectorAll('.icon-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      openConfirm('Delete this hero photo?', async () => {
        await api('DELETE', `/api/hero-photos/${btn.dataset.id}`);
        toast('Hero photo removed');
        loadHeroPhotos();
      });
    });
  });
}
if (heroForm) {
  heroForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(heroForm);
    if (!fd.get('image') || !fd.get('image').size) return toast('Choose an image first', 'error');
    try {
      await api('POST', '/api/hero-photos', fd, true);
      toast('Hero photo added');
      heroForm.reset();
      document.getElementById('hero-photo-preview').src = '/img/placeholder.svg';
      loadHeroPhotos();
    } catch (err) { toast(err.message, 'error'); }
  });
  loadHeroPhotos();
}

/* ============ GENERIC SIMPLE-LIST SECTIONS ============
   Handles skills, education, hobbies, trainings, projects, social-links
   via data-driven config + a shared render/CRUD routine. */
const SECTIONS = {
  skills: {
    endpoint: 'skills',
    hasImage: true,
    columns: [{ key: 'title', label: 'Title' }],
    fields: ['title'],
    row: (it) => `
      <td>${it.image ? `<img class="thumb" src="${it.image}">` : '<span class="badge">no image</span>'}</td>
      <td>${escapeHtml(it.title)}</td>`
  },
  education: {
    endpoint: 'education',
    hasImage: false,
    fields: ['degree', 'institution', 'year', 'description'],
    row: (it) => `
      <td>${escapeHtml(it.degree)}</td>
      <td>${escapeHtml(it.institution)}</td>
      <td>${escapeHtml(it.year)}</td>`
  },
  hobbies: {
    endpoint: 'hobbies',
    hasImage: false,
    fields: ['title', 'icon'],
    row: (it) => `<td>${escapeHtml(it.title)}</td><td>${escapeHtml(it.icon)}</td>`
  },
  trainings: {
    endpoint: 'trainings',
    hasImage: false,
    fields: ['title', 'organization', 'year', 'description'],
    row: (it) => `<td>${escapeHtml(it.title)}</td><td>${escapeHtml(it.organization)}</td><td>${escapeHtml(it.year)}</td>`
  },
  projects: {
    endpoint: 'projects',
    hasImage: true,
    fields: ['title', 'description', 'link', 'tags'],
    row: (it) => `
      <td>${it.image ? `<img class="thumb" src="${it.image}">` : '<span class="badge">no image</span>'}</td>
      <td>${escapeHtml(it.title)}</td>
      <td><a href="${escapeHtml(it.link)}" target="_blank" style="color:var(--mint)">${it.link ? 'link' : '—'}</a></td>`
  },
  social: {
    endpoint: 'social-links',
    hasImage: false,
    fields: ['platform', 'url', 'icon'],
    row: (it) => `<td>${escapeHtml(it.platform)}</td><td style="max-width:220px;overflow:hidden;text-overflow:ellipsis">${escapeHtml(it.url)}</td>`
  }
};

async function loadSection(key) {
  const cfg = SECTIONS[key];
  const { items } = await api('GET', `/api/${cfg.endpoint}`);
  const tbody = document.querySelector(`#table-${key} tbody`);
  const colCount = tbody.closest('table').querySelectorAll('thead th').length;
  tbody.innerHTML = items.length
    ? items.map((it) => `<tr data-id="${it.id}">${cfg.row(it)}<td class="row-actions">
        <button class="icon-btn js-edit" title="Edit">✎</button>
        <button class="icon-btn danger js-del" title="Delete">✕</button>
      </td></tr>`).join('')
    : `<tr><td colspan="${colCount}"><div class="empty-state"><strong>Nothing here yet</strong>Use the form above to add your first entry.</div></td></tr>`;

  tbody.querySelectorAll('.js-del').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      openConfirm('Delete this entry? This cannot be undone.', async () => {
        await api('DELETE', `/api/${cfg.endpoint}/${id}`);
        toast('Deleted');
        loadSection(key);
      });
    });
  });

  tbody.querySelectorAll('.js-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').dataset.id;
      const item = items.find((i) => String(i.id) === id);
      fillFormForEdit(key, item);
    });
  });
}

function fillFormForEdit(key, item) {
  const form = document.getElementById(`form-${key}`);
  form.dataset.editingId = item.id;
  SECTIONS[key].fields.forEach((f) => {
    const input = form.querySelector(`[name="${f}"]`);
    if (input) input.value = item[f] ?? '';
  });
  if (SECTIONS[key].hasImage) {
    const preview = form.querySelector('.preview');
    if (preview && item.image) preview.src = item.image;
  }
  form.querySelector('.js-submit-label').textContent = 'Save changes';
  form.querySelector('.js-cancel-edit').style.display = 'inline-flex';
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

Object.keys(SECTIONS).forEach((key) => {
  const form = document.getElementById(`form-${key}`);
  if (!form) return;
  const cfg = SECTIONS[key];

  form.querySelector('.js-cancel-edit')?.addEventListener('click', () => {
    form.reset();
    delete form.dataset.editingId;
    form.querySelector('.js-submit-label').textContent = 'Add';
    form.querySelector('.js-cancel-edit').style.display = 'none';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const editingId = form.dataset.editingId;
    try {
      const fd = new FormData(form);
      if (editingId) {
        await api('PUT', `/api/${cfg.endpoint}/${editingId}`, fd, true);
        toast('Updated');
      } else {
        await api('POST', `/api/${cfg.endpoint}`, fd, true);
        toast('Added');
      }
      form.reset();
      delete form.dataset.editingId;
      const label = form.querySelector('.js-submit-label');
      if (label) label.textContent = 'Add';
      const cancelBtn = form.querySelector('.js-cancel-edit');
      if (cancelBtn) cancelBtn.style.display = 'none';
      loadSection(key);
    } catch (err) { toast(err.message, 'error'); }
  });

  loadSection(key);
});

/* ============ CONTACT INFO ============ */
const contactInfoForm = document.getElementById('contact-info-form');
async function loadContactInfo() {
  const { info } = await api('GET', '/api/contact-info');
  ['email', 'phone', 'address'].forEach((f) => {
    const input = contactInfoForm.querySelector(`[name="${f}"]`);
    if (input) input.value = info[f] || '';
  });
}
if (contactInfoForm) {
  loadContactInfo();
  contactInfoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData(contactInfoForm);
      await api('PUT', '/api/contact-info', Object.fromEntries(fd));
      toast('Contact info updated');
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ============ MESSAGES ============ */
async function loadMessages() {
  const { items } = await api('GET', '/api/messages');
  const wrap = document.getElementById('messages-list');
  wrap.innerHTML = items.length
    ? items.map((m) => `
      <div class="dash-card" data-id="${m.id}" style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
          <div>
            <strong>${escapeHtml(m.name)}</strong> &middot; <span style="color:var(--text-muted);font-size:13px;">${escapeHtml(m.email)}</span>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px;font-family:var(--font-mono)">${escapeHtml(m.created_at)}</div>
          </div>
          <span class="badge ${m.is_read ? '' : 'unread'}">${m.is_read ? 'read' : 'new'}</span>
        </div>
        ${m.subject ? `<div style="margin-top:10px;font-weight:600;">${escapeHtml(m.subject)}</div>` : ''}
        <p style="margin-top:8px;color:var(--text-muted);font-size:14.5px;">${escapeHtml(m.message)}</p>
        <div class="row-actions" style="margin-top:16px;">
          ${m.is_read ? '' : '<button class="btn btn-ghost btn-sm js-read">Mark as read</button>'}
          <button class="btn btn-ghost btn-sm js-del-msg" style="color:var(--danger);border-color:var(--danger)">Delete</button>
        </div>
      </div>`).join('')
    : `<div class="empty-state"><strong>No messages yet</strong>Submissions from your Contact Us page will show up here.</div>`;

  wrap.querySelectorAll('.js-read').forEach((btn) => btn.addEventListener('click', async () => {
    const id = btn.closest('[data-id]').dataset.id;
    await api('PUT', `/api/messages/${id}/read`);
    loadMessages();
  }));
  wrap.querySelectorAll('.js-del-msg').forEach((btn) => btn.addEventListener('click', () => {
    const id = btn.closest('[data-id]').dataset.id;
    openConfirm('Delete this message?', async () => {
      await api('DELETE', `/api/messages/${id}`);
      toast('Message deleted');
      loadMessages();
    });
  }));
}
if (document.getElementById('messages-list')) loadMessages();
