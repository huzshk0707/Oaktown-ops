'use strict';

const { test, expect } = require('@playwright/test');
const { morningMock, signIn, ORIGIN } = require('./morning-fixtures.cjs');
const Intake = require('../task-intake-model.js');

const WORK_DATE = '2026-11-20';
const START = '2026-11-20T19:00:00+05:30';
const SENT_FOR_REVIEW = '2026-11-20T20:15:00+05:30';
const REVISION_REQUEST = '2026-11-20T22:30:00+05:30';
const SENT_TO_ATTORNEY = '2026-11-21T00:10:00+05:30';
const GARY_PROGRESS = '2026-11-21T03:45:00+05:30';
const END = '2026-11-21T05:00:00+05:30';
const SESSION = '33333333-3333-4333-8333-333333333333';

const STATEMENT = 'Tenant statement';
const HOURS = 'Gary’s Friday hours';
const PREPARED = 'Prepared the tenant statement and sent it to Leslie for review.';
const DELIVERED = 'Revised the statement and sent the updated copy to the attorney.';
const CHECKED = 'Checked Gary’s hours for Monday through Wednesday.';
const RESUME = 'Resume Gary’s hours at Thursday.';

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

async function friday(page) {
  const state = await morningMock(page, 2);
  const [statement, hours] = state.tasks;
  const due = { date: WORK_DATE };
  Object.assign(statement, {
    task_title: STATEMENT, task_code: null, workflow_key: 'general', property_id: null,
    status: 'pending', priority: 'urgent',
    intake_details: { due, next_action: 'Prepare the statement in TurboTenant.' },
  });
  Object.assign(hours, {
    task_title: HOURS, task_code: null, status: 'pending',
    intake_details: { due, next_action: 'Check the weekly entries against the timesheet.' },
  });
  return { state, statement, hours };
}

function update(task, reference, source, recordedAt, changes, { clear = [], work } = {}) {
  return {
    schema_version: Intake.VERSION,
    batch_ref: 'friday-' + reference,
    work_date: WORK_DATE,
    timezone: Intake.ZONE,
    sources: [{
      source_ref: 'source-' + reference, kind: 'text', label: 'Fictional Friday update',
      occurred_at: recordedAt, evidence_excerpt: source,
    }],
    proposals: [{
      proposal_ref: reference, operation: 'update', task_id: task.id,
      expected_updated_at: task.updated_at, match_reason: 'Verified fictional task ID',
      context: { workflow_key: 'general', context_label: 'General operations' },
      changes, suggestions: {}, source_refs: ['source-' + reference], proposed_clear_fields: clear,
    }],
    activities: work ? [{
      activity_ref: 'work-' + reference, task_id: task.id, work_date: WORK_DATE,
      summary: work, completed_by: 'Huzy', duration_basis: 'not_provided', minutes: null, source_refs: ['source-' + reference],
    }] : [],
    questions: [],
  };
}

// Implements only the reviewed update and read-back paths used by this fictional rehearsal.
function intakeFixture(state) {
  let opened = false;
  const items = [], receipts = [], workEvents = [];
  state.actionHandler = (request, reply) => {
    if (!request.url().endsWith('/rpc/ops_task_intake')) return reply({ message: 'Outside rehearsal scope' }, 403);
    const { p_action: action, p_session: session, p_payload: payload } = request.postDataJSON();
    if (action === 'sessions') return reply(opened ? [{ id: SESSION, created_at: START }] : []);
    if (action === 'new') {
      opened = true;
      return reply({ session_id: SESSION });
    }
    if (!opened || session !== SESSION) return reply({ message: 'Unknown fictional session' }, 403);
    if (action === 'state') return reply({ tasks: state.tasks, items, receipts });
    if (action !== 'save' || payload.reviewed !== true) return reply({ message: 'Explicit review required' }, 403);

    const raw = payload.export;
    const preview = Intake.preview(raw, { tasks: state.tasks, items }, payload);
    const [group] = preview.groups;
    const task = state.tasks.find(row => row.id === group?.task_id);
    if (preview.warnings.length || preview.groups.length !== 1 ||
        !task || payload.expected_versions[task.id] !== task.updated_at) {
      return reply({ message: 'Fictional update needs review' }, 409);
    }
    const savedAt = new Date(raw.sources[0].occurred_at).toISOString();
    const { task_title, status, priority, assigned_label, ...details } = group.after;
    if(raw.proposals.length) Object.assign(task, {
      task_title, status, priority, assigned_label, intake_details: details,
      updated_at: savedAt, completed_at: status === 'completed' ? savedAt : null,
    });
    items.push(...raw.sources.map(source => ({ kind: 'source', ref: source.source_ref, payload: source })));
    items.push(...raw.proposals.map(proposal => ({
      kind: 'proposal', ref: proposal.proposal_ref, payload: proposal, task_id: task.id,
    })));
    for (const activity of raw.activities) {
      items.push({ kind: 'activity', ref: activity.activity_ref, payload: activity, task_id: task.id });
      workEvents.push(workEvent(activity.activity_ref, task.id, savedAt, activity));
    }
    const receipt = {
      schema_version: 'oaktown.task-receipt.v1', session_id: SESSION, batch_ref: raw.batch_ref,
      proposals: raw.proposals.map(p => ({ proposal_ref: p.proposal_ref, task_id: task.id, result: 'imported' })),
      activities: raw.activities.map(a => ({ activity_ref: a.activity_ref, task_id: task.id, result: 'imported' })),
    };
    receipts.unshift(receipt);
    return reply(receipt);
  };
  return { receipts, workEvents };
}

