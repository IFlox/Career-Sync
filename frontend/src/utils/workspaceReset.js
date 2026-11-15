export const RESET_STATUS = {
  IDLE: 'idle',
  CONFIRMING: 'confirming',
  RESETTING: 'resetting',
  SUCCESS: 'success',
  ERROR: 'error'
};

export const RESET_ERROR_FALLBACK =
  'The workspace could not be reset. The request did not complete.';

const SESSION_ERROR_PATTERN =
  /(401|403|unauthori[sz]ed|forbidden|expired|invalid\s+.*token)/i;

export const RESET_SESSION_ERROR =
  'Your administrator session has expired. Sign in again, then retry the reset.';

/**
 * The reset action is destructive and requires administrator authentication.
 * It is only offered when the admin session is active and a token is present.
 */
export function canResetWorkspace({ isAdminLoggedIn = false, hasAdminToken = false } = {}) {
  return Boolean(isAdminLoggedIn) && Boolean(hasAdminToken);
}

export function normalizeResetError(error) {
  const rawMessage = typeof error === 'string' ? error : error?.message;
  const message = typeof rawMessage === 'string' ? rawMessage.trim() : '';

  if (!message) return RESET_ERROR_FALLBACK;
  if (SESSION_ERROR_PATTERN.test(message)) return RESET_SESSION_ERROR;
  return message;
}

export function createResetState() {
  return { status: RESET_STATUS.IDLE, error: null };
}

/**
 * Explicit state machine for the destructive reset action:
 * idle -> confirming -> resetting -> success | error
 * Cancel returns to idle, and a reset can never start without confirmation.
 */
export function resetWorkspaceReducer(state, event = {}) {
  const current = state && state.status ? state : createResetState();

  switch (event.type) {
    case 'REQUEST_CONFIRMATION':
      return current.status === RESET_STATUS.RESETTING
        ? current
        : { status: RESET_STATUS.CONFIRMING, error: null };

    case 'CANCEL':
    case 'DISMISS':
      return current.status === RESET_STATUS.RESETTING
        ? current
        : createResetState();

    case 'CONFIRM':
      return current.status === RESET_STATUS.CONFIRMING
        ? { status: RESET_STATUS.RESETTING, error: null }
        : current;

    case 'SUCCESS':
      return { status: RESET_STATUS.SUCCESS, error: null };

    case 'FAILURE':
      return {
        status: RESET_STATUS.ERROR,
        error: normalizeResetError(event.error)
      };

    default:
      return current;
  }
}
