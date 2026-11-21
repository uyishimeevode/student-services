import { Module } from '@nestjs/common';
import { CoursesModule } from '../courses/courses.module.js';
import { StudentsModule } from '../students/students.module.js';
import { ExamsController } from './exams.controller.js';
import { ExamsService } from './exams.service.js';

@Module({
  imports: [StudentsModule, CoursesModule],
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}
