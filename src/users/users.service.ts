import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          select: {
            projectId: true,
            project: { select: { name: true, code: true } },
            role: { select: { name: true } },
          },
        },
        userScopes: {
          select: {
            projectId: true,
            regionId: true,
            locationId: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isActive: user.isActive,
      createdAt: user.createdAt,
      roles: user.userRoles.map((ur) => ({
        projectId: ur.projectId,
        projectName: ur.project.name,
        projectCode: ur.project.code,
        role: ur.role.name,
      })),
      scopes: user.userScopes,
    };
  }
}
