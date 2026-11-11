// Central error handling. Throw ApiError from controllers for expected failures.
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // MongoDB unique-index violation (e.g. concurrent duplicate phone insert)
  if (err.code === 11000) err = new ApiError(409, 'Duplicate number: this phone already exists');
  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err.message); // message only: never dump request headers/tokens
  res.status(status).json({
    error: {
      message: status >= 500 && !err.status ? 'Internal server error' : err.message,
      details: err.details,
    },
  });
}

/** Wrap async handlers so rejections reach errorHandler. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
