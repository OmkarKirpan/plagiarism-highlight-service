const Fastify = require("fastify");
const config = require("./config");
const plagiarismRoutes = require("./routes/plagiarismRoutes");
const webhookRoutes = require("./routes/webhookRoutes");
const { notFoundHandler, errorHandler } = require("./middlewares/errorHandler");

function buildServer() {
  const isProduction = process.env.NODE_ENV === "production";

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
      transport: isProduction
        ? undefined
        : {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
            },
          },
    },
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
