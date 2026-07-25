import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DailyPlanStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { WorkflowService } from '../workflow/workflow.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDailyPlanDto } from './dto/create-daily-plan.dto';
import { UpdateDailyPlanDto } from './dto/update-daily-plan.dto';
import { AssignDailyPlanDto } from './dto/assign-daily-plan.dto';
import { SubmitDailyPlanDto } from './dto/submit-daily-plan.dto';
import { RejectDailyPlanDto } from './dto/reject-daily-plan.dto';
import { QueryDailyPlansDto } from './dto/query-daily-plans.dto';

interface Actor {
  userId: string;
  email: string;
}

@Injectable()
export class DailyPlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly workflow: WorkflowService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // --------------------------------------------------------------------
  // Shared helpers
  // --------------------------------------------------------------------

  private async loadOrFail(id: string) {
    const plan = await this.prisma.dailyPlan.findUnique({ where: { id } });
    if (!plan || plan.deletedAt) {
      throw new NotFoundException('Daily Plan not found.');
    }
    return plan;
  }

  private async assertScope(
    actor: Actor,
    plan: { projectId: string; regionId: string; locationId: string },
  ) {
    const allowed = await this.authorization.hasScope(actor.userId, {
      projectId: plan.projectId,
      regionId: plan.regionId,
      locationId: plan.locationId,
    });
    if (!allowed) {
      throw new ForbiddenException(
        'You do not have access to this Project/Region/Location scope.',
      );
    }
  }

  private async assertPermission(
    actor: Actor,
    projectId: string,
    permission: string,
  ) {
    const allowed = await this.authorization.hasPermission(
      actor.userId,
      projectId,
      [permission],
    );
    if (!allowed) {
      throw new ForbiddenException(
        `You do not have permission to perform this action. Required: ${permission}.`,
      );
    }
  }

  /** Finds users holding `roleName` within a Project whose scope covers the given Region/Location. */
  private async findRoleHoldersInScope(
    roleName: string,
    projectId: string,
    regionId: string,
    locationId: string,
  ): Promise<string[]> {
    const role = await this.prisma.role.findUnique({
      where: { name: roleName },
    });
    if (!role) return [];

    const userRoles = await this.prisma.userRole.findMany({
      where: { projectId, roleId: role.id },
      select: { userId: true },
    });
    const candidateIds = userRoles.map((u) => u.userId);
    if (candidateIds.length === 0) return [];

    const scopes = await this.prisma.userScope.findMany({
      where: { userId: { in: candidateIds }, projectId },
    });

    const matched = new Set<string>();
    for (const s of scopes) {
      if (s.regionId && s.regionId !== regionId) continue;
      if (s.locationId && s.locationId !== locationId) continue;
      matched.add(s.userId);
    }
    return [...matched];
  }

  private async recordHistory(
    dailyPlanId: string,
    fromStatus: DailyPlanStatus,
    toStatus: DailyPlanStatus,
    action: string,
    performedBy: string | null,
    comment?: string,
  ) {
    await this.prisma.workflowHistory.create({
      data: { dailyPlanId, fromStatus, toStatus, action, performedBy, comment },
    });
  }

  // --------------------------------------------------------------------
  // CRUD (SDD 10.3)
  // --------------------------------------------------------------------

  async create(dto: CreateDailyPlanDto, actor: Actor) {
    await this.assertScope(actor, dto);
    await this.assertPermission(actor, dto.projectId, 'daily_plan.create');

    const plan = await this.prisma.dailyPlan.create({
      data: {
        projectId: dto.projectId,
        regionId: dto.regionId,
        locationId: dto.locationId,
        towId: dto.towId,
        stowId: dto.stowId,
        sstowId: dto.sstowId,
        plannedQuantity: new Prisma.Decimal(dto.plannedQuantity),
        plannedManDay: new Prisma.Decimal(dto.plannedManDay),
        workDate: new Date(dto.workDate),
        status: DailyPlanStatus.DRAFT,
        technicalOfficeId: actor.userId,
      },
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'CREATE',
      entityType: 'DailyPlan',
      entityId: plan.id,
      newValue: plan,
    });

    return plan;
  }

  async findAll(query: QueryDailyPlansDto, actor: Actor) {
    const scopes = await this.authorization.getUserScopes(actor.userId);
    if (scopes.length === 0) {
      return {
        items: [],
        total: 0,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      };
    }

    // A user may only see Daily Plans within one of their granted scopes
    // (Project-wide, Region-wide, or Location-specific) - SDD 4.6 / 13.
    const scopeFilter: Prisma.DailyPlanWhereInput = {
      OR: scopes.map((s) => ({
        projectId: s.projectId,
        ...(s.regionId ? { regionId: s.regionId } : {}),
        ...(s.locationId ? { locationId: s.locationId } : {}),
      })),
    };

    const where: Prisma.DailyPlanWhereInput = {
      AND: [
        scopeFilter,
        { deletedAt: null },
        query.projectId ? { projectId: query.projectId } : {},
        query.regionId ? { regionId: query.regionId } : {},
        query.locationId ? { locationId: query.locationId } : {},
        query.assignedHeadMasterId
          ? { assignedHeadMasterId: query.assignedHeadMasterId }
          : {},
        query.status ? { status: query.status } : {},
        query.workDateFrom || query.workDateTo
          ? {
              workDate: {
                ...(query.workDateFrom
                  ? { gte: new Date(query.workDateFrom) }
                  : {}),
                ...(query.workDateTo
                  ? { lte: new Date(query.workDateTo) }
                  : {}),
              },
            }
          : {},
      ],
    };

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await Promise.all([
      this.prisma.dailyPlan.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [query.sortBy ?? 'workDate']: query.sortDir ?? 'desc' },
      }),
      this.prisma.dailyPlan.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string, actor: Actor) {
    const plan = await this.loadOrFail(id);
    await this.assertScope(actor, plan);
    return plan;
  }

  async update(id: string, dto: UpdateDailyPlanDto, actor: Actor) {
    const plan = await this.loadOrFail(id);
    await this.assertScope(actor, plan);
    await this.assertPermission(actor, plan.projectId, 'daily_plan.update');

    if (plan.status !== DailyPlanStatus.DRAFT) {
      throw new ConflictException(
        'Only Daily Plans in Draft status can be updated.',
      );
    }

    const updated = await this.prisma.dailyPlan.update({
      where: { id },
      data: {
        ...(dto.towId ? { towId: dto.towId } : {}),
        ...(dto.stowId ? { stowId: dto.stowId } : {}),
        ...(dto.sstowId ? { sstowId: dto.sstowId } : {}),
        ...(dto.plannedQuantity !== undefined
          ? { plannedQuantity: new Prisma.Decimal(dto.plannedQuantity) }
          : {}),
        ...(dto.plannedManDay !== undefined
          ? { plannedManDay: new Prisma.Decimal(dto.plannedManDay) }
          : {}),
        ...(dto.workDate ? { workDate: new Date(dto.workDate) } : {}),
      },
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'UPDATE',
      entityType: 'DailyPlan',
      entityId: id,
      oldValue: plan,
      newValue: updated,
    });

    return updated;
  }

  async remove(id: string, actor: Actor) {
    const plan = await this.loadOrFail(id);
    await this.assertScope(actor, plan);
    await this.assertPermission(actor, plan.projectId, 'daily_plan.delete');

    // Assumption (SDD does not specify further): cancellation is only safe
    // before field execution begins, to avoid discarding in-progress work.
    if (
      plan.status !== DailyPlanStatus.DRAFT &&
      plan.status !== DailyPlanStatus.ASSIGNED
    ) {
      throw new ConflictException(
        'Only Daily Plans in Draft or Assigned status can be cancelled.',
      );
    }

    await this.prisma.dailyPlan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'DELETE',
      entityType: 'DailyPlan',
      entityId: id,
      oldValue: plan,
    });
  }

  // --------------------------------------------------------------------
  // Workflow actions (SDD 8, 10.3, 10.5)
  // --------------------------------------------------------------------

  async assign(id: string, dto: AssignDailyPlanDto, actor: Actor) {
    const plan = await this.loadOrFail(id);
    await this.assertScope(actor, plan);

    const permissions = await this.authorization.getEffectivePermissions(
      actor.userId,
      plan.projectId,
    );
    const transition = this.workflow.assertTransitionAllowed({
      currentStatus: plan.status,
      candidateActions: ['ASSIGN'],
      actorPermissions: permissions,
      validatorResults: {
        ProjectSelected: true,
        LocationSelected: true,
        QuantityEntered: Number(plan.plannedQuantity) > 0,
        HeadOfMasterAssigned: !!dto.headOfMasterId,
      },
    });

    const updated = await this.prisma.dailyPlan.update({
      where: { id },
      data: { status: transition.to, assignedHeadMasterId: dto.headOfMasterId },
    });

    await this.recordHistory(
      id,
      plan.status,
      transition.to,
      transition.action,
      actor.userId,
    );
    await this.notifications.dispatch({
      userId: dto.headOfMasterId,
      title: 'New Daily Plan Assigned',
      body: `You have been assigned Daily Plan for ${plan.workDate.toISOString().slice(0, 10)}.`,
    });
    await this.audit.record({
      userId: actor.userId,
      action: 'ASSIGN',
      entityType: 'DailyPlan',
      entityId: id,
      oldValue: { status: plan.status },
      newValue: {
        status: updated.status,
        assignedHeadMasterId: dto.headOfMasterId,
      },
    });

    return updated;
  }

  async start(id: string, actor: Actor) {
    const plan = await this.loadOrFail(id);
    await this.assertScope(actor, plan);

    if (plan.assignedHeadMasterId !== actor.userId) {
      throw new ForbiddenException(
        'Only the assigned Head of Master can start execution of this Daily Plan.',
      );
    }

    const crews = await this.prisma.crew.findMany({
      where: { dailyPlanId: id, deletedAt: null },
      include: { crewMembers: true },
    });
    const crewCreated = crews.length > 0;
    const workersAssigned = crews.some((c) => c.crewMembers.length > 0);

    const permissions = await this.authorization.getEffectivePermissions(
      actor.userId,
      plan.projectId,
    );
    const transition = this.workflow.assertTransitionAllowed({
      currentStatus: plan.status,
      candidateActions: ['START'],
      actorPermissions: permissions,
      validatorResults: {
        CrewCreated: crewCreated,
        WorkersAssigned: workersAssigned,
      },
    });

    const updated = await this.prisma.dailyPlan.update({
      where: { id },
      data: { status: transition.to },
    });
    await this.recordHistory(
      id,
      plan.status,
      transition.to,
      transition.action,
      actor.userId,
    );
    await this.audit.record({
      userId: actor.userId,
      action: 'START_EXECUTION',
      entityType: 'DailyPlan',
      entityId: id,
      oldValue: { status: plan.status },
      newValue: { status: updated.status },
    });

    return updated;
  }

  async submit(id: string, dto: SubmitDailyPlanDto, actor: Actor) {
    const plan = await this.loadOrFail(id);
    await this.assertScope(actor, plan);

    if (plan.assignedHeadMasterId !== actor.userId) {
      throw new ForbiddenException(
        'Only the assigned Head of Master can submit execution results for this Daily Plan.',
      );
    }

    const isComplete = dto.actualQuantity >= Number(plan.plannedQuantity);
    const permissions = await this.authorization.getEffectivePermissions(
      actor.userId,
      plan.projectId,
    );

    const transition = this.workflow.assertTransitionAllowed({
      currentStatus: plan.status,
      candidateActions: ['SUBMIT', 'RESUBMIT'],
      actorPermissions: permissions,
      validatorResults: {
        ActualQuantityEntered:
          dto.actualQuantity !== undefined && dto.actualQuantity !== null,
        ActualManDayEntered:
          dto.actualManDay !== undefined && dto.actualManDay !== null,
        CommentMandatoryIfIncomplete:
          isComplete || !!(dto.comment && dto.comment.trim().length > 0),
        RejectionCommentProvided:
          plan.status !== DailyPlanStatus.REJECTED ||
          !!(dto.comment && dto.comment.trim().length > 0),
      },
    });

    const updated = await this.prisma.dailyPlan.update({
      where: { id },
      data: {
        status: transition.to,
        actualQuantity: new Prisma.Decimal(dto.actualQuantity),
        actualManDay: new Prisma.Decimal(dto.actualManDay),
        overtime:
          dto.overtime !== undefined
            ? new Prisma.Decimal(dto.overtime)
            : undefined,
        comment: dto.comment,
      },
    });

    await this.recordHistory(
      id,
      plan.status,
      transition.to,
      transition.action,
      actor.userId,
      dto.comment,
    );

    const siteChiefIds = await this.findRoleHoldersInScope(
      'Site Chief',
      plan.projectId,
      plan.regionId,
      plan.locationId,
    );
    for (const userId of siteChiefIds) {
      await this.notifications.dispatch({
        userId,
        title: 'Daily Plan Submitted for Review',
        body: `A Daily Plan for ${plan.workDate.toISOString().slice(0, 10)} has been submitted and requires your review.`,
      });
    }

    await this.audit.record({
      userId: actor.userId,
      action: transition.action,
      entityType: 'DailyPlan',
      entityId: id,
      oldValue: { status: plan.status },
      newValue: {
        status: updated.status,
        actualQuantity: dto.actualQuantity,
        actualManDay: dto.actualManDay,
      },
    });

    return updated;
  }

  async approve(id: string, actor: Actor) {
    const plan = await this.loadOrFail(id);
    await this.assertScope(actor, plan);

    const permissions = await this.authorization.getEffectivePermissions(
      actor.userId,
      plan.projectId,
    );

    const transition = this.workflow.assertTransitionAllowed({
      currentStatus: plan.status,
      candidateActions: ['APPROVE'],
      actorPermissions: permissions,
      validatorResults: {
        SubmissionCompleted:
          plan.status !== DailyPlanStatus.SUBMITTED ||
          plan.actualQuantity !== null,
        SiteChiefApprovalCompleted: true,
      },
    });

    // Separation of Duties (SDD 12.3): cannot approve your own submission,
    // and the Project Manager cannot be the same person who approved as Site Chief.
    const relatedActorIds: Array<string | null> = [plan.assignedHeadMasterId];
    if (plan.status === DailyPlanStatus.APPROVED_BY_SITE_CHIEF) {
      const lastSiteChiefApproval = await this.prisma.workflowHistory.findFirst(
        {
          where: {
            dailyPlanId: id,
            toStatus: DailyPlanStatus.APPROVED_BY_SITE_CHIEF,
          },
          orderBy: { createdAt: 'desc' },
        },
      );
      relatedActorIds.push(lastSiteChiefApproval?.performedBy ?? null);
    }
    this.workflow.assertNotSelfApproval(actor.userId, relatedActorIds);

    const updated = await this.prisma.dailyPlan.update({
      where: { id },
      data: { status: transition.to },
    });
    await this.recordHistory(
      id,
      plan.status,
      transition.to,
      transition.action,
      actor.userId,
    );

    if (transition.to === DailyPlanStatus.APPROVED_BY_SITE_CHIEF) {
      const pmIds = await this.findRoleHoldersInScope(
        'Project Manager',
        plan.projectId,
        plan.regionId,
        plan.locationId,
      );
      for (const userId of pmIds) {
        await this.notifications.dispatch({
          userId,
          title: 'Daily Plan Awaiting Final Approval',
          body: `A Daily Plan for ${plan.workDate.toISOString().slice(0, 10)} was approved by the Site Chief and awaits your approval.`,
        });
      }
    }

    await this.audit.record({
      userId: actor.userId,
      action: 'APPROVE',
      entityType: 'DailyPlan',
      entityId: id,
      oldValue: { status: plan.status },
      newValue: { status: updated.status },
    });

    // SDD 4.5: "Approved Daily Plans are automatically consolidated into the
    // Daily Report" -- once Project Manager approval lands, the workflow
    // auto-completes (Responsible Role for Completed = "System", SDD 8.2).
    if (transition.to === DailyPlanStatus.APPROVED_BY_PROJECT_MANAGER) {
      const completed = await this.prisma.dailyPlan.update({
        where: { id },
        data: { status: DailyPlanStatus.COMPLETED },
      });
      await this.recordHistory(
        id,
        DailyPlanStatus.APPROVED_BY_PROJECT_MANAGER,
        DailyPlanStatus.COMPLETED,
        'COMPLETE',
        null,
        'Automatically consolidated into Daily Report.',
      );
      await this.audit.record({
        userId: null,
        action: 'COMPLETE',
        entityType: 'DailyPlan',
        entityId: id,
        newValue: { status: DailyPlanStatus.COMPLETED },
      });
      return completed;
    }

    return updated;
  }

  async reject(id: string, dto: RejectDailyPlanDto, actor: Actor) {
    const plan = await this.loadOrFail(id);
    await this.assertScope(actor, plan);

    const permissions = await this.authorization.getEffectivePermissions(
      actor.userId,
      plan.projectId,
    );
    const transition = this.workflow.assertTransitionAllowed({
      currentStatus: plan.status,
      candidateActions: ['REJECT'],
      actorPermissions: permissions,
      validatorResults: { RejectionReasonProvided: !!dto.reason },
    });

    this.workflow.assertNotSelfApproval(actor.userId, [
      plan.assignedHeadMasterId,
    ]);

    const updated = await this.prisma.dailyPlan.update({
      where: { id },
      data: { status: transition.to, rejectionReason: dto.reason },
    });

    await this.recordHistory(
      id,
      plan.status,
      transition.to,
      transition.action,
      actor.userId,
      dto.reason,
    );

    if (plan.assignedHeadMasterId) {
      await this.notifications.dispatch({
        userId: plan.assignedHeadMasterId,
        title: 'Daily Plan Rejected',
        body: `Your Daily Plan for ${plan.workDate.toISOString().slice(0, 10)} was rejected: ${dto.reason}`,
      });
    }

    await this.audit.record({
      userId: actor.userId,
      action: 'REJECT',
      entityType: 'DailyPlan',
      entityId: id,
      oldValue: { status: plan.status },
      newValue: { status: updated.status, rejectionReason: dto.reason },
    });

    return updated;
  }

  async getHistory(id: string, actor: Actor) {
    const plan = await this.loadOrFail(id);
    await this.assertScope(actor, plan);

    return this.prisma.workflowHistory.findMany({
      where: { dailyPlanId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        performer: { select: { id: true, fullName: true, email: true } },
      },
    });
  }
}
