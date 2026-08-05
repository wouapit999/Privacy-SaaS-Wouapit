import { Module } from '@nestjs/common';
import { BreachController } from './breach.controller';
import { BreachService } from './breach.service';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [IdentityModule],
  controllers: [BreachController],
  providers: [BreachService],
})
export class BreachModule {}
