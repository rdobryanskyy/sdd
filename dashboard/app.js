/* SDD dashboard — vanilla JS. Mirrors docs/features/ and drives the pipeline
   back into the live Claude session over the MCP channel. */
'use strict';

const qs = new URLSearchParams(location.search);
const TOKEN = qs.get('token') || '';
const SESSION = qs.get('session') || '';

const state = {
  features: [],
  slug: null,
  detail: null,
  artifact: null, // {path, kind, raw, mtime}
  editing: false,
  pendingRun: null, // {slug, stage, timer}
};

// ---- api -------------------------------------------------------------------

function withToken(path) {
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}token=${encodeURIComponent(TOKEN)}`;
}

async function api(path, opts = {}) {
  const res = await fetch(withToken(path), {
    ...opts,
    headers: { 'content-type': 'application/json', 'x-sdd-token': TOKEN, ...(opts.headers || {}) },
  });
  return res;
}

async function apiJson(path, opts) {
  const res = await api(path, opts);
  if (!res.ok) {
    let msg = res.status;
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(String(msg));
  }
  return res.json();
}

// ---- console / log ---------------------------------------------------------

const consoleLog = () => document.getElementById('console-log');

function logLine(kind, text, who) {
  const el = document.createElement('div');
  el.className = `log-line ${kind}`;
  const ts = document.createElement('span');
  ts.className = 'ts';
  ts.textContent = new Date().toLocaleTimeString();
  el.appendChild(ts);
  if (who) {
    const w = document.createElement('span');
    w.className = 'who';
    w.textContent = who + ':';
    el.appendChild(w);
  }
  const body = document.createElement('span');
  body.textContent = text;
  el.appendChild(body);
  const log = consoleLog();
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

// ---- websocket -------------------------------------------------------------

let ws = null;
let wsRetry = 0;

function setConn(on, text) {
  const dot = document.getElementById('conn-dot');
  dot.className = 'dot ' + (on ? 'on' : 'off');
  document.getElementById('conn-text').textContent = text;
}

function connectWs() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${proto}://${location.host}/ws?token=${encodeURIComponent(TOKEN)}&session=${encodeURIComponent(SESSION)}`;
  ws = new WebSocket(url);
  ws.onopen = () => { wsRetry = 0; setConn(true, 'connected'); };
  ws.onclose = () => {
    setConn(false, 'disconnected');
    wsRetry = Math.min(wsRetry + 1, 6);
    setTimeout(connectWs, 500 * wsRetry);
  };
  ws.onerror = () => { try { ws.close(); } catch {} };
  ws.onmessage = (ev) => {
    let frame;
    try { frame = JSON.parse(ev.data); } catch { return; }
    onFrame(frame);
  };
}

function onFrame(f) {
  switch (f.type) {
    case 'hello':
    case 'project':
      if (f.project) document.getElementById('project').textContent = f.project;
      break;
    case 'log':
      logLine(f.level || 'info', f.message + (f.slug ? `  ·${f.slug}` : ''));
      markRunning(f.slug);
      break;
    case 'chat':
      logLine('chat', f.text, f.role === 'claude' ? 'claude' : 'you');
      markRunning(f.slug);
      break;
    case 'command':
      logLine('command', `→ queued ${f.command}`);
      break;
    case 'update':
      logLine('info', `[${f.stage}] ${f.status}${f.message ? ' — ' + f.message : ''}  ·${f.slug || ''}`);
      markRunning(f.slug);
      break;
    case 'done':
      logLine('done', `✓ ${f.stage} done — ${f.summary}${f.verdict ? ' [' + f.verdict + ']' : ''}`);
      if (f.next_command) logLine('system', `next: ${f.next_command}`);
      finishRun(f.slug, f.verdict);
      break;
    case 'artifact_saved':
      if (f.origin && f.origin !== 'dashboard') logLine('system', `artifact changed on disk: ${f.path}`);
      break;
    case 'refresh':
      refresh(f.slug);
      break;
  }
}

// ---- run lifecycle ---------------------------------------------------------

function setBanner(cls, text) {
  const b = document.getElementById('run-banner');
  b.className = 'run-banner ' + cls;
  b.textContent = text;
  b.classList.remove('hidden');
}
function hideBanner() { document.getElementById('run-banner').classList.add('hidden'); }

function startRun(slug, stage, command) {
  if (state.pendingRun && state.pendingRun.timer) clearTimeout(state.pendingRun.timer);
  const timer = setTimeout(() => {
    setBanner('waiting', `Queued: ${command} — Claude consumes this only while idle at the prompt. It may be busy or waiting on a question in your terminal.`);
  }, 6000);
  state.pendingRun = { slug, stage, command, timer, running: false };
  setBanner('queued', `Queued: ${command} — Claude runs it when idle at the prompt.`);
}

