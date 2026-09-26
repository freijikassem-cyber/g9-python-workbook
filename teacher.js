// Teacher Report: email + password accounts, one private classroom per teacher.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.4/+esm';

const CONFIG = window.G9_CONFIG || {};
const db = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const root = document.getElementById('root');

let T = {
  view: 'loading', // loading | signin | register | forgot | recovery | dashboard
  user: null, classroom: null, students: [], loaded: false,
  message: '', error: '', busy: false, copied: false, updatedAt: 0,
};
let refreshTimer = null;

const studentLink = () => {
  const base = location.href.replace(/teacher\.html.*$/, '');
  return `${base}?class=${encodeURIComponent(T.classroom?.code || '')}`;
};

function shell(body) {
  return `
  <div class="shell">
    <header>
      <a href="./" class="brand">G9 Assignment Helper</a>
      <span class="badge">Teacher page</span>
    </header>
    <main>${body}</main>
    <footer>Created by Mr. Kassem Freiji - ICT Department</footer>
  </div>`;
}

function notes() {
  return `${T.error ? `<p class="error" role="alert">${esc(T.error)}</p>` : ''}${T.message ? `<div class="feedback" role="status">${esc(T.message)}</div>` : ''}`;
}

function authView() {
  const tabs = `
    <div class="auth-tabs" role="tablist">
      <button role="tab" class="${T.view === 'signin' ? 'selected' : ''}" data-action="view" data-view="signin">Sign in</button>
      <button role="tab" class="${T.view === 'register' ? 'selected' : ''}" data-action="view" data-view="register">Create teacher account</button>
    </div>`;
  let form;
  if (T.view === 'register') {
    form = `
      <form data-form="register">
        <label>Full name<input name="fullName" required maxlength="80" autocomplete="name" placeholder="e.g. Kassem Freiji"></label>
        <label>School email<input name="email" type="email" required autocomplete="email" placeholder="name@school.com"></label>
        <label>Password<input name="password" type="password" required minlength="8" autocomplete="new-password" placeholder="At least 8 characters"></label>
        <label>Confirm password<input name="confirm" type="password" required minlength="8" autocomplete="new-password"></label>
        <button class="primary" ${T.busy ? 'disabled' : ''}>${T.busy ? 'Creating account…' : 'Create my account'}</button>
      </form>`;
  } else if (T.view === 'forgot') {
    form = `
      <form data-form="forgot">
        <p class="small" style="margin-bottom:18px">Enter your account email. We will send you a link to choose a new password.</p>
        <label>Email<input name="email" type="email" required autocomplete="email"></label>
        <button class="primary" ${T.busy ? 'disabled' : ''}>${T.busy ? 'Sending…' : 'Send reset link'}</button>
      </form>
      <p class="small" style="margin-top:16px"><a href="#" data-action="view" data-view="signin">Back to sign in</a></p>`;
  } else if (T.view === 'recovery') {
    form = `
      <form data-form="recovery">
        <label>New password<input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
        <label>Confirm new password<input name="confirm" type="password" required minlength="8" autocomplete="new-password"></label>
        <button class="primary" ${T.busy ? 'disabled' : ''}>Save new password</button>
      </form>`;
  } else {
    form = `
      <form data-form="signin">
        <label>Email<input name="email" type="email" required autocomplete="email"></label>
        <label>Password<input name="password" type="password" required autocomplete="current-password"></label>
        <button class="primary" ${T.busy ? 'disabled' : ''}>${T.busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p class="small" style="margin-top:16px"><a href="#" data-action="view" data-view="forgot">Forgot your password?</a></p>`;
  }
  return `
    <div class="eyebrow">TEACHER REPORT</div>
    <h1>Your students’ progress,<br><em>for your eyes only.</em></h1>
    <p class="intro">Create a teacher account with your email and a password. Only you can see the reports of students who use your classroom link.</p>
    <div class="welcome-grid">
      <section class="card">
        ${['signin', 'register'].includes(T.view) ? tabs : `<h2 style="margin-bottom:20px">${T.view === 'forgot' ? 'Reset your password' : 'Choose a new password'}</h2>`}
        ${notes()}
        ${form}
      </section>
      <aside>
        <div class="journey">
          <h3>How it works</h3>
          <div><span class="step active">1</span><p><b>Create your account</b><small>Your email and a password of your choice</small></p></div>
          <div><span class="step">2</span><p><b>Share your classroom link</b><small>Students open the workbook with your link</small></p></div>
          <div><span class="step">3</span><p><b>Follow their progress</b><small>Marks, answers and reflections, updated live</small></p></div>
        </div>
        <div class="hint-note"><p><b>Private by design.</b><br>Reports are stored securely. Each teacher sees only their own students. Students cannot see any reports.</p></div>
      </aside>
    </div>`;
}

function activity(s) {
  if (s.phase === 'report') return s.ended_early ? 'Ended early' : 'Completed';
  return { reflection: 'Reflecting', between: 'Starter finished', starter: 'Starter assignment', followup: 'Follow-up assignment', welcome: 'Just joined' }[s.phase] || s.phase;
}

