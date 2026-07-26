import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryWorkersDto } from './dto/query-workers.dto';
import { CreateWorkerDto } from './dto/create-worker.dto';

/**
 * Workers are business entities, not application users (SDD 9.3), and are
 * not scoped to a Project/Region/Location - the same worker can move
 * between crews and locations over time. This is why listing/creating them
 * has no scope check, unlike Crews/Daily Plans.
 */
@Injectable()
export class WorkersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryWorkersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { employeeNo: { contains: query.search, mode: 'insensitive' as const } },
              { fullName: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.worker.findMany({
        where,
        orderBy: { fullName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.worker.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async create(dto: CreateWorkerDto) {
    const existing = await this.prisma.worker.findUnique({ where: { employeeNo: dto.employeeNo } });
    if (existing) {
      throw new ConflictException('A worker with this employee number already exists.');
    }
    return this.prisma.worker.create({
      data: { employeeNo: dto.employeeNo, fullName: dto.fullName, type: dto.type ?? 'SKILLED' },
    });
  }
}
