import express, { Router } from "express";
import { StatusCodes } from "http-status-codes";

const router: Router = express.Router();

router
  .route("/")
  .get((_request, response) => {
    response.status(StatusCodes.OK).json({
      message: "Board route is working",
      status: StatusCodes.OK,
    });
  })
  .post((_request, response) => {
    response.status(StatusCodes.CREATED).json({
      message: "Board created successfully",
      status: StatusCodes.CREATED,
    });
  });

export const boardRoute = router;
