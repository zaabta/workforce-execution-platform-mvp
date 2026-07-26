import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(role?: string, projectId?: string, regionId?: string, locationId?: string) {
    const normalizedRole = role?.trim();

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(normalizedRole
          ? {
              userRoles: {
                some: {
                  role: {
                    name: { equals: normalizedRole, mode: 'insensitive' },
                  },
                },
              },
            }
          : {}),
        ...(projectId
          ? {
              userRoles: {
                some: {
                  projectId: projectId,
                },
              },
            }
          : {}),
        ...(regionId
          ? {
              userScopes: {
                some: {
                  regionId: regionId,
                },
              },
            }
          : {}),
        ...(locationId
          ? {
              userScopes: {
                some: {
                  locationId: locationId,
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        userRoles: {
          select: {
            projectId: true,
            project: { select: { name: true, code: true } },
            role: { select: { name: true } },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      isActive: user.isActive,
      roles: user.userRoles.map((ur) => ({
        projectId: ur.projectId,
        projectName: ur.project.name,
        projectCode: ur.project.code,
        role: ur.role.name,
      })),
    }));
  }

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
