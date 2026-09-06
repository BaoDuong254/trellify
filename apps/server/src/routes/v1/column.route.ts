import express, { Router } from "express";

import { columnController } from "src/controllers/column.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { rateLimitMiddleware } from "src/middlewares/rate-limit.middleware";
import { columnValidation } from "src/validations/column.validation";

const router: Router = express.Router();

router
  .route("/")
  .post(authMiddleware.isAuthorized, rateLimitMiddleware.write, columnValidation.createNew, columnController.createNew);
router
  .route("/:id")
  .put(authMiddleware.isAuthorized, rateLimitMiddleware.write, columnValidation.update, columnController.update)
  .delete(
    authMiddleware.isAuthorized,
    rateLimitMiddleware.write,
    columnValidation.deleteItem,
    columnController.deleteItem
  );

export const columnRoute = router;
