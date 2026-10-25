(function () {
  'use strict';
  const M = window.Oaktown;
  const state = M.demoState();
  let activeId = state.notices[0].id;
  let nextId = state.notices.length + 1;
  let currentView = 'notices';
  let dirty = false;
  const $ = id => document.getElementById(id);
  const active = () => state.notices.find(n => n.id === activeId);
  const e = M.escape;
  const lines = text => e(text).replace(/\n/g, '<br>');
  const recipient = n => n.recipient + (n.occupants ? ' & All Occupants' : '');
  function announce(text) { $('announcement').textContent = text; }
  function options() {
    $('notice-picker').innerHTML = state.notices.map(n => '<option value="' + e(n.id) + '">' + e(n.recipient || 'Untitled notice') + '</option>').join('');
    $('notice-picker').value = activeId;
    $('notice-id').textContent = activeId.replace('notice-', 'Draft #');
  }
  function stats() {
    const totals = state.notices.map(M.total);
    $('stat-count').textContent = state.notices.length;
    $('nav-count').textContent = state.notices.length;
    $('stat-total').textContent = totals.includes(null) ? 'Check amounts' : M.money(totals.reduce((a, b) => a + b, 0));
    $('stat-mail').textContent = state.notices.filter(n => n.selected).length;
  }
  function fillEditor() {
    const n = active();
    document.querySelectorAll('[data-sender]').forEach(input => { input.value = state.sender[input.dataset.sender]; });
    document.querySelectorAll('[data-notice]').forEach(input => {
      if (input.type === 'checkbox') input.checked = n[input.dataset.notice];
      else input.value = n[input.dataset.notice];
    });
    renderCharges();
    document.querySelectorAll('[data-filing]').forEach(input => {
      if (input.type === 'checkbox') input.checked = n.filing[input.dataset.filing];
      else input.value = n.filing[input.dataset.filing];
    });
    renderDerived();
  }
  function renderCharges() {
    $('charge-editor').innerHTML = active().charges.map((r, i) =>
      '<div class="charge-item"><div class="charge-heading"><span>STATEMENT LINE ' + (i + 1) + '</span><button class="text-button remove-line" data-remove="' + i + '" aria-label="Remove statement line ' + (i + 1) + '">Remove</button></div>' +
      '<div class="fields two">' + chargeField(i, 'date', 'Due date', r.date, 'date') + chargeField(i, 'category', 'Category', r.category) + '</div>' +
      chargeField(i, 'description', 'Description', r.description) +
      '<div class="fields two">' + chargeField(i, 'amount', 'Charge amount ($)', r.amount, 'money') + chargeField(i, 'due', 'Amount due ($)', r.due, 'money') + '</div></div>'
    ).join('');
  }
  function chargeField(i, key, label, value, type = 'text') {
    return '<label>' + label + '<input aria-label="' + label + ' line ' + (i + 1) + '" data-row="' + i + '" data-charge="' + key + '" value="' + e(value) + '" type="' + (type === 'money' ? 'text' : type) + '"' + (type === 'money' ? ' inputmode="decimal" maxlength="11"' : ' maxlength="500"') + '></label>';
  }
  function noticeHTML(n) {
    const amount = M.total(n);
    const body = n.body.replace(/\{\{total\}\}/g, M.money(amount)).replace(/\{\{date\}\}/g, M.displayDate(n.date));
    return '<article class="document"><div class="draft-strip"><span>OAKTOWN OPS · WORKING DRAFT</span><span>FOR REVIEW ONLY</span></div>' +
      '<div class="sender">' + e(state.sender.name || 'Sender name') + '<span>' + lines(state.sender.address || 'Return address') + '</span></div>' +
      '<div class="date-line">' + e(M.displayDate(n.date)) + '</div><div class="recipient">' + e(n.recipient ? recipient(n) : 'Recipient names') + '<br>' + lines(n.address || 'Recipient address') + '</div>' +
      '<h2>' + e(n.title || 'Notice heading') + '</h2><p>Dear Tenant(s) and all occupants,</p><p>' + lines(body) + '</p>' +
      '<div class="balance"><span>Current amount due</span><strong>' + e(M.money(amount)) + '</strong></div><p>Sincerely,<br>' + lines(n.signoff) + '</p><h3>Current statement</h3>' +
      '<table class="statement"><thead><tr><th scope="col">Due date</th><th scope="col">Description</th><th scope="col">Status</th><th class="numeric" scope="col">Amount</th><th class="numeric" scope="col">Due</th></tr></thead><tbody>' +
      n.charges.map(r => '<tr><td>' + e(M.displayDate(r.date)) + '</td><td>' + e(r.description) + '<small>' + e(r.category) + '</small></td><td>' + M.rowStatus(r) + '</td><td class="numeric">' + e(M.money(M.cents(r.amount))) + '</td><td class="numeric">' + e(M.money(M.cents(r.due))) + '</td></tr>').join('') +
      '</tbody></table></article>';
  }
  function showErrors(id, errors) {
    $(id).innerHTML = errors.length ? '<strong>Check before printing</strong><ul>' + errors.map(x => '<li>' + e(x) + '</li>').join('') + '</ul>' : '';
  }
  function renderNotice() {
    const n = active(), issues = M.errors(n, state.sender);
    $('notice-preview').innerHTML = noticeHTML(n);
    $('editor-total').textContent = M.money(M.total(n));
    showErrors('validation', issues);
    $('print-notice').disabled = issues.length > 0;
  }
  function renderMailingEditor() {
    $('mailing-editor').innerHTML = state.notices.map(n =>
      '<div class="mailing-row"><label class="checkbox-label"><input type="checkbox" data-selected="' + e(n.id) + '"' + (n.selected ? ' checked' : '') + '><span class="mailing-recipient">' + e(n.recipient || 'Untitled notice') + '<small>' + lines(n.address || 'Address needed') + '</small></span></label>' +
      '<label>Tracking / article number<input data-tracking="' + e(n.id) + '" value="' + e(n.tracking) + '" maxlength="100" placeholder="Not recorded"></label></div>'
    ).join('');
  }
  function mailingIssues() {
    const selected = state.notices.filter(n => n.selected), issues = [];
    if (!selected.length) issues.push('Select at least one notice.');
    if (!state.sender.name.trim() || !state.sender.address.trim()) issues.push('Complete the sender details in Notice studio.');
    selected.forEach(n => {
      if (!n.recipient.trim() || !n.address.trim()) issues.push((n.recipient || n.id) + ': complete the recipient and address.');
    });
    return issues;
  }
  function mailingHTML() {
    const rows = M.mailingRows(state.notices);
    if (!rows.length) return '<div class="empty">Select notices above to build the worksheet.</div>';
    return '<article class="document mail-sheet"><div class="draft-strip"><span>OAKTOWN OPS · PREPARATION WORKSHEET</span><span>NOT A POSTAL RECEIPT</span></div><h2>Mailing worksheet</h2><p><strong>' + e(state.sender.name) + '</strong><br>' + lines(state.sender.address) + '</p><p>' + rows.length + ' pieces selected · Prepared ' + M.displayDate(M.today()) + '</p><table class="mail-table"><thead><tr><th scope="col">#</th><th scope="col">Recipient & address</th><th scope="col">Tracking / article number</th></tr></thead><tbody>' +
      rows.map(r => '<tr><td>' + r.number + '</td><td><strong>' + e(r.recipient) + '</strong><br>' + lines(r.address) + '</td><td>' + e(r.tracking || 'Not recorded') + '</td></tr>').join('') +
      '</tbody></table><p class="print-footnote">Preparation worksheet only. Not an approved USPS Form 3877, mailing receipt, or evidence of delivery. Complete applicable postal forms and retain acceptance records separately.</p></article>';
  }
  function renderMailing() {
    $('mailing-preview').innerHTML = mailingHTML();
    const issues = mailingIssues();
    showErrors('mailing-validation', issues);
    $('print-mailing').disabled = issues.length > 0;
  }
  function renderFiling() {
    const f = active().filing;
    $('court-fields').disabled = !f.confirmed;
    const issues = M.filingErrors(f);
    $('filing-validation').innerHTML = issues.length ? '<strong>Review this record</strong><ul>' + issues.map(x => '<li>' + e(x) + '</li>').join('') + '</ul>' : '';
    let status = 'Awaiting attorney confirmation';
    if (f.confirmed) status = issues.length ? 'Confirmation recorded · details need review' : 'Filing confirmed · manual record';
    $('filing-summary').innerHTML = '<span class="status-chip">' + status + '</span><h2>' + e(active().recipient || 'Untitled notice') + '</h2>' +
      (!f.confirmed ? '<p class="muted">Record the attorney confirmation before planning court follow-up. Any previously entered dates are retained but inactive.</p>' :
      '<dl class="summary-grid"><div><dt>Attorney update</dt><dd>' + e(f.reference || 'Not recorded') + '</dd></div><div><dt>Court date & time</dt><dd>' + e(f.courtDate ? M.displayDate(f.courtDate) : 'Not recorded') + (f.courtTime ? ' · ' + e(f.courtTime) + ' ' + e(f.timezone) : '') + '</dd></div><div><dt>Reminder plan</dt><dd>' + e(f.reminderDate ? M.displayDate(f.reminderDate) : 'Not planned') + '<br>' + e(f.owner || 'Owner not assigned') + '</dd></div></dl><p class="muted">' + lines(f.notes) + '</p>') +
      '<p class="field-hint" style="margin:20px 0 0">No automatic reminders. This record disappears on refresh.</p>';
  }
  function renderDerived() { stats(); renderNotice(); renderMailing(); renderFiling(); }
  function setView(view) {
    currentView = view;
    const info = {
      notices: ['Notice studio', 'Turn the details into a clear, reviewable draft.'],
      mailing: ['Mailing worksheet', 'Bring the right recipients together in one place.'],
      filing: ['Court follow-up', 'Keep the next date and the next action in view.']
    };
    document.querySelectorAll('.view').forEach(el => { el.hidden = el.id !== view + '-view'; });
    document.querySelectorAll('[data-view]').forEach(button => {
      const chosen = button.dataset.view === view;
      button.classList.toggle('active', chosen);
      if (chosen) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    $('page-title').textContent = info[view][0];
    $('breadcrumb').textContent = info[view][0];
    $('page-description').textContent = info[view][1];
    document.title = 'Oaktown Ops — ' + info[view][0];
    document.querySelector('.notice-switcher').hidden = view === 'mailing';
    if (view === 'mailing') renderMailingEditor();
    renderDerived();
  }
  document.addEventListener('input', event => {
    const el = event.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    if (el.dataset.sender) state.sender[el.dataset.sender] = el.value;
    else if (el.dataset.notice) {
      active()[el.dataset.notice] = el.type === 'checkbox' ? el.checked : el.value;
      if (el.dataset.notice === 'recipient') options();
    } else if (el.dataset.charge) active().charges[Number(el.dataset.row)][el.dataset.charge] = el.value;
    else if (el.dataset.filing) active().filing[el.dataset.filing] = el.type === 'checkbox' ? el.checked : el.value;
    else if (el.dataset.selected) state.notices.find(n => n.id === el.dataset.selected).selected = el.checked;
    else if (el.dataset.tracking) state.notices.find(n => n.id === el.dataset.tracking).tracking = el.value;
    else return;
    dirty = true;
    renderDerived();
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.view) setView(button.dataset.view);
    if (button.dataset.remove !== undefined) {
      const index = Number(button.dataset.remove);
      active().charges.splice(index, 1); dirty = true; renderCharges(); renderDerived();
      $('add-line').focus(); announce('Statement line removed.');
    }
  });
  $('notice-picker').addEventListener('change', event => { activeId = event.target.value; options(); fillEditor(); announce('Working notice changed.'); });
  $('new-notice').addEventListener('click', () => {
    const n = M.blankNotice('notice-' + nextId++);
    state.notices.push(n); activeId = n.id; dirty = true;
    options(); fillEditor(); setView('notices'); $('recipient').focus(); announce('New working notice created.');
  });
  $('add-line').addEventListener('click', () => {
    active().charges.push({ date: active().date || M.today(), category: 'RENT', description: '', amount: '', due: '' });
    dirty = true; renderCharges(); renderDerived();
    $('charge-editor').lastElementChild.querySelector('input').focus(); announce('Statement line added.');
  });
  function preparePrint(kind) {
    const issues = kind === 'mailing' ? mailingIssues() : M.errors(active(), state.sender);
    if (issues.length) { announce('Complete the highlighted fields before printing.'); return; }
    $('print-root').innerHTML = kind === 'mailing' ? mailingHTML() : noticeHTML(active());
    window.print();
  }
  $('print-notice').addEventListener('click', () => preparePrint('notice'));
  $('print-mailing').addEventListener('click', () => preparePrint('mailing'));
  window.addEventListener('beforeprint', () => {
    if (currentView === 'filing') {
      $('print-root').innerHTML = '<article class="document"><div class="draft-strip">OAKTOWN OPS · MANUAL FOLLOW-UP PLAN</div>' + $('filing-summary').innerHTML + '</article>';
      return;
    }
    const issues = currentView === 'mailing' ? mailingIssues() : M.errors(active(), state.sender);
    $('print-root').innerHTML = issues.length ? '<article class="document"><h2>Draft is incomplete</h2><ul>' + issues.map(x => '<li>' + e(x) + '</li>').join('') + '</ul></article>' : currentView === 'mailing' ? mailingHTML() : noticeHTML(active());
  });
  window.addEventListener('afterprint', () => { $('print-root').innerHTML = ''; });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  options(); fillEditor(); setView('notices');
})();