function markRunning(slug) {
  const p = state.pendingRun;
  if (!p || p.running) return;
  if (slug && p.slug && slug !== p.slug) return;
  p.running = true;
  if (p.timer) clearTimeout(p.timer);
  setBanner('running', `Running ${p.command} in the session…`);
}

function finishRun(slug, verdict) {
  const p = state.pendingRun;
  if (p && p.timer) clearTimeout(p.timer);
  setBanner('done', `Stage finished${verdict ? ' — ' + verdict : ''}.`);
  state.pendingRun = null;
  setTimeout(hideBanner, 6000);
}

async function runCommand(slug, command) {
  try {
    const res = await api('/api/command', { method: 'POST', body: JSON.stringify({ slug, command }) });
    const data = await res.json();
    if (!res.ok) { logLine('error', `command rejected: ${data.error || res.status}`); return; }
    startRun(slug, command, data.command);
  } catch (e) {
    logLine('error', `command failed: ${e.message}`);
  }
}

// ---- feature list ----------------------------------------------------------

async function loadFeatures() {
  try {
    const data = await apiJson('/api/features');
    if (data.project) document.getElementById('project').textContent = data.project;
    state.features = data.features || [];
    renderFeatureList();
  } catch (e) {
    logLine('error', `could not load features: ${e.message}`);
  }
}

function renderFeatureList() {
  const ul = document.getElementById('feature-list');
  ul.innerHTML = '';
  if (state.features.length === 0) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.style.padding = '10px';
    li.textContent = 'no features yet';
    ul.appendChild(li);
    return;
  }
  for (const f of state.features) {
    const li = document.createElement('li');
    li.className = 'feature-item' + (f.slug === state.slug ? ' active' : '');
    li.onclick = () => selectFeature(f.slug);

    const top = document.createElement('div');
    top.className = 'fi-top';
    const slug = document.createElement('span');
    slug.className = 'fi-slug';
    slug.textContent = f.slug;
    top.appendChild(slug);
    if (f.size) {
      const sz = document.createElement('span');
      sz.className = 'badge size';
      sz.textContent = f.size;
      top.appendChild(sz);
    }
    li.appendChild(top);

    const stage = document.createElement('div');
    stage.className = 'fi-stage';
    stage.textContent = f.shipped ? 'shipped' : f.stage + (f.progress ? `  ${f.progress.pct}%` : '');
    li.appendChild(stage);

    const mini = document.createElement('div');
    mini.className = 'mini-stepper';
    for (const s of f.stages) {
      const d = document.createElement('span');
      d.className = 'mini-dot ' + s.status;
      d.title = `${s.label}: ${s.status}`;
      mini.appendChild(d);
    }
    li.appendChild(mini);
    ul.appendChild(li);
  }
}

// ---- feature detail --------------------------------------------------------

async function selectFeature(slug) {
  state.slug = slug;
  state.artifact = null;
  state.editing = false;
  renderFeatureList();
  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('feature-view').classList.remove('hidden');
  hideBanner();
  await loadDetail(slug);
}

async function loadDetail(slug) {
  try {
    const d = await apiJson(`/api/feature/${encodeURIComponent(slug)}`);
    state.detail = d;
    renderDetail();
  } catch (e) {
    logLine('error', `could not load ${slug}: ${e.message}`);
  }
}

const STATUS_ICON = { done: '●', skipped: '◌', pending: '○', blocked: '✗' };

function renderDetail() {
  const d = state.detail;
  if (!d) return;
  document.getElementById('f-title').textContent = d.title || d.slug;

  const badges = document.getElementById('f-badges');
  badges.innerHTML = '';
  const add = (cls, text) => { const s = document.createElement('span'); s.className = 'badge ' + cls; s.textContent = text; badges.appendChild(s); };
  if (d.size) add('size', d.size);
  if (d.specStatus) add('status', d.specStatus);
  if (d.reviewVerdict === 'PASS') add('pass', 'review: PASS');
  if (d.reviewVerdict === 'CHANGES REQUESTED') add('changes', 'changes requested');
  if (d.shipped) add('shipped', 'shipped');
  for (const s of (d.surfaces || [])) add('surface', s);

  renderStepper(d);
  renderArtifactTabs(d);
}

