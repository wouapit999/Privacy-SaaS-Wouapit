import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AccountService } from './account.service';

class DeleteAccountDto {
  @IsOptional()
  @IsString()
  password?: string;

  // Required (value "DELETE") for OAuth-only accounts that have no password.
  @IsOptional()
  @IsString()
  confirm?: string;
}

@ApiTags('account')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  /** GDPR/CCPA data export — returns the full JSON bundle for the caller. */
  @Get('export')
  export(@CurrentUser() user: AuthenticatedUser) {
    return this.account.exportData(user.userId);
  }

  /** GDPR/CCPA erasure — permanently deletes the caller's account. */
  @Post('delete')
  remove(@CurrentUser() user: AuthenticatedUser, @Body() dto: DeleteAccountDto) {
    return this.account.deleteAccount(user.userId, dto.password, dto.confirm);
  }
}
