import express, { Router } from "express";
import { invitationController } from "src/controllers/invitation.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { invitationValidation } from "src/validations/invitation.validation";

const router: Router = express.Router();

router
  .route("/board")
  .post(
    authMiddleware.isAuthorized,
    invitationValidation.createNewBoardInvitation,
    invitationController.createNewBoardInvitation
  );

export const invitationRoute = router;
