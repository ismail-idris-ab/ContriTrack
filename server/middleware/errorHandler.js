// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error('[unhandled]', err.stack || err.message);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ message: err.message || 'Something went wrong. Please try again.' });
}

module.exports = errorHandler;