function workEvent(id, taskId, at, activity) {
  return {
    id, entity_id: taskId, event_type: 'task_work_recorded', occurred_at: new Date(at).toISOString(),
    event_metadata: { activity },
  };
}

async function reportFixture(page, events) {
  await page.route('**/rest/v1/ops_events**', async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get('event_type') !== 'eq.task_work_recorded') return route.fallback();
    const workDate = url.searchParams.get('event_metadata->activity->>work_date');
    return route.fulfill({
      json: events.filter(e => 'eq.' + e.event_metadata.activity.work_date === workDate),
      headers: { 'access-control-allow-origin': '*' },
    });
  });
}

async function addToReview(page, proposal) {
  await page.locator('#task-json').fill(JSON.stringify(proposal));
  await page.locator('#task-preview').click();
}

async function approveUpdate(page, proposal, { clearWaiting = false } = {}) {
  await addToReview(page, proposal);
  await expect(page.locator('#task-save')).toBeDisabled();
  if (clearWaiting) await page.getByLabel(/Approve clearing Waiting on/).check();
  await page.locator('#task-confirm').check();
  await expect(page.locator('#task-save')).toBeEnabled();
  await page.locator('#task-save').click();
  await expect(page.locator('#task-status')).toContainText('Saved to Ops');
}

test('Friday routes one statement through Leslie’s review, then resumes Gary from saved work', async ({ page }) => {
  await page.clock.setFixedTime(new Date(START));
  const { state, statement, hours } = await friday(page);
  const { receipts, workEvents } = intakeFixture(state);
  await reportFixture(page, workEvents);
  await page.goto(ORIGIN + '/#/morning');
  await signIn(page);
  await expect(page.locator('#daily-priorities .daily-task-title')).toHaveText([STATEMENT, HOURS]);
  await expect(page.locator('#daily-pickup')).toContainText(STATEMENT);
  await page.locator('#daily-start').click();
  await expect(page.locator('.focus-card[data-offset="0"]')).toHaveAttribute('data-task-id', statement.id);

  await page.locator('#focus-return-morning').click();
  await page.locator('#daily-counts').click();
  await page.locator('#task-tab-intake').click();
  await page.locator('#task-new-session').click();
  await expect(page.locator('#task-status')).toContainText('New intake session created');
  await page.clock.setFixedTime(new Date(SENT_FOR_REVIEW));
  await approveUpdate(page, update(statement, 'sent-for-review', PREPARED, SENT_FOR_REVIEW, {
    status: 'waiting', waiting_on: 'Leslie', next_action: 'Review Leslie’s response when it arrives.',
  }, { work: PREPARED }));
  await page.locator('[data-workspace="morning"]').click();
  await expect(page.locator('#daily-followups')).toContainText('Leslie');
  await expect(page.locator('#daily-followups')).toContainText(STATEMENT);
  await expect(page.locator('#daily-pickup')).toContainText(HOURS);

  await page.locator('#daily-counts').click();
  await page.locator('#task-tab-intake').click();
  await page.clock.setFixedTime(new Date(REVISION_REQUEST));
  await approveUpdate(page, update(statement, 'revision-request', 'Leslie requested a correction and delivery to the attorney.', REVISION_REQUEST, {
    status: 'in_progress', next_action: 'Revise the statement and deliver the updated copy.',
  }, { clear: ['waiting_on'] }), { clearWaiting: true });
  await page.locator('[data-workspace="morning"]').click();
  await expect(page.locator('#daily-pickup')).toContainText('Revise the statement and deliver the updated copy.');
  await expect(page.locator('#daily-followups')).not.toContainText('Leslie');

  await page.locator('#daily-counts').click();
  await page.locator('#task-tab-intake').click();
  await page.clock.setFixedTime(new Date(SENT_TO_ATTORNEY));
  const delivered = update(statement, 'sent-to-attorney', DELIVERED, SENT_TO_ATTORNEY, {
    status: 'completed', completion_summary: DELIVERED, next_action: 'Delivery complete.',
  }, { work: DELIVERED });
  await approveUpdate(page, delivered);
  await addToReview(page, delivered);
  await expect(page.locator('#task-review')).toContainText('2 previously imported item(s)');
  await expect(page.locator('#task-save')).toBeDisabled();
  await page.clock.setFixedTime(new Date(GARY_PROGRESS));
  await approveUpdate(page, update(hours, 'hours-progress', CHECKED, GARY_PROGRESS, {
    status: 'in_progress', next_action: RESUME,
  }));
  await page.locator('#work-entry > summary').click();
  await page.locator('#work-task').selectOption(hours.id);
  await page.getByLabel('Performed by').fill('Huzy');
  await page.getByLabel('What did they do?').fill(CHECKED);
  await page.getByLabel('Supporting evidence').fill('Reviewed the fictional Monday–Wednesday timesheet.');
  await page.getByRole('button',{name:'Review work',exact:true}).click();
  await expect(page.locator('#task-review')).toContainText(WORK_DATE+' · Huzy · '+CHECKED);
  await page.locator('#task-confirm').check();
  await page.locator('#task-save').click();
  await expect(page.locator('#task-status')).toContainText('Saved to Ops');
  await expect(page.locator('#task-history')).toContainText(WORK_DATE+' · Huzy · '+CHECKED);
  expect(hours.status).toBe('in_progress');

  expect(state.tasks).toHaveLength(2);
  expect(statement.status).toBe('completed');
  expect(receipts.filter(r => r.proposals[0]?.task_id === statement.id)).toHaveLength(3);
  expect(workEvents.map(event => event.event_metadata.activity.work_date)).toEqual(Array(3).fill(WORK_DATE));

  await page.locator('[data-workspace="morning"]').click();
  await page.reload();
  await expect(page.locator('#daily-pickup')).toContainText(RESUME);
  await expect(page.locator('#daily-pickup')).toContainText('In progress');
  await expect(page.locator('#daily-priorities')).not.toContainText(STATEMENT);
  await page.locator('#morning-command-exit').click();
  await page.locator('#eod-generate').click();
  for(const action of [PREPARED, DELIVERED, CHECKED])await expect(page.locator('#eod-report')).toContainText(action);
});

