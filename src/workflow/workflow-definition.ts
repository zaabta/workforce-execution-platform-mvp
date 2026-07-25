import { DailyPlanStatus } from '@prisma/client';

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
      requiredPermission: 'daily_plan.assign',
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
      requiredPermission: 'daily_plan.start_execution',
      validators: ['CrewCreated', 'WorkersAssigned'],
      sideEffects: [],
    },
  ],
  IN_PROGRESS: [
    {
      action: 'SUBMIT',
      to: DailyPlanStatus.SUBMITTED,
      requiredPermission: 'daily_plan.submit',
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
      requiredPermission: 'daily_plan.approve.site_chief',
      validators: ['SubmissionCompleted'],
      sideEffects: ['NotifyProjectManager', 'CreateAuditRecord'],
    },
    {
      action: 'REJECT',
      to: DailyPlanStatus.REJECTED,
      requiredPermission: 'daily_plan.reject',
      validators: ['RejectionReasonProvided'],
      sideEffects: ['NotifyHeadOfMasterRejected', 'CreateAuditRecord'],
    },
  ],
  REJECTED: [
    {
      action: 'RESUBMIT',
      to: DailyPlanStatus.SUBMITTED,
      requiredPermission: 'daily_plan.resubmit',
      validators: ['RejectionCommentProvided'],
      sideEffects: ['NotifySiteChief', 'CreateAuditRecord'],
    },
  ],
  APPROVED_BY_SITE_CHIEF: [
    {
      action: 'APPROVE',
      to: DailyPlanStatus.APPROVED_BY_PROJECT_MANAGER,
      requiredPermission: 'daily_plan.approve.project_manager',
      validators: ['SiteChiefApprovalCompleted'],
      sideEffects: ['CreateAuditRecord'],
    },
    {
      action: 'REJECT',
      to: DailyPlanStatus.REJECTED,
      requiredPermission: 'daily_plan.reject',
      validators: ['RejectionReasonProvided'],
      sideEffects: ['NotifyHeadOfMasterRejected', 'CreateAuditRecord'],
    },
  ],
  APPROVED_BY_PROJECT_MANAGER: [
    {
      action: 'COMPLETE',
      to: DailyPlanStatus.COMPLETED,
      requiredPermission: 'daily_plan.complete',
      validators: [],
      sideEffects: ['CreateAuditRecord'],
    },
  ],
  COMPLETED: [],
};
