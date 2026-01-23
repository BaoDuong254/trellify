import express, { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { boardRoute } from "src/routes/v1/board.route";
import { columnRoute } from "src/routes/v1/column.route";
import { cardRoute } from "src/routes/v1/card.route";
import { userRoute } from "src/routes/v1/user.route";

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

// Column routes
router.use("/columns", columnRoute);

// Card routes
router.use("/cards", cardRoute);

// User routes
router.use("/users", userRoute);

export const APIs_V1 = router;
