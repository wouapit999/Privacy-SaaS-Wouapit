import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { IdentityService } from './identity.service';
import { CreateIdentityDto, ConfirmVerificationDto } from './dto/identity.dto';

@ApiTags('identity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('identity')
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateIdentityDto) {
    return this.identity.create(user.userId, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.identity.list(user.userId);
  }

  @Post(':id/verify/start')
  start(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.identity.startVerification(user.userId, id);
  }

  @Post(':id/verify/confirm')
  confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ConfirmVerificationDto,
  ) {
    return this.identity.confirmVerification(user.userId, id, dto.token);
  }
}
