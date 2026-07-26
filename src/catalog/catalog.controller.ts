import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CatalogService } from './catalog.service';

@ApiTags('Catalog (Master Data)')
@ApiBearerAuth()
@Controller()
export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  @Get('projects')
  @ApiOperation({ summary: 'List Projects within the caller\'s authorized scope' })
  async projects(@CurrentUser() user: AuthenticatedUser) {
    return this.service.projects(user);
  }

  @Get('projects/:projectId/regions')
  @ApiOperation({ summary: 'List Regions within a Project, filtered to the caller\'s scope' })
  async regions(@Param('projectId', ParseUUIDPipe) projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.regions(user, projectId);
  }

  @Get('regions/:regionId/locations')
  @ApiOperation({ summary: 'List Locations within a Region, filtered to the caller\'s scope' })
  async locations(@Param('regionId', ParseUUIDPipe) regionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.locations(user, regionId);
  }

  @Get('tow')
  @ApiOperation({ summary: 'List all ToW (Type of Work) reference values' })
  async tows() {
    return this.service.tows();
  }

  @Get('tow/:towId/stow')
  @ApiOperation({ summary: 'List SToW values under a ToW' })
  async stows(@Param('towId', ParseUUIDPipe) towId: string) {
    return this.service.stows(towId);
  }

  @Get('stow/:stowId/sstow')
  @ApiOperation({ summary: 'List SSToW values under a SToW' })
  async sstows(@Param('stowId', ParseUUIDPipe) stowId: string) {
    return this.service.sstows(stowId);
  }
}
