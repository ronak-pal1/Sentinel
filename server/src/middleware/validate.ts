import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/AppError';

type Schemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query) as typeof req.query;
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (err) {
      if (err && typeof err === 'object' && 'issues' in err) {
        const issues = (err as { issues: { path: (string | number)[]; message: string }[] })
          .issues;
        const message = issues
          .map((i) => `${i.path.join('.') || 'value'}: ${i.message}`)
          .join('; ');
        next(new AppError(message || 'Validation failed', StatusCodes.BAD_REQUEST));
        return;
      }
      next(err);
    }
  };
}
