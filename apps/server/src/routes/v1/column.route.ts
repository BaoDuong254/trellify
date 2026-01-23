import express, { Router } from "express";
import { columnController } from "src/controllers/column.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { columnValidation } from "src/validations/column.validation";

const router: Router = express.Router();

router.route("/").post(authMiddleware.isAuthorized, columnValidation.createNew, columnController.createNew);
router
  .route("/:id")
  .put(authMiddleware.isAuthorized, columnValidation.update, columnController.update)
  .delete(authMiddleware.isAuthorized, columnValidation.deleteItem, columnController.deleteItem);

export const columnRoute = router;
