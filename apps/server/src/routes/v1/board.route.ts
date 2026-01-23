import express, { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { boardController } from "src/controllers/board.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { boardValidation } from "src/validations/board.validation";

const router: Router = express.Router();

router
  .route("/")
  .get(authMiddleware.isAuthorized, (_request, response) => {
    response.status(StatusCodes.OK).json({
      message: "Board route is working",
      status: StatusCodes.OK,
    });
  })
  .post(authMiddleware.isAuthorized, boardValidation.createNew, boardController.createNew);

router
  .route("/:id")
  .get(authMiddleware.isAuthorized, boardController.getDetails)
  .put(authMiddleware.isAuthorized, boardValidation.update, boardController.update);

router
  .route("/supports/moving_card")
  .put(
    authMiddleware.isAuthorized,
    boardValidation.moveCardToDifferentColumn,
    boardController.moveCardToDifferentColumn
  );

export const boardRoute = router;
