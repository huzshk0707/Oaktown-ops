(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Oaktown = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function cents(value) {
    const text = String(value).trim();
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(text)) return null;
    const [whole, fraction = ''] = text.split('.');
    return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  }
  function money(value) {
    return value === null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);
  }
  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T12:00:00Z');
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }
  function displayDate(value) {
    if (!validDate(value)) return 'Date needed';
    const [year, month, day] = value.split('-');
    return month + '/' + day + '/' + year;
  }
  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
  function total(notice) {
    let sum = 0;
    for (const row of notice.charges) {
      const amount = cents(row.amount), due = cents(row.due);
      if (amount === null || due === null || due > amount) return null;
      sum += due;
    }
    return sum;
  }
  function errors(notice, sender) {
    const result = [];
    if (!sender.name.trim()) result.push('Add a sender name.');
    if (!sender.address.trim()) result.push('Add a sender return address.');
    if (!notice.recipient.trim()) result.push('Add recipient names.');
    if (!notice.address.trim()) result.push('Add the recipient address.');
    if (!validDate(notice.date)) result.push('Choose a valid notice date.');
    if (!notice.title.trim()) result.push('Add a notice heading.');
    if (!notice.body.trim()) result.push('Add notice wording.');
    if (!notice.signoff.trim()) result.push('Add a sign-off.');
    if (!notice.charges.length) result.push('Add at least one statement line.');
    notice.charges.forEach((row, i) => {
      if (!validDate(row.date)) result.push('Line ' + (i + 1) + ': choose a valid due date.');
      if (!row.category.trim() || !row.description.trim()) result.push('Line ' + (i + 1) + ': add a category and description.');
      const amount = cents(row.amount), due = cents(row.due);
      if (amount === null || due === null) result.push('Line ' + (i + 1) + ': enter non-negative amounts with up to two decimal places.');
      else if (due > amount) result.push('Line ' + (i + 1) + ': amount due cannot exceed the charge amount.');
    });
    return result;
  }
  function rowStatus(row) {
    const amount = cents(row.amount), due = cents(row.due);
    if (amount === null || due === null || due > amount) return 'CHECK';
    return due === 0 ? 'PAID' : due < amount ? 'PARTIAL' : 'DUE';
  }
  function blankNotice(id, date = today()) {
    return {
      id, recipient: '', address: '', occupants: true, date,
      title: 'Payment reminder', body: 'Our records show an outstanding balance of {{total}}. Please review the statement below and contact our office if you have questions or believe a payment is missing.',
      signoff: 'Oaktown Ops team',
      charges: [{ date, category: 'RENT', description: 'Monthly rent', amount: '', due: '' }],
      selected: false, tracking: '',
      filing: { confirmed: false, confirmedDate: '', reference: '', courtDate: '', courtTime: '', timezone: '', reminderDate: '', owner: '', notes: '' }
    };
  }
  function demoState() {
    const names = ['Alex Example & Sam Example', 'Jordan Sample', 'Taylor Demo'];
    const addresses = ['100 Sample Lane\nExample City, KY 00000', '200 Example Court\nExample City, KY 00000', '300 Demo Avenue\nExample City, KY 00000'];
    const amounts = ['1200.00', '950.00', '1100.00'];
    const notices = names.map((name, i) => {
      const n = blankNotice('notice-' + (i + 1));
      n.recipient = name; n.address = addresses[i]; n.selected = true;
      n.charges[0].amount = amounts[i]; n.charges[0].due = amounts[i];
      return n;
    });
    notices[0].charges.push({ date: today(), category: 'LATE FEE', description: 'Example late charge', amount: '50.00', due: '50.00' });
    return { sender: { name: 'Oaktown Ops · example sender', address: 'PO Box 000\nExample City, KY 00000' }, notices };
  }
  function mailingRows(notices) {
    return notices.filter(n => n.selected).map((n, i) => ({
      number: i + 1, id: n.id, recipient: n.recipient + (n.occupants ? ' & All Occupants' : ''),
      address: n.address, tracking: n.tracking
    }));
  }
  function filingErrors(filing) {
    const list = [];
    if (!filing.confirmed) return list;
    if (!validDate(filing.confirmedDate)) list.push('Add the date of the attorney filing confirmation.');
    if (!filing.reference.trim()) list.push('Record the attorney email reference.');
    if (filing.courtDate && !validDate(filing.courtDate)) list.push('Check the court date.');
    if (filing.courtTime && (!/^\d{2}:\d{2}$/.test(filing.courtTime) || !filing.courtDate || !filing.timezone.trim())) list.push('A court time needs a court date and timezone.');
    if (filing.reminderDate && !validDate(filing.reminderDate)) list.push('Check the reminder date.');
    if (validDate(filing.reminderDate) && validDate(filing.courtDate) && filing.reminderDate > filing.courtDate) list.push('The reminder is after the court date; review the plan.');
    return list;
  }
  return { cents, money, validDate, displayDate, today, escape, total, errors, rowStatus, blankNotice, demoState, mailingRows, filingErrors };
});
