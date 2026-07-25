import { Module } from '@nestjs/common';
import { WorkflowModule } from '../workflow/workflow.module';
import { DailyPlansController } from './daily-plans.controller';
import { DailyPlansService } from './daily-plans.service';

@Module({
  imports: [WorkflowModule],
  controllers: [DailyPlansController],
  providers: [DailyPlansService],
  exports: [DailyPlansService],
})
export class DailyPlansModule {}
