import express, { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { boardController } from "src/controllers/board.controller";
import { boardValidation } from "src/validations/board.validation";

const router: Router = express.Router();

router
  .route("/")
  .get((_request, response) => {
    response.status(StatusCodes.OK).json({
      message: "Board route is working",
      status: StatusCodes.OK,
    });
  })
  .post(boardValidation.createNew, boardController.createNew);

router.route("/:id").get(boardController.getDetails).put(boardValidation.update, boardController.update);

router
  .route("/supports/moving_card")
  .put(boardValidation.moveCardToDifferentColumn, boardController.moveCardToDifferentColumn);

export const boardRoute = router;
