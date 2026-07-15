import { Module } from '@nestjs/common';
import { AiProvider } from '../copilot/ai-provider';
import { ClassificationService } from './classification.service';

/**
 * Shared AI capabilities. Owns the single AiProvider instance and the
 * ClassificationService, so scan/monitoring/copilot all use the same provider.
 */
@Module({
  providers: [AiProvider, ClassificationService],
  exports: [AiProvider, ClassificationService],
})
export class AiModule {}
