import { ConflictException, NotFoundException } from '@nestjs/common';

interface PrismaKnownError {
  code: string;
  meta?: { target?: unknown };
}

function isPrismaKnownError(error: unknown): error is PrismaKnownError {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as PrismaKnownError).code === 'string'
  );
}

/** Maps unique and missing-record errors to HTTP errors; anything else is rethrown. */
export function mapPrismaError(
  error: unknown,
  conflictMessage = 'Record already exists',
): never {
  if (isPrismaKnownError(error)) {
    if (error.code === 'P2002') throw new ConflictException(conflictMessage);
    if (error.code === 'P2025') throw new NotFoundException();
    if (error.code === 'P2003')
      throw new ConflictException(
        'Referenced record does not exist or is still in use',
      );
  }
  throw error;
}
