import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RESET_STATUS,
  RESET_ERROR_FALLBACK,
  RESET_SESSION_ERROR,
  canResetWorkspace,
  createResetState,
  normalizeResetError,
  resetWorkspaceReducer
} from '../../src/utils/workspaceReset.js';

function run(events, initial = createResetState()) {
  return events.reduce((state, event) => resetWorkspaceReducer(state, event), initial);
}

test('reset is hidden from logged-out students', () => {
  assert.equal(canResetWorkspace({ isAdminLoggedIn: false, hasAdminToken: false }), false);
  assert.equal(canResetWorkspace({}), false);
  assert.equal(canResetWorkspace(), false);
});

test('reset is unavailable when the admin session has no token', () => {
  assert.equal(canResetWorkspace({ isAdminLoggedIn: true, hasAdminToken: false }), false);
});

test('reset is available to an authenticated administrator', () => {
  assert.equal(canResetWorkspace({ isAdminLoggedIn: true, hasAdminToken: true }), true);
});

test('a reset cannot start without confirmation', () => {
  const directConfirm = resetWorkspaceReducer(createResetState(), { type: 'CONFIRM' });
  assert.equal(directConfirm.status, RESET_STATUS.IDLE);
  assert.equal(directConfirm.error, null);
});

test('requesting a reset opens confirmation instead of resetting immediately', () => {
  const state = resetWorkspaceReducer(createResetState(), { type: 'REQUEST_CONFIRMATION' });
  assert.deepEqual(state, { status: RESET_STATUS.CONFIRMING, error: null });
});

test('cancelling confirmation returns to idle without resetting', () => {
  const state = run([
    { type: 'REQUEST_CONFIRMATION' },
    { type: 'CANCEL' }
  ]);
  assert.deepEqual(state, { status: RESET_STATUS.IDLE, error: null });
});

test('confirming shows a loading state while the reset runs', () => {
  const state = run([
    { type: 'REQUEST_CONFIRMATION' },
    { type: 'CONFIRM' }
  ]);
  assert.deepEqual(state, { status: RESET_STATUS.RESETTING, error: null });
});

test('a completed reset reports success', () => {
  const state = run([
    { type: 'REQUEST_CONFIRMATION' },
    { type: 'CONFIRM' },
    { type: 'SUCCESS' }
  ]);
  assert.deepEqual(state, { status: RESET_STATUS.SUCCESS, error: null });
});

test('a failed reset surfaces an honest error and never reports success', () => {
  const state = run([
    { type: 'REQUEST_CONFIRMATION' },
    { type: 'CONFIRM' },
    { type: 'FAILURE', error: new Error('Failed to reset demo workspace.') }
  ]);
  assert.equal(state.status, RESET_STATUS.ERROR);
  assert.equal(state.error, 'Failed to reset demo workspace.');
});

test('duplicate confirmation while resetting is ignored', () => {
  const resetting = run([
    { type: 'REQUEST_CONFIRMATION' },
    { type: 'CONFIRM' }
  ]);
  const afterDuplicate = resetWorkspaceReducer(resetting, { type: 'CONFIRM' });
  assert.deepEqual(afterDuplicate, resetting);

  const afterDismiss = resetWorkspaceReducer(resetting, { type: 'CANCEL' });
  assert.deepEqual(afterDismiss, resetting);
});

test('expired or unauthorized admin sessions produce a session error', () => {
  assert.equal(
    normalizeResetError('Invalid or expired admin session token.'),
    RESET_SESSION_ERROR
  );
  assert.equal(
    normalizeResetError('Unauthorized: Valid administrator authentication required.'),
    RESET_SESSION_ERROR
  );
  assert.equal(normalizeResetError('Request failed with status 401'), RESET_SESSION_ERROR);
});

test('unknown failures fall back to a clear message', () => {
  assert.equal(normalizeResetError(null), RESET_ERROR_FALLBACK);
  assert.equal(normalizeResetError(''), RESET_ERROR_FALLBACK);
  assert.equal(normalizeResetError(undefined), RESET_ERROR_FALLBACK);
  assert.equal(normalizeResetError(new Error('   ')), RESET_ERROR_FALLBACK);
});
