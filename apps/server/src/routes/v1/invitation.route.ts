import express, { Router } from "express";

import { invitationController } from "src/controllers/invitation.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { rateLimitMiddleware } from "src/middlewares/rate-limit.middleware";
import { invitationValidation } from "src/validations/invitation.validation";

const router: Router = express.Router();

router
  .route("/board")
  .post(
    authMiddleware.isAuthorized,
    rateLimitMiddleware.invite,
    invitationValidation.createNewBoardInvitation,
    invitationController.createNewBoardInvitation
  );

router.route("/").get(authMiddleware.isAuthorized, invitationController.getInvitations);

router
  .route("/board/:invitationId")
  .put(
    authMiddleware.isAuthorized,
    rateLimitMiddleware.write,
    invitationValidation.updateBoardInvitation,
    invitationController.updateBoardInvitation
  );

export const invitationRoute = router;
