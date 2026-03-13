/**
 * T-020: Event State Machine
 * Valid flow: candidate → approved_1 → approved_2 → published
 *                     ↘ rejected | deferred (from any stage)
 */

export const STATUSES = {
  CANDIDATE: 'candidate',
  APPROVED_1: 'approved_1',
  APPROVED_2: 'approved_2',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  DEFERRED: 'deferred',
};

export const ACTIONS = {
  APPROVE: 'approve',
  REJECT: 'reject',
  DEFER: 'defer',
  HOLD: 'hold',
  PUBLISH: 'publish',
  ROLLBACK: 'rollback',
};

// transitions[status][action] = newStatus
const TRANSITIONS = {
  [STATUSES.CANDIDATE]: {
    [ACTIONS.APPROVE]: STATUSES.APPROVED_1,
    [ACTIONS.REJECT]:  STATUSES.REJECTED,
    [ACTIONS.DEFER]:   STATUSES.DEFERRED,
    [ACTIONS.HOLD]:    STATUSES.CANDIDATE,
  },
  [STATUSES.APPROVED_1]: {
    [ACTIONS.APPROVE]:   STATUSES.APPROVED_2,
    [ACTIONS.REJECT]:    STATUSES.REJECTED,
    [ACTIONS.DEFER]:     STATUSES.DEFERRED,
    [ACTIONS.ROLLBACK]:  STATUSES.CANDIDATE,
    [ACTIONS.HOLD]:      STATUSES.APPROVED_1,
  },
  [STATUSES.APPROVED_2]: {
    [ACTIONS.PUBLISH]:   STATUSES.PUBLISHED,
    [ACTIONS.REJECT]:    STATUSES.REJECTED,
    [ACTIONS.DEFER]:     STATUSES.DEFERRED,
    [ACTIONS.ROLLBACK]:  STATUSES.APPROVED_1,
    [ACTIONS.HOLD]:      STATUSES.APPROVED_2,
  },
  [STATUSES.PUBLISHED]: {
    [ACTIONS.ROLLBACK]: STATUSES.APPROVED_2,
  },
  [STATUSES.REJECTED]: {
    [ACTIONS.ROLLBACK]: STATUSES.CANDIDATE,
  },
  [STATUSES.DEFERRED]: {
    [ACTIONS.ROLLBACK]: STATUSES.CANDIDATE,
    [ACTIONS.APPROVE]:  STATUSES.APPROVED_1,
  },
};

/**
 * canTransition(event, action) → boolean
 */
export function canTransition(event, action) {
  const status = event?.status ?? event;
  const validActions = TRANSITIONS[status];
  if (!validActions) return false;
  return action in validActions;
}

/**
 * transition(event, action) → new status string
 * Throws if the transition is invalid.
 */
export function transition(event, action) {
  const status = event?.status ?? event;
  if (!canTransition(status, action)) {
    throw new Error(
      `Invalid transition: ${status} + ${action}`
    );
  }
  return TRANSITIONS[status][action];
}

export default { STATUSES, ACTIONS, canTransition, transition };
