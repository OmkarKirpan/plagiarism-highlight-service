const Fastify = require("fastify");
const config = require("./config");
const logger = require("./utils/logger");
const plagiarismRoutes = require("./routes/plagiarismRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const { notFoundHandler, errorHandler } = require("./middlewares/errorHandler");

function buildServer() {
  const app = Fastify({
    logger,
    bodyLimit: 25 * 1024 * 1024,
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "plagiarism-highlight-service",
    environment: config.env,
    webhookBaseUrl: config.webhookBaseUrl,
  }));

  app.register(plagiarismRoutes, { prefix: "/plagiarism" });
  app.register(webhookRoutes, { prefix: "/webhook" });

  app.setNotFoundHandler(notFoundHandler);
  app.setErrorHandler(errorHandler);

  return app;
}

module.exports = buildServer;
