import { Module } from '@nestjs/common';
import { StudentsModule } from '../students/students.module.js';
import {
  MyCoursesController,
  OfferingsController,
  ResultsController,
  TeachingController,
} from './courses.controller.js';
import { CoursesService } from './courses.service.js';

@Module({
  imports: [StudentsModule],
  controllers: [
    OfferingsController,
    MyCoursesController,
    TeachingController,
    ResultsController,
  ],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
