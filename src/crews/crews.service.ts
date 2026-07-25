import { Injectable } from '@nestjs/common';
import { AssignWorkerDto } from './dto/assign-worker.dto';
import { CreateCrewDto } from './dto/create-crew.dto';

interface Actor {
  userId: string;
  email: string;
}

@Injectable()
export class CrewsService {
  async create(dto: CreateCrewDto, actor: Actor) {
    return {
      id: 'crew-created',
      ...dto,
      createdBy: actor.userId,
    };
  }

  async findOne(id: string, actor: Actor) {
    return {
      id,
      name: 'Crew placeholder',
      createdBy: actor.userId,
    };
  }

  async assignWorker(crewId: string, dto: AssignWorkerDto, actor: Actor) {
    return {
      crewId,
      assignedBy: actor.userId,
      ...dto,
    };
  }

  async removeWorker(crewId: string, workerId: string, actor: Actor) {
    return {
      crewId,
      workerId,
      removedBy: actor.userId,
    };
  }
}