function renderStepper(d) {
  const wrap = document.getElementById('stepper');
  wrap.innerHTML = '';
  for (const s of d.stages) {
    const step = document.createElement('div');
    step.className = 'step ' + s.status;

    const top = document.createElement('div');
    top.className = 'step-top';
    const ico = document.createElement('span');
    ico.className = 'ico';
    ico.textContent = STATUS_ICON[s.status] || '○';
    top.appendChild(ico);
    const label = document.createElement('span');
    label.className = 'step-label';
    label.textContent = s.label;
    top.appendChild(label);
    step.appendChild(top);

    const st = document.createElement('span');
    st.className = 'step-status';
    st.textContent = s.status;
    step.appendChild(st);

    if (s.status === 'pending' || s.status === 'blocked') {
      const btn = document.createElement('button');
      btn.className = 'ghost run-stage';
      btn.textContent = '▶ run';
      btn.onclick = () => runCommand(d.slug, s.skill);
      step.appendChild(btn);
    }
    wrap.appendChild(step);
  }
}

function nextStage(d) {
  return d.stages.find((s) => s.status === 'pending') || d.stages.find((s) => s.status === 'blocked');
}

// ---- artifacts -------------------------------------------------------------

function renderArtifactTabs(d) {
  const tabs = document.getElementById('artifact-tabs');
  tabs.innerHTML = '';
  for (const a of d.artifacts) {
    const t = document.createElement('div');
    t.className = 'artifact-tab' + (state.artifact && state.artifact.path === a.path ? ' active' : '');
    t.textContent = a.label;
    t.title = a.path;
    t.onclick = () => openArtifact(a);
    tabs.appendChild(t);
  }
  if (d.artifacts.length && !state.artifact) {
    openArtifact(d.artifacts[0]);
  } else if (state.artifact) {
    // re-mark active tab
    [...tabs.children].forEach((c) => c.classList.toggle('active', c.title === state.artifact.path));
  } else {
    document.getElementById('artifact-toolbar').classList.add('hidden');
    document.getElementById('artifact-viewer').innerHTML = '';
  }
}

async function openArtifact(a) {
  state.editing = false;
  try {
    const res = await api(`/api/artifact?slug=${encodeURIComponent(state.slug)}&path=${encodeURIComponent(a.path)}`);
    if (!res.ok) throw new Error(res.status);
    const raw = await res.text();
    const mtime = Number(res.headers.get('x-sdd-mtime') || 0);
    state.artifact = { path: a.path, kind: a.kind, label: a.label, raw, mtime };
    renderArtifactTabs(state.detail);
    renderArtifact();
  } catch (e) {
    logLine('error', `could not open ${a.path}: ${e.message}`);
  }
}

function renderArtifact() {
  const a = state.artifact;
  const toolbar = document.getElementById('artifact-toolbar');
  const viewer = document.getElementById('artifact-viewer');
  toolbar.classList.remove('hidden');
  document.getElementById('artifact-path').textContent = a.path;

  const editable = a.kind !== 'openapi';
  document.getElementById('edit-btn').classList.toggle('hidden', !editable || state.editing);
  document.getElementById('save-btn').classList.toggle('hidden', !state.editing);
  document.getElementById('cancel-btn').classList.toggle('hidden', !state.editing);

  viewer.innerHTML = '';
  if (state.editing) {
    const ta = document.createElement('textarea');
    ta.className = 'editor';
    ta.value = a.raw;
    ta.id = 'editor';
    viewer.appendChild(ta);
    return;
  }

  if (a.kind === 'openapi') return renderOpenApi(a, viewer);
  if (a.kind === 'json') {
    const pre = document.createElement('pre');
    pre.className = 'raw';
    try { pre.textContent = JSON.stringify(JSON.parse(a.raw), null, 2); } catch { pre.textContent = a.raw; }
    viewer.appendChild(pre);
    return;
  }
  if (a.kind === 'text') {
    const pre = document.createElement('pre');
    pre.className = 'raw';
    pre.textContent = a.raw;
    viewer.appendChild(pre);
    return;
  }
  // markdown
  renderMarkdown(a.raw, viewer);
}

function stripFrontmatter(md) {
  // A leading --- … --- YAML block renders as a setext h2 under marked
  // (text + a line of --- = heading). The frontmatter is already shown as
  // badges, so drop it before rendering. Keep a one-line note that it exists.
  if (!md.startsWith('---')) return md;
  const end = md.indexOf('\n---', 3);
  if (end === -1) return md;
  return md.slice(md.indexOf('\n', end + 1) + 1).replace(/^\s+/, '');
}

