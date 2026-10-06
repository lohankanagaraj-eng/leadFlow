import { ApiError } from '../utils/api.js';

/** Validates req.body with a Zod schema. */
export const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return next(ApiError.unprocessable('Validation failed', result.error.issues.map((i) => ({
      path: i.path.join('.'), message: i.message,
    }))));
  }
  req.validated = result.data;
  return next();
};

/** Positive integer param guard, e.g. requireParam('id'). */
export const requireParam = (name) => (req, _res, next) => {
  const value = Number(req.params[name]);
  if (!Number.isInteger(value) || value <= 0) {
    return next(ApiError.badRequest(`Invalid ${name}`));
  }
  req.params[name] = value;
  return next();
};

export function paginate(req, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number(req.query.limit) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}
