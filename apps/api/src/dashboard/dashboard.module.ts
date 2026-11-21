import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module.js';
import { StudentsModule } from '../students/students.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [StudentsModule, FinanceModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