test('Friday EOD keeps both attributed statement actions and the next-shift priority across local midnight', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(new Date(END));
  const { state, statement, hours } = await friday(page);
  statement.status = 'completed';
  statement.completed_at = new Date(SENT_TO_ATTORNEY).toISOString();
  statement.intake_details.eod = { work_date: WORK_DATE, completed_by: 'Huzy', summary: DELIVERED };
  hours.status = 'in_progress';
  hours.intake_details.next_action = RESUME;

  // These represent previously attributed records. The first rehearsal exercises reviewed capture and readback.
  const activity = (summary, completedBy) => ({
    work_date: WORK_DATE, summary, completed_by: completedBy, duration_basis: 'not_provided', minutes: null,
  });
  await reportFixture(page, [
    workEvent('prepared', statement.id, SENT_FOR_REVIEW, activity(PREPARED, 'Huzy')),
    workEvent('delivered', statement.id, SENT_TO_ATTORNEY, activity(DELIVERED, 'Huzy')),
    workEvent('checked', hours.id, GARY_PROGRESS, activity(CHECKED, 'Huzy')),
    workEvent('leslie', statement.id, REVISION_REQUEST, activity('Leslie inspected a property.', 'Leslie')),
  ]);
  await page.goto(ORIGIN + '/#/today');
  await signIn(page);
  await expect(page.locator('#eod-date')).toHaveValue(WORK_DATE);
  await page.locator('#eod-priorities').fill(RESUME);
  await page.locator('#eod-generate').click();
  const report = page.locator('#eod-report');
  await expect(report).toContainText('Daily Task Status / Update – Nov 20, 2026');
  await expect(report).toContainText(['- ' + PREPARED, '- ' + DELIVERED, '- ' + CHECKED].join('\n'), { useInnerText: true });
  expect((await report.textContent()).split(DELIVERED)).toHaveLength(2);
  await expect(report).toContainText('Next Day Priorities');
  await expect(report).toContainText(RESUME);
  await expect(report).not.toContainText('Leslie inspected');
  if (process.env.OAKTOWN_UI_SCREENSHOTS === '1') {
    await page.getByRole('region', { name: 'EOD work report' }).screenshot({ path: testInfo.outputPath('eod-friday.png') });
  }
  await page.locator('#eod-priorities').fill('Confirm the next timesheet entry.');
  await expect(report).toBeHidden();
  await expect(page.locator('#eod-copy')).toBeDisabled();
  await page.locator('#eod-date').fill('2026-11-21');
  await expect(page.locator('#eod-priorities')).toHaveValue('');
  await page.locator('#eod-priorities').fill('Draft priority for another day.');
  await page.evaluate(() => window.OpsCloud.signOut());
  await expect(page.locator('#eod-priorities')).toHaveValue('');
  await expect(page.locator('#eod-generate')).toBeDisabled();
  expect(state.writes.filter(write => write.path === '/rest/v1/rpc/ops_task_intake')).toEqual([]);
});
