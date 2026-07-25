import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AssignWorkerDto } from './dto/assign-worker.dto';
import { CreateCrewDto } from './dto/create-crew.dto';
import { CrewsService } from './crews.service';

@ApiTags('Crew Management')
@ApiBearerAuth()
@Controller('crews')
export class CrewsController {
  constructor(private readonly service: CrewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a crew for a daily plan' })
  async create(
    @Body() dto: CreateCrewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get crew details, including assigned workers' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user);
  }

  @Post(':id/workers')
  @ApiOperation({ summary: 'Assign a worker to a crew' })
  async assignWorker(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignWorkerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.assignWorker(id, dto, user);
  }

  @Delete(':id/workers/:workerId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a worker from a crew' })
  async removeWorker(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('workerId', ParseUUIDPipe) workerId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.service.removeWorker(id, workerId, user);
  }
}
