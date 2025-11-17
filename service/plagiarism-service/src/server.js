const buildServer = require("./app");
const config = require("./config");
const { copyleaksClient } = require("./services/copyleaksService");

async function start() {
  const server = buildServer();

  try {
    await copyleaksClient.login();
    server.log.info("Copyleaks authentication ready");
  } catch (error) {
    server.log.error({ err: error }, "Failed to authenticate with Copyleaks");
  }

  try {
    await server.listen({ port: config.port, host: "0.0.0.0" });
    server.log.info("Plagiarism microservice running", {
      port: config.port,
      env: config.env,
      webhookBaseUrl: config.webhookBaseUrl,
    });
  } catch (error) {
    server.log.error({ err: error }, "Failed to start Fastify server");
    process.exit(1);
  }
}

start();
