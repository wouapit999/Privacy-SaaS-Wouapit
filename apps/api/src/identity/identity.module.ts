import { Module } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';
import { VerificationService } from './verification.service';

@Module({
  controllers: [IdentityController],
  providers: [IdentityService, VerificationService],
  exports: [IdentityService],
})
export class IdentityModule {}
