import express, { Router } from "express";

import { boardController } from "src/controllers/board.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { rateLimitMiddleware } from "src/middlewares/rate-limit.middleware";
import { boardValidation } from "src/validations/board.validation";

const router: Router = express.Router();

router
  .route("/")
  .get(authMiddleware.isAuthorized, boardController.getBoards)
  .post(authMiddleware.isAuthorized, rateLimitMiddleware.write, boardValidation.createNew, boardController.createNew);

router.route("/starred").get(authMiddleware.isAuthorized, boardController.getStarred);

router
  .route("/:id/star")
  .put(authMiddleware.isAuthorized, rateLimitMiddleware.write, boardValidation.setStarred, boardController.setStarred);

router
  .route("/:id")
  .get(authMiddleware.isAuthorized, boardValidation.getDetails, boardController.getDetails)
  .put(authMiddleware.isAuthorized, rateLimitMiddleware.write, boardValidation.update, boardController.update)
  .delete(
    authMiddleware.isAuthorized,
    rateLimitMiddleware.write,
    boardValidation.deleteItem,
    boardController.deleteItem
  );

router.route("/:id/archived").get(authMiddleware.isAuthorized, boardValidation.getDetails, boardController.getArchived);

router
  .route("/:id/members/:userId")
  .delete(
    authMiddleware.isAuthorized,
    rateLimitMiddleware.write,
    boardValidation.removeMember,
    boardController.removeMember
  );

router
  .route("/supports/moving_card")
  .put(
    authMiddleware.isAuthorized,
    rateLimitMiddleware.write,
    boardValidation.moveCardToDifferentColumn,
    boardController.moveCardToDifferentColumn
  );

export const boardRoute = router;
