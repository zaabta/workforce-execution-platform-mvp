import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DailyPlanStatus } from '@prisma/client';
import {
  TransitionDefinition,
  WORKFLOW_DEFINITION,
  WorkflowAction,
} from './workflow-definition';

export interface TransitionCheckInput {
  currentStatus: DailyPlanStatus;
  /** Candidate actions the calling endpoint is willing to perform (e.g. submit endpoint offers ['SUBMIT','RESUBMIT']). */
  candidateActions: WorkflowAction[];
  actorPermissions: string[];
  /** Results of the named business validators for this transition, computed by the caller from current data. */
  validatorResults: Record<string, boolean>;
}

/**
 * Domain layer: the fixed Daily Plan approval workflow (SDD Section 8).
 * Contains ONLY business rules and invariants -- no persistence or I/O.
 * The Application layer (DailyPlansService) computes validatorResults from
 * the database and then asks this service whether the transition is legal.
 */
@Injectable()
export class WorkflowService {
  /** Resolves which transition definition (if any) applies for the current status + candidate actions. */
  resolveTransition(
    currentStatus: DailyPlanStatus,
    candidateActions: WorkflowAction[],
  ): TransitionDefinition {
    const transitions = WORKFLOW_DEFINITION[currentStatus] ?? [];
    const match = transitions.find((t) => candidateActions.includes(t.action));
    if (!match) {
      throw new ConflictException(
        `No valid transition for status '${currentStatus}' using action(s): ${candidateActions.join(', ')}.`,
      );
    }
    return match;
  }

  /** Validates permission + business validators for a resolved transition. Throws on failure. */
  assertTransitionAllowed(input: TransitionCheckInput): TransitionDefinition {
    const transition = this.resolveTransition(
      input.currentStatus,
      input.candidateActions,
    );

    if (
      transition.requiredPermission &&
      !input.actorPermissions.includes(transition.requiredPermission)
    ) {
      throw new ForbiddenException(
        `You do not have permission to perform this action. Required: ${transition.requiredPermission}.`,
      );
    }

    const failedValidators = transition.validators.filter(
      (v) => !input.validatorResults[v],
    );
    if (failedValidators.length > 0) {
      throw new BadRequestException(
        `Cannot transition Daily Plan: failed validation(s): ${failedValidators.join(', ')}.`,
      );
    }

    return transition;
  }

  /**
   * Separation of Duties (SDD 12.3): a user cannot approve or reject a Daily
   * Plan they themselves submitted, and the Project Manager cannot be the
   * same person who approved as Site Chief for the same record.
   */
  assertNotSelfApproval(
    actorUserId: string,
    relatedActorIds: Array<string | null | undefined>,
  ): void {
    if (relatedActorIds.some((id) => id && id === actorUserId)) {
      throw new ConflictException(
        'You cannot approve or reject a Daily Plan you submitted or previously approved.',
      );
    }
  }

  getAllowedNextStatuses(currentStatus: DailyPlanStatus): DailyPlanStatus[] {
    return (WORKFLOW_DEFINITION[currentStatus] ?? []).map((t) => t.to);
  }
}
