import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { FindingsService } from './findings.service';

@ApiTags('findings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('findings')
export class FindingsController {
  constructor(private readonly findings: FindingsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.findings.list(user.userId);
  }

  @Post(':id/removed')
  markRemoved(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.findings.markRemoved(user.userId, id);
  }
}
