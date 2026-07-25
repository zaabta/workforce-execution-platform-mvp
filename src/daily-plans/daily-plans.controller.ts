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
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DailyPlansService } from './daily-plans.service';
import { CreateDailyPlanDto } from './dto/create-daily-plan.dto';
import { UpdateDailyPlanDto } from './dto/update-daily-plan.dto';
import { AssignDailyPlanDto } from './dto/assign-daily-plan.dto';
import { SubmitDailyPlanDto } from './dto/submit-daily-plan.dto';
import { RejectDailyPlanDto } from './dto/reject-daily-plan.dto';
import { QueryDailyPlansDto } from './dto/query-daily-plans.dto';

@ApiTags('Daily Planning')
@ApiBearerAuth()
@Controller('daily-plans')
export class DailyPlansController {
  constructor(private readonly service: DailyPlansService) {}

  @Post()
  @Permissions('daily_plan.create')
  @ApiOperation({ summary: 'Create a Daily Plan (Technical Office Engineer)' })
  async create(
    @Body() dto: CreateDailyPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: "List Daily Plans within the caller's authorized scope",
  })
  async findAll(
    @Query() query: QueryDailyPlansDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.service.findAll(query, user);
    return {
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Daily Plan details' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user);
  }

  @Put(':id')
  @Permissions('daily_plan.update')
  @ApiOperation({ summary: 'Update a Daily Plan (Draft status only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDailyPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Permissions('daily_plan.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel (soft-delete) a Daily Plan (Draft/Assigned status only)',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.service.remove(id, user);
  }

  @Post(':id/assign')
  @ApiOperation({
    summary: 'Assign the Daily Plan to a Head of Master (Draft -> Assigned)',
  })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDailyPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.assign(id, dto, user);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Start field execution (Assigned -> In Progress)' })
  async start(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.start(id, user);
  }

  @Post(':id/submit')
  @ApiOperation({
    summary:
      'Submit execution results (In Progress -> Submitted, or Rejected -> Submitted on resubmission)',
  })
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitDailyPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.submit(id, dto, user);
  }

  @Post(':id/approve')
  @ApiOperation({
    summary:
      'Approve the current workflow step. The backend resolves whether this is the Site Chief or Project Manager stage based on current status (SDD 10.5).',
  })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.approve(id, user);
  }

  @Post(':id/reject')
  @ApiOperation({
    summary: 'Reject the current workflow step (mandatory rejection reason)',
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDailyPlanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.reject(id, dto, user);
  }

  @Get(':id/history')
  @ApiOperation({
    summary: 'Retrieve the full workflow (approval) history for a Daily Plan',
  })
  async history(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getHistory(id, user);
  }
}
