import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { OAuthService } from './oauth/oauth.service';
import { MfaService } from './mfa/mfa.service';
import { MfaController } from './mfa/mfa.controller';
import { UsersModule } from '../users/users.module';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [UsersModule, IdentityModule, PassportModule, JwtModule.register({})],
  controllers: [AuthController, MfaController],
  providers: [AuthService, JwtStrategy, OAuthService, MfaService],
  exports: [AuthService],
})
export class AuthModule {}
