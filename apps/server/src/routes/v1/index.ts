import express, { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { boardRoute } from "src/routes/v1/board.route";

const router: Router = express.Router();

// Health check route
router.get("/status", (_request, response) => {
  response.status(StatusCodes.OK).json({
    message: "API v1 is running",
    status: StatusCodes.OK,
  });
});

// Board routes
router.use("/boards", boardRoute);

export const APIs_V1 = router;
