import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module.js';
import {
  AdmissionsController,
  PublicAdmissionsController,
} from './admissions.controller.js';
import { AdmissionsService } from './admissions.service.js';

@Module({
  imports: [StudentsModule],
  controllers: [PublicAdmissionsController, AdmissionsController],
  providers: [AdmissionsService],
})
export class AdmissionsModule {}