function renderMarkdown(md, viewer) {
  const div = document.createElement('div');
  div.className = 'md';
  const body = stripFrontmatter(md);
  try {
    div.innerHTML = window.marked ? window.marked.parse(body, { breaks: false, gfm: true }) : escapeHtml(body);
  } catch {
    div.textContent = body;
  }
  viewer.appendChild(div);
  renderMermaidIn(div);
}

let mermaidReady = false;
function ensureMermaid() {
  if (mermaidReady || !window.mermaid) return mermaidReady;
  window.mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    themeVariables: { fontFamily: 'monospace', background: '#0e160e' },
    securityLevel: 'strict',
  });
  mermaidReady = true;
  return true;
}

async function renderMermaidIn(root) {
  if (!ensureMermaid()) return;
  const blocks = root.querySelectorAll('code.language-mermaid');
  let i = 0;
  for (const code of blocks) {
    const src = code.textContent;
    const host = document.createElement('div');
    host.className = 'mermaid';
    const pre = code.closest('pre') || code;
    pre.replaceWith(host);
    try {
      const id = 'mmd-' + Date.now() + '-' + i++;
      const { svg } = await window.mermaid.render(id, src);
      host.innerHTML = svg;
    } catch (e) {
      host.className = 'mermaid-error';
      host.textContent = 'mermaid render error: ' + (e && e.message ? e.message : e);
    }
  }
}

let redocLoaded = false;
function loadRedoc() {
  return new Promise((resolve, reject) => {
    if (redocLoaded && window.Redoc) return resolve();
    const s = document.createElement('script');
    s.src = '/vendor/redoc.standalone.js';
    s.onload = () => { redocLoaded = true; resolve(); };
    s.onerror = () => reject(new Error('failed to load redoc'));
    document.head.appendChild(s);
  });
}

async function renderOpenApi(a, viewer) {
  const host = document.createElement('div');
  host.className = 'redoc-host';
  viewer.appendChild(host);
  try {
    await loadRedoc();
    const specUrl = withToken(`/api/artifact?slug=${encodeURIComponent(state.slug)}&path=${encodeURIComponent(a.path)}`);
    window.Redoc.init(specUrl, { hideDownloadButton: true, theme: { spacing: { sectionVertical: 8 } } }, host);
  } catch (e) {
    host.className = 'mermaid-error';
    host.textContent = 'OpenAPI render error: ' + e.message;
  }
}

// ---- editing ---------------------------------------------------------------

function beginEdit() {
  if (state.pendingRun) {
    if (!confirm('A stage is running in the session. Editing now risks a conflict. Edit anyway?')) return;
  }
  state.editing = true;
  renderArtifact();
}

function cancelEdit() {
  state.editing = false;
  renderArtifact();
}

async function saveEdit() {
  const ta = document.getElementById('editor');
  if (!ta) return;
  const content = ta.value;
  try {
    const res = await api(`/api/feature/${encodeURIComponent(state.slug)}/artifact`, {
      method: 'PUT',
      body: JSON.stringify({ path: state.artifact.path, content, mtime: state.artifact.mtime }),
    });
    if (res.status === 409) {
      const showConflict = () => {
        const v = document.getElementById('artifact-viewer');
        const c = document.createElement('div');
        c.className = 'conflict';
        c.textContent = 'Conflict: this file changed on disk since you opened it. Reload to get the latest, then re-apply your edit.';
        const reload = document.createElement('button');
        reload.className = 'ghost small';
        reload.textContent = 'reload latest';
        reload.onclick = () => openArtifact({ path: state.artifact.path, kind: state.artifact.kind, label: state.artifact.label });
        c.appendChild(document.createTextNode('  '));
        c.appendChild(reload);
        v.prepend(c);
      };
      showConflict();
      logLine('warn', `save conflict on ${state.artifact.path} (stale mtime → 409)`);
      return;
    }
    if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || res.status); }
    const data = await res.json();
    state.artifact.raw = content;
    state.artifact.mtime = data.mtime;
    state.editing = false;
    renderArtifact();
    logLine('info', `saved ${state.artifact.path}`);
  } catch (e) {
    logLine('error', `save failed: ${e.message}`);
  }
}

// ---- refresh ---------------------------------------------------------------

async function refresh(slug) {
  await loadFeatures();
  if (state.slug && (!slug || slug === state.slug)) {
    await loadDetail(state.slug);
    // keep the open artifact in sync if Claude rewrote it (and we're not editing)
    if (state.artifact && !state.editing) {
      const still = state.detail.artifacts.find((x) => x.path === state.artifact.path);
      if (still) await openArtifact(still);
    }
  }
}

