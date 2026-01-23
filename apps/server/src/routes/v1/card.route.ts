import express, { Router } from "express";
import { cardController } from "src/controllers/card.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { cardValidation } from "src/validations/card.validation";

const router: Router = express.Router();

router.route("/").post(authMiddleware.isAuthorized, cardValidation.createNew, cardController.createNew);

export const cardRoute = router;
