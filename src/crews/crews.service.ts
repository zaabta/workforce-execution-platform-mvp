import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DailyPlanStatus, Worker } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { AuditService } from '../audit/audit.service';
import { Actor } from '../common/types/actor.type';
import { AssignWorkerDto } from './dto/assign-worker.dto';
import { CreateCrewDto } from './dto/create-crew.dto';
import { CREW_PERMISSIONS } from './constants/crew-permissions.constants';

@Injectable()
export class CrewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
  ) {}

  private async loadCrewOrFail(id: string) {
    const crew = await this.prisma.crew.findUnique({
      where: { id },
      include: {
        dailyPlan: true,
        crewMembers: { include: { worker: true } },
      },
    });
    if (!crew || crew.deletedAt) {
      throw new NotFoundException('Crew not found.');
    }
    return crew;
  }

  private async assertScope(
    actor: Actor,
    plan: { projectId: string; regionId: string; locationId: string },
  ) {
    await this.authorization.assertScope(actor.userId, {
      projectId: plan.projectId,
      regionId: plan.regionId,
      locationId: plan.locationId,
    });
  }

  private async assertPermission(
    actor: Actor,
    projectId: string,
    permission: string,
  ) {
    await this.authorization.assertPermission(actor.userId, projectId, permission);
  }

  async create(dto: CreateCrewDto, actor: Actor) {
    const dailyPlan = await this.prisma.dailyPlan.findUnique({
      where: { id: dto.dailyPlanId },
    });
    if (!dailyPlan || dailyPlan.deletedAt) {
      throw new NotFoundException('Daily Plan not found.');
    }

    await this.assertScope(actor, dailyPlan);
    await this.assertPermission(actor, dailyPlan.projectId, CREW_PERMISSIONS.CREATE);

    // Crew creation is only meaningful when the Daily Plan is in progress.
    if (dailyPlan.assignedHeadMasterId !== actor.userId) {
      throw new ForbiddenException(
        'Only the assigned Head of Master can create crews for this Daily Plan.',
      );
    }
    if (
      dailyPlan.status !== DailyPlanStatus.ASSIGNED &&
      dailyPlan.status !== DailyPlanStatus.IN_PROGRESS
    ) {
      throw new ConflictException(
        'Crews can only be created for Daily Plans in Assigned or In Progress status.',
      );
    }

    const crew = await this.prisma.crew.create({
      data: {
        dailyPlanId: dto.dailyPlanId,
        name: dto.name,
        workerType: dto.workerType,
      },
      include: { crewMembers: { include: { worker: true } } },
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'CREATE',
      entityType: 'Crew',
      entityId: crew.id,
      newValue: crew,
    });

    return crew;
  }

  async findOne(id: string, actor: Actor) {
    const crew = await this.loadCrewOrFail(id);
    await this.assertScope(actor, crew.dailyPlan);
    return crew;
  }

  async assignWorker(crewId: string, dto: AssignWorkerDto, actor: Actor) {
    const crew = await this.loadCrewOrFail(crewId);
    await this.assertScope(actor, crew.dailyPlan);
    await this.assertPermission(
      actor,
      crew.dailyPlan.projectId,
      CREW_PERMISSIONS.ASSIGN_WORKER,
    );

    if (crew.dailyPlan.assignedHeadMasterId !== actor.userId) {
      throw new ForbiddenException(
        'Only the assigned Head of Master can manage crew members for this Daily Plan.',
      );
    }

    // Resolve or create the Worker record.
    let worker: Worker;
    if (dto.workerId) {
      const found = await this.prisma.worker.findUnique({
        where: { id: dto.workerId },
      });
      if (!found) {
        throw new NotFoundException('Worker not found.');
      }
      worker = found;
    } else if (dto.employeeNo) {
      worker = await this.prisma.worker.upsert({
        where: { employeeNo: dto.employeeNo },
        update: {},
        create: {
          employeeNo: dto.employeeNo,
          fullName: dto.fullName ?? dto.employeeNo,
        },
      });
    } else {
      throw new BadRequestException(
        'Either workerId or employeeNo must be provided.',
      );
    }

    // Prevent duplicate assignment within the same crew.
    const existing = await this.prisma.crewMember.findUnique({
      where: { crewId_workerId: { crewId, workerId: worker.id } },
    });
    if (existing) {
      throw new ConflictException('Worker is already assigned to this crew.');
    }

    await this.prisma.crewMember.create({
      data: { crewId, workerId: worker.id },
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'ASSIGN_WORKER',
      entityType: 'Crew',
      entityId: crewId,
      newValue: { workerId: worker.id, employeeNo: worker.employeeNo },
    });

    return this.loadCrewOrFail(crewId);
  }

  async removeWorker(crewId: string, workerId: string, actor: Actor) {
    const crew = await this.loadCrewOrFail(crewId);
    await this.assertScope(actor, crew.dailyPlan);
    await this.assertPermission(
      actor,
      crew.dailyPlan.projectId,
      CREW_PERMISSIONS.REMOVE_WORKER,
    );

    if (crew.dailyPlan.assignedHeadMasterId !== actor.userId) {
      throw new ForbiddenException(
        'Only the assigned Head of Master can manage crew members for this Daily Plan.',
      );
    }

    const member = await this.prisma.crewMember.findUnique({
      where: { crewId_workerId: { crewId, workerId } },
    });
    if (!member) {
      throw new NotFoundException('Worker is not assigned to this crew.');
    }

    await this.prisma.crewMember.delete({
      where: { crewId_workerId: { crewId, workerId } },
    });

    await this.audit.record({
      userId: actor.userId,
      action: 'REMOVE_WORKER',
      entityType: 'Crew',
      entityId: crewId,
      oldValue: { workerId },
    });
  }
}
