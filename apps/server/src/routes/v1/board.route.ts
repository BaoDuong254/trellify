import express, { Router } from "express";
import { StatusCodes } from "http-status-codes";
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
  .post(boardValidation.createNew);

export const boardRoute = router;
