import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';


const PG_ERROR_CODES: Record<string, (detail: string) => never> = {
  '23505': (detail) => {
    const field = extractFieldFromDetail(detail);
    throw new ConflictException(
      field ? `${field} already exists` : 'A record with this value already exists',
    );
  },
  '23503': (detail) => {
    const field = extractFieldFromDetail(detail);
    throw new BadRequestException(
      field ? `Referenced ${field} does not exist` : 'Referenced record does not exist',
    );
  },
  '23502': (detail) => {
    const field = extractFieldFromDetail(detail);
    throw new BadRequestException(
      field ? `${field} is required` : 'A required field is missing',
    );
  },
  '23514': (detail) => {
    throw new BadRequestException(
      detail || 'Value violates a check constraint',
    );
  },

  // Data errors
  '22001': () => {
    throw new BadRequestException('Input value is too long for the field');
  },
  '22P02': (detail) => {
    throw new BadRequestException(
      detail || 'Invalid input syntax (e.g. malformed UUID or number)',
    );
  },
  '22003': () => {
    throw new BadRequestException('Numeric value out of allowed range');
  },

  // Relation / schema errors (should not happen in production)
  '42P01': (detail) => {
    throw new InternalServerErrorException(
      `Table not found: ${detail}`,
    );
  },
  '42703': (detail) => {
    throw new InternalServerErrorException(
      `Column not found: ${detail}`,
    );
  },
};


function extractFieldFromDetail(detail: string): string {
  const match:any = detail?.match(/Key \(([^)]+)\)/i);
  if (!match) return '';
  return match[1]
    .replace(/_id$/, '')           // strip trailing _id
    .replace(/_/g, ' ');           // snake_case → words
}


export function handleDatabaseError(error: any): never {

  if (error?.name === 'KnexTimeoutError') {
    throw new InternalServerErrorException(
      'Internal server error. Please try again later.',
    );
  }

  const pgCode: string | undefined =
    error?.code ?? error?.original?.code;

  const detail: string =
    error?.detail ?? error?.original?.detail ?? error?.message ?? '';

  const handler = pgCode ? PG_ERROR_CODES[pgCode] : undefined;

  if (handler) {
    handler(detail); 
  }

  throw new InternalServerErrorException(
    'Internal server error. Please try again later.',
  );
}

/**
 * Returns true if the error looks like a database / Knex / pg error.
 */
export function isDatabaseError(error: any): boolean {
  const pgCode = error?.code ?? error?.original?.code;
  if (typeof pgCode === 'string' && /^[0-9A-Z]{5}$/i.test(pgCode)) {
    return true;
  }

  // Connection-level / driver errors that don't carry a SQL state code
  const connectionErrorMessages = [
    'Connection terminated',
    'Connection ended unexpectedly',
    'connect ECONNREFUSED',
    'timeout',
  ];

  return (
    error?.name === 'KnexTimeoutError' ||
    (typeof error?.message === 'string' &&
      connectionErrorMessages.some((m) => error.message.includes(m)))
  );
}