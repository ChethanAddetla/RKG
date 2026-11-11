// zod-based request validation middleware.
import { ApiError } from './errorHandler.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    const first = details[0];
    return next(new ApiError(400, first ? `${first.field ? first.field + ': ' : ''}${first.message}` : 'Invalid request', details));
  }
  req.body = result.data; // parsed + trimmed values
  next();
};
