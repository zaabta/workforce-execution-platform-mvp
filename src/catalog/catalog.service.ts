import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';

interface Actor {
  userId: string;
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: AuthorizationService,
  ) {}

  /** Projects the caller has any scope within. */
  async projects(actor: Actor) {
    const scopes = await this.authorization.getUserScopes(actor.userId);
    const projectIds = [...new Set(scopes.map((s) => s.projectId))];
    if (projectIds.length === 0) return [];
    return this.prisma.project.findMany({
      where: { id: { in: projectIds }, deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
  }

  /** Regions within a Project, filtered to the caller's scope (Project-wide or the specific Region). */
  async regions(actor: Actor, projectId: string) {
    const scopes = await this.authorization.getUserScopes(actor.userId);
    const relevant = scopes.filter((s) => s.projectId === projectId);
    if (relevant.length === 0) return [];

    const projectWide = relevant.some((s) => !s.regionId);
    const where = projectWide
      ? { projectId, deletedAt: null }
      : { projectId, deletedAt: null, id: { in: relevant.map((s) => s.regionId).filter((x): x is string => !!x) } };

    return this.prisma.region.findMany({ where, select: { id: true, name: true }, orderBy: { name: 'asc' } });
  }

  /** Locations within a Region, filtered to the caller's scope (Region-wide or the specific Location). */
  async locations(actor: Actor, regionId: string) {
    const region = await this.prisma.region.findUnique({ where: { id: regionId } });
    if (!region) return [];

    const scopes = await this.authorization.getUserScopes(actor.userId);
    const relevant = scopes.filter((s) => s.projectId === region.projectId && (!s.regionId || s.regionId === regionId));
    if (relevant.length === 0) return [];

    const regionWide = relevant.some((s) => s.regionId === regionId && !s.locationId);
    const where = regionWide
      ? { regionId, deletedAt: null }
      : { regionId, deletedAt: null, id: { in: relevant.map((s) => s.locationId).filter((x): x is string => !!x) } };

    return this.prisma.location.findMany({ where, select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } });
  }

  // ToW/SToW/SSToW are global reference data (not scoped) per the ER diagram.
  async tows() {
    return this.prisma.tow.findMany({ select: { id: true, code: true, name: true }, orderBy: { name: 'asc' } });
  }

  async stows(towId: string) {
    return this.prisma.stow.findMany({ where: { towId }, select: { id: true, code: true, name: true }, orderBy: { name: 'asc' } });
  }

  async sstows(stowId: string) {
    return this.prisma.sstow.findMany({ where: { stowId }, select: { id: true, code: true, name: true }, orderBy: { name: 'asc' } });
  }
}
