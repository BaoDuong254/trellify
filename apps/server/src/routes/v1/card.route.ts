import express, { Router } from "express";
import { cardController } from "src/controllers/card.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { multerMiddleware } from "src/middlewares/multer.middleware";
import { cardValidation } from "src/validations/card.validation";

const router: Router = express.Router();

router.route("/").post(authMiddleware.isAuthorized, cardValidation.createNew, cardController.createNew);

router
  .route("/:id")
  .put(
    authMiddleware.isAuthorized,
    multerMiddleware.upload.single("cardCover"),
    cardValidation.update,
    cardController.update
  );

export const cardRoute = router;
