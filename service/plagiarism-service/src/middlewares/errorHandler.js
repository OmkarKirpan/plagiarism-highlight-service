const logger = require("../utils/logger");

function notFoundHandler(request, reply) {
  reply.code(404).send({ error: "Not found", path: request.raw.url });
}

function errorHandler(error, request, reply) {
  logger.error({ err: error }, "Unhandled error");
  const status = error.statusCode || error.status || 500;

  if (!reply.sent) {
    reply.code(status).send({
      error: error.message || "Internal server error",
    });
  }
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
