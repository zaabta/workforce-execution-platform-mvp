import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkersService } from './workers.service';
import { QueryWorkersDto } from './dto/query-workers.dto';
import { CreateWorkerDto } from './dto/create-worker.dto';

@ApiTags('Workers')
@ApiBearerAuth()
@Controller('workers')
export class WorkersController {
  constructor(private readonly service: WorkersService) {}

  @Get()
  @ApiOperation({ summary: 'List/search workers (for crew assignment pickers)' })
  async findAll(@Query() query: QueryWorkersDto) {
    const result = await this.service.findAll(query);
    return { items: result.items, total: result.total, page: result.page, limit: result.limit };
  }

  @Post()
  @ApiOperation({ summary: 'Register a new worker in the directory' })
  async create(@Body() dto: CreateWorkerDto) {
    return this.service.create(dto);
  }
}