function dashboardView() {
  const now = Date.now();
  const recent = (s) => now - new Date(s.last_seen).getTime() < 90000;
  const active = T.students.filter((s) => recent(s) && !['report', 'reflection'].includes(s.phase)).length;
  const done = T.students.filter((s) => s.phase === 'report').length;
  const name = T.classroom?.teacher_name || T.user?.user_metadata?.full_name || '';
  const rows = T.students.map((s) => {
    const r = s.reflection || {};
    const results = Array.isArray(s.results) ? s.results : [];
    return `
      <tr>
        <td><b>${esc(s.name)}</b><div class="small">${esc(s.class_name)}</div><div class="small">Joined ${esc(new Date(s.started_at).toLocaleString())}</div></td>
        <td><b>${esc(activity(s))}</b><div class="small">${s.checked}/${s.question_count} checked · ${s.hints}/2 hints</div><div class="small">${recent(s) ? 'Active recently' : 'Last seen ' + esc(new Date(s.last_seen).toLocaleTimeString())}</div></td>
        <td>${Number(s.starter)}</td>
        <td>${Number(s.followup)}</td>
        <td><b class="mark">${Number(s.starter) + Number(s.followup)}</b></td>
        <td class="wrap">${r.learned || r.practice
          ? `<details><summary>Read reflection</summary><p><b>I learned</b><br>${esc(r.learned || 'Not answered')}</p><p><b>I will practise</b><br>${esc(r.practice || 'Not answered')}</p></details>`
          : '<span class="small">Not submitted yet</span>'}</td>
        <td class="wrap">${results.length ? `<details><summary>View answers</summary>${results.map((q) => `
          <div class="answer-block">
            <b>${esc(q.part)} · ${esc(q.title)}</b> <span class="mark">${q.marks} / ${q.points}</span>${q.revealed ? ' <span class="small">(worked answer shown)</span>' : ''}
            <p class="small">${esc(q.feedback)}</p>
            <pre>${esc(q.code || 'No answer submitted.')}</pre>
          </div>`).join('')}</details>` : '<span class="small">No answers yet</span>'}
          <button class="link-button no-print" data-action="delete" data-id="${esc(s.id)}" data-name="${esc(s.name)}">Delete attempt</button></td>
      </tr>`;
  }).join('');

  return `
    <div class="workspace-top">
      <div>
        <div class="eyebrow">CLASSROOM REPORT</div>
        <h1>Your students’ progress.</h1>
        <p class="small">Live student activity and earned marks. Updates automatically every 10 seconds.</p>
      </div>
      <div class="top-buttons no-print">
        <button class="secondary" data-action="refresh">Refresh report</button>
        <button class="secondary" data-action="print">Print</button>
        <button class="secondary" data-action="signout">Sign out</button>
      </div>
    </div>
    ${notes()}
    <section class="card no-print" style="margin-bottom:24px">
      <h2>Your private classroom</h2>
      <p>Signed in as ${esc(name ? `${name} (${T.user.email})` : T.user.email)}. Only students using your classroom link appear here.</p>
      <label for="class-link" style="margin-top:16px">Share this link with your students</label>
      <input id="class-link" readonly value="${esc(studentLink())}" style="margin:12px 0">
      <button class="secondary" data-action="copy">${T.copied ? 'Link copied' : 'Copy student link'}</button>
      <p class="small" style="margin-top:14px">Other teachers can open Teacher Report and create their own account. Each account has a separate, private dashboard.</p>
    </section>
    <div class="score-grid">
      <div><b>${T.students.length}</b><p>Student attempts</p></div>
      <div><b>${active}</b><p>Active recently</p></div>
      <div><b>${done}</b><p>Reports completed</p></div>
    </div>
    ${!T.loaded ? '<p role="status">Loading student reports…</p>'
      : T.students.length === 0
        ? '<section class="card"><h2>No students have joined yet</h2><p>Students appear here when they enter their name and class and open the assignment through your classroom link.</p></section>'
        : `<section class="card"><div class="table-wrap"><table class="teacher-table">
            <thead><tr>${['Student / class', 'Activity', 'Starter / 3', 'Follow-up / 7', 'Total / 10', 'Reflection', 'Answers'].map((h) => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>${rows}</tbody></table></div></section>`}
    ${T.updatedAt ? `<p class="small" style="margin-top:20px">Last updated ${esc(new Date(T.updatedAt).toLocaleTimeString())}. “Active recently” means a connection within the last 90 seconds.</p>` : ''}`;
}

function render() {
  // Keep open "details" panels open across refreshes
  const open = [...document.querySelectorAll('details[open]')].map((d) => d.closest('tr')?.querySelector('[data-id]')?.dataset.id + ':' + d.querySelector('summary')?.textContent);
  root.innerHTML = shell(T.view === 'loading' ? '<p role="status">Loading…</p>' : T.view === 'dashboard' ? dashboardView() : authView());
  document.querySelectorAll('details').forEach((d) => {
    const key = d.closest('tr')?.querySelector('[data-id]')?.dataset.id + ':' + d.querySelector('summary')?.textContent;
    if (open.includes(key)) d.open = true;
  });
}

function setView(view, extra = {}) {
  T = { ...T, view, error: '', message: '', ...extra };
  render();
}

async function loadClassroom() {
  let { data, error } = await db.from('classrooms').select('*').maybeSingle();
  if (error) throw error;
  if (!data) {
    const created = await db.from('classrooms')
      .insert({ teacher_name: T.user.user_metadata?.full_name || '' })
      .select().single();
    if (created.error) throw created.error;
    data = created.data;
  }
  T.classroom = data;
}

async function loadStudents() {
  if (T.view !== 'dashboard') return;
  const { data, error } = await db.from('student_sessions')
    .select('id,name,class_name,phase,ended_early,starter,followup,hints,checked,question_count,reflection,results,started_at,last_seen')
    .order('started_at', { ascending: false });
  if (error) {
    T.error = 'Could not load student reports. Check your connection or sign in again.';
  } else {
    T.students = data;
    T.error = '';
    T.updatedAt = Date.now();
  }
  T.loaded = true;
  if (!document.activeElement || !root.contains(document.activeElement) || document.activeElement.tagName === 'BUTTON' || document.activeElement === document.body) render();
}

async function openDashboard(user) {
  T.user = user;
  try {
    await loadClassroom();
  } catch {
    setView('signin', { error: 'Could not open your classroom. Please try again.' });
    return;
  }
  setView('dashboard', { loaded: false });
  await loadStudents();
  clearInterval(refreshTimer);
  refreshTimer = setInterval(loadStudents, 10000);
}

function friendly(error) {
  const m = (error?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Email or password is incorrect.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'An account with this email already exists. Sign in instead.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox for the confirmation link.';
  if (m.includes('password')) return error.message;
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a few minutes and try again.';
  return error?.message || 'Something went wrong. Please try again.';
}

document.addEventListener('submit', async (e) => {
  const form = e.target.dataset.form;
  if (!form) return;
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  T.busy = true; T.error = ''; T.message = ''; render();
  try {
    if (form === 'signin') {
      const { data, error } = await db.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
      if (error) throw error;
      T.busy = false;
      await openDashboard(data.user);
      return;
    }
    if (form === 'register') {
      if (f.password !== f.confirm) throw new Error('The two passwords do not match.');
      const { data, error } = await db.auth.signUp({
        email: f.email.trim(), password: f.password,
        options: { data: { full_name: f.fullName.trim() }, emailRedirectTo: location.href.split('#')[0].split('?')[0] },
      });
      if (error) throw error;
      T.busy = false;
      if (data.session) { await openDashboard(data.user); return; }
      setView('signin', { message: 'Account created. Check your email and click the confirmation link, then sign in.' });
      return;
    }
    if (form === 'forgot') {
      const { error } = await db.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: location.href.split('#')[0].split('?')[0] });
      if (error) throw error;
      T.busy = false;
      setView('signin', { message: 'If an account exists for that email, a reset link is on its way.' });
      return;
    }
    if (form === 'recovery') {
      if (f.password !== f.confirm) throw new Error('The two passwords do not match.');
      const { data, error } = await db.auth.updateUser({ password: f.password });
      if (error) throw error;
      T.busy = false;
      await openDashboard(data.user);
      return;
    }
  } catch (err) {
    T.busy = false;
    T.error = friendly(err);
    render();
  }
});

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  if (action === 'view') { e.preventDefault(); setView(el.dataset.view); }
  else if (action === 'refresh') loadStudents();
  else if (action === 'print') window.print();
  else if (action === 'signout') {
    clearInterval(refreshTimer);
    await db.auth.signOut();
    T = { ...T, user: null, classroom: null, students: [], loaded: false };
    setView('signin');
  } else if (action === 'copy') {
    try {
      await navigator.clipboard.writeText(studentLink());
      T.copied = true;
    } catch {
      T.error = 'Select and copy your classroom link above.';
    }
    render();
  } else if (action === 'delete') {
    if (!confirm(`Delete ${el.dataset.name || 'this student'}’s attempt? This cannot be undone.`)) return;
    const { error } = await db.from('student_sessions').delete().eq('id', el.dataset.id);
    if (error) { T.error = 'Could not delete this attempt.'; render(); }
    else loadStudents();
  }
});

db.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') setView('recovery');
});

(async () => {
  if (!CONFIG.supabaseUrl) {
    root.innerHTML = shell('<p class="error">The Teacher Report is not connected yet.</p>');
    return;
  }
  const { data } = await db.auth.getSession();
  if (location.hash.includes('type=recovery')) { setView('recovery'); return; }
  if (data.session?.user) await openDashboard(data.session.user);
  else setView('signin');
})();
