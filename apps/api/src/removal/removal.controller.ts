import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { RemovalKind } from '@ppm/shared';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RemovalService } from './removal.service';

class CreateRemovalDto {
  @IsString()
  discoveredProfileId!: string;

  @IsIn(['GDPR', 'CCPA', 'PROFILE_REMOVAL', 'PRIVACY_SETTINGS'])
  kind!: RemovalKind;
}

@ApiTags('removal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('removal')
export class RemovalController {
  constructor(private readonly removal: RemovalService) {}

  @Post('create')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRemovalDto) {
    return this.removal.create(user.userId, dto.discoveredProfileId, dto.kind);
  }
}
