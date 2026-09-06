import express, { Router } from "express";

import { cardController } from "src/controllers/card.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { multerMiddleware } from "src/middlewares/multer.middleware";
import { rateLimitMiddleware } from "src/middlewares/rate-limit.middleware";
import { cardValidation } from "src/validations/card.validation";

const router: Router = express.Router();

router
  .route("/")
  .post(authMiddleware.isAuthorized, rateLimitMiddleware.write, cardValidation.createNew, cardController.createNew);

router
  .route("/:id")
  .put(
    authMiddleware.isAuthorized,
    rateLimitMiddleware.write,
    multerMiddleware.upload.single("cardCover"),
    cardValidation.update,
    cardController.update
  )
  .delete(authMiddleware.isAuthorized, rateLimitMiddleware.write, cardValidation.deleteItem, cardController.deleteItem);

export const cardRoute = router;
