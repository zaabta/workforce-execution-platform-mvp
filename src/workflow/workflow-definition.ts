import { DailyPlanStatus } from '@prisma/client';
import { DAILY_PLAN_PERMISSIONS } from '../daily-plans/constants/daily-plan-permissions.constants';

export type WorkflowAction =
  | 'ASSIGN'
  | 'START'
  | 'SUBMIT'
  | 'RESUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'COMPLETE';

export interface TransitionDefinition {
  action: WorkflowAction;
  to: DailyPlanStatus;
  /** Permission code required to perform this transition (SDD 8.2 "Required Permission"). null = system-only. */
  requiredPermission: string | null;
  /** Named business validators that must all pass before the transition is allowed (SDD 8.4). */
  validators: string[];
  /** Side-effect hooks fired after a successful transition (SDD 8.4 "actions"). */
  sideEffects: string[];
}

/**
 * Fixed MVP state machine, transcribed exactly from SDD Section 8.3
 * (Transition Rules table) and Section 8.4 (MVP Workflow Design JSON).
 *
 * NOTE: "Resubmitted" in Figure 4 is NOT a persisted status per the SDD's
 * own note under 8.3 -- resubmission moves a Rejected record directly back
 * to Submitted. That is reflected here as REJECTED -> SUBMITTED.
 */
export const WORKFLOW_DEFINITION: Record<
  DailyPlanStatus,
  TransitionDefinition[]
> = {
  DRAFT: [
    {
      action: 'ASSIGN',
      to: DailyPlanStatus.ASSIGNED,
      requiredPermission: DAILY_PLAN_PERMISSIONS.ASSIGN,
      validators: [
        'ProjectSelected',
        'LocationSelected',
        'QuantityEntered',
        'HeadOfMasterAssigned',
      ],
      sideEffects: ['NotifyHeadOfMasterAssigned'],
    },
  ],
  ASSIGNED: [
    {
      action: 'START',
      to: DailyPlanStatus.IN_PROGRESS,
      requiredPermission: DAILY_PLAN_PERMISSIONS.START_EXECUTION,
      validators: ['CrewCreated', 'WorkersAssigned'],
      sideEffects: [],
    },
  ],
  IN_PROGRESS: [
    {
      action: 'SUBMIT',
      to: DailyPlanStatus.SUBMITTED,
      requiredPermission: DAILY_PLAN_PERMISSIONS.SUBMIT,
      validators: [
        'ActualQuantityEntered',
        'ActualManDayEntered',
        'CommentMandatoryIfIncomplete',
      ],
      sideEffects: ['NotifySiteChief', 'CreateAuditRecord'],
    },
  ],
  SUBMITTED: [
    {
      action: 'APPROVE',
      to: DailyPlanStatus.APPROVED_BY_SITE_CHIEF,
      requiredPermission: DAILY_PLAN_PERMISSIONS.APPROVE_SITE_CHIEF,
      validators: ['SubmissionCompleted'],
      sideEffects: ['NotifyProjectManager', 'CreateAuditRecord'],
    },
    {
      action: 'REJECT',
      to: DailyPlanStatus.REJECTED,
      requiredPermission: DAILY_PLAN_PERMISSIONS.REJECT,
      validators: ['RejectionReasonProvided'],
      sideEffects: ['NotifyHeadOfMasterRejected', 'CreateAuditRecord'],
    },
  ],
  REJECTED: [
    {
      action: 'RESUBMIT',
      to: DailyPlanStatus.SUBMITTED,
      requiredPermission: DAILY_PLAN_PERMISSIONS.RESUBMIT,
      validators: ['RejectionCommentProvided'],
      sideEffects: ['NotifySiteChief', 'CreateAuditRecord'],
    },
  ],
  APPROVED_BY_SITE_CHIEF: [
    {
      action: 'APPROVE',
      to: DailyPlanStatus.APPROVED_BY_PROJECT_MANAGER,
      requiredPermission: DAILY_PLAN_PERMISSIONS.APPROVE_PROJECT_MANAGER,
      validators: ['SiteChiefApprovalCompleted'],
      sideEffects: ['CreateAuditRecord'],
    },
    {
      action: 'REJECT',
      to: DailyPlanStatus.REJECTED,
      requiredPermission: DAILY_PLAN_PERMISSIONS.REJECT,
      validators: ['RejectionReasonProvided'],
      sideEffects: ['NotifyHeadOfMasterRejected', 'CreateAuditRecord'],
    },
  ],
  APPROVED_BY_PROJECT_MANAGER: [
    {
      action: 'COMPLETE',
      to: DailyPlanStatus.COMPLETED,
      requiredPermission: DAILY_PLAN_PERMISSIONS.COMPLETE,
      validators: [],
      sideEffects: ['CreateAuditRecord'],
    },
  ],
  COMPLETED: [],
};
