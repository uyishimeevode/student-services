import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [StudentsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
