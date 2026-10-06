import { ApiError } from '../utils/api.js';

export function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (err.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'Duplicate value violates a unique constraint';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    status = 400;
    message = 'Related record does not exist';
  } else if (err.name === 'ZodError') {
    status = 422;
    message = 'Validation failed';
  } else if (!err.isOperational && status === 500) {
    message = process.env.NODE_ENV === 'production' ? 'Internal server error' : message;
  }

  const payload = { success: false, message };
  if (err.details) payload.errors = err.details;
  if (err.name === 'ZodError' && err.issues) {
    payload.errors = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  }

  if (status >= 500) console.error('[ERROR]', err);
  res.status(status).json(payload);
}