// ---- create feature + roadmap ----------------------------------------------

function openModal(title, bodyEl) {
  document.getElementById('modal-title').textContent = title;
  const body = document.getElementById('modal-body');
  body.innerHTML = '';
  body.appendChild(bodyEl);
  document.getElementById('modal').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

function newFeatureDialog() {
  const wrap = document.createElement('div');
  const hint = document.createElement('div');
  hint.className = 'modal-hint';
  hint.textContent = 'Runs /sdd:specify <slug> in the session (depth=easy). Slug must be kebab-case.';
  const input = document.createElement('input');
  input.placeholder = 'feature-slug';
  input.autofocus = true;
  const err = document.createElement('div');
  err.className = 'field-err';
  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  const cancel = document.createElement('button');
  cancel.className = 'ghost small';
  cancel.textContent = 'cancel';
  cancel.onclick = closeModal;
  const create = document.createElement('button');
  create.className = 'ghost small';
  create.textContent = 'create';
  const submit = () => {
    const slug = input.value.trim();
    if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) { err.textContent = 'invalid slug (use a-z, 0-9, hyphen)'; return; }
    closeModal();
    runCommand(slug, 'specify');
    logLine('system', `requested new feature: ${slug}`);
  };
  create.onclick = submit;
  input.onkeydown = (e) => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') closeModal(); };
  actions.append(cancel, create);
  wrap.append(hint, input, err, actions);
  openModal('Create feature', wrap);
  setTimeout(() => input.focus(), 10);
}

async function showRoadmap() {
  try {
    const r = await apiJson('/api/roadmap');
    const wrap = document.createElement('div');
    if (!r.exists) {
      wrap.className = 'modal-hint';
      wrap.textContent = 'No docs/roadmap.md yet.';
    } else {
      const div = document.createElement('div');
      div.className = 'md';
      div.style.maxHeight = '60vh';
      div.style.overflowY = 'auto';
      div.innerHTML = window.marked ? window.marked.parse(r.markdown) : escapeHtml(r.markdown);
      wrap.appendChild(div);
    }
    const actions = document.createElement('div');
    actions.className = 'modal-actions';
    const close = document.createElement('button');
    close.className = 'ghost small';
    close.textContent = 'close';
    close.onclick = closeModal;
    actions.appendChild(close);
    wrap.appendChild(actions);
    openModal('Roadmap', wrap);
  } catch (e) {
    logLine('error', `roadmap: ${e.message}`);
  }
}

// ---- chat ------------------------------------------------------------------

async function sendChat(text) {
  if (!text.trim()) return;
  logLine('chat', text, 'you');
  try {
    const res = await api('/api/chat', { method: 'POST', body: JSON.stringify({ text, slug: state.slug }) });
    if (!res.ok) { const j = await res.json().catch(() => ({})); logLine('error', `chat failed: ${j.error || res.status}`); }
  } catch (e) {
    logLine('error', `chat failed: ${e.message}`);
  }
}

// ---- utils -----------------------------------------------------------------

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---- wire up ---------------------------------------------------------------

function init() {
  document.getElementById('session').textContent = SESSION ? SESSION.slice(0, 8) : '';
  document.getElementById('run-next').onclick = () => {
    const d = state.detail;
    if (!d) return;
    const ns = nextStage(d);
    if (!ns) { logLine('system', 'pipeline complete — nothing pending'); return; }
    runCommand(d.slug, ns.skill);
  };
  document.getElementById('new-feature').onclick = newFeatureDialog;
  document.getElementById('new-feature-2').onclick = newFeatureDialog;
  document.getElementById('roadmap-btn').onclick = showRoadmap;
  document.getElementById('edit-btn').onclick = beginEdit;
  document.getElementById('save-btn').onclick = saveEdit;
  document.getElementById('cancel-btn').onclick = cancelEdit;
  document.getElementById('clear-console').onclick = () => { consoleLog().innerHTML = ''; };
  document.getElementById('chat-form').onsubmit = (e) => {
    e.preventDefault();
    const input = document.getElementById('chat-input');
    sendChat(input.value);
    input.value = '';
  };
  document.getElementById('modal').onclick = (e) => { if (e.target.id === 'modal') closeModal(); };

  if (!TOKEN) {
    setConn(false, 'no token in URL');
    logLine('error', 'No capability token in the URL. Open the link printed by /sdd:start.');
    return;
  }
  setConn(false, 'connecting…');
  loadFeatures();
  connectWs();
}

document.addEventListener('DOMContentLoaded', init);
