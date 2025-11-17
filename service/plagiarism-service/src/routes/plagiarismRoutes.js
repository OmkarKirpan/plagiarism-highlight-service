const controller = require("../controllers/plagiarismController");

async function plagiarismRoutes(fastify) {
  fastify.post("/", controller.submitScan);
  fastify.get("/", controller.listScans);
  fastify.get("/:scanId", controller.getScan);
  fastify.get("/:scanId/highlight", controller.getHighlights);
  fastify.delete("/:scanId", controller.deleteScan);
}

module.exports = plagiarismRoutes;
