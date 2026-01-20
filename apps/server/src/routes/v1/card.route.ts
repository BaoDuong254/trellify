import express, { Router } from "express";
import { cardController } from "src/controllers/card.controller";
import { cardValidation } from "src/validations/card.validation";

const router: Router = express.Router();

router.route("/").post(cardValidation.createNew, cardController.createNew);

export const cardRoute = router;
