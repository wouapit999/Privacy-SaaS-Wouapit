import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { IdentityType } from '@ppm/shared';

const TYPES: IdentityType[] = ['EMAIL', 'DOMAIN', 'USERNAME', 'SOCIAL_HANDLE', 'NAME'];

export class CreateIdentityDto {
  @IsIn(TYPES)
  type!: IdentityType;

  @IsString()
  @MaxLength(320)
  value!: string;
}

export class ConfirmVerificationDto {
  // Present for EMAIL method; absent for DNS (checked live).
  @IsOptional()
  @IsString()
  token?: string;
}
