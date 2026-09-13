import express, { Router } from "express";

import { diagnosticsController } from "src/controllers/diagnostics.controller";

const ENVELOPE_SIZE_LIMIT = "5mb";

const router: Router = express.Router();

router
  .route("/")
  .post(express.raw({ type: () => true, limit: ENVELOPE_SIZE_LIMIT }), diagnosticsController.forwardEnvelope);

export const diagnosticsRoute = router;
