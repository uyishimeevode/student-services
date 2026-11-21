import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module.js';
import { FinanceController, MyFeesController } from './finance.controller.js';
import { FinanceService } from './finance.service.js';

@Module({
  imports: [StudentsModule],
  controllers: [FinanceController, MyFeesController],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
