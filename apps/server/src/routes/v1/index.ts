import express, { Router } from "express";
import { boardRoute } from "src/routes/v1/board.route";
import { columnRoute } from "src/routes/v1/column.route";
import { cardRoute } from "src/routes/v1/card.route";
import { userRoute } from "src/routes/v1/user.route";
import { invitationRoute } from "src/routes/v1/invitation.route";

const router: Router = express.Router();

// Board routes
router.use("/boards", boardRoute);

// Column routes
router.use("/columns", columnRoute);

// Card routes
router.use("/cards", cardRoute);

// User routes
router.use("/users", userRoute);

// Invitations routes
router.use("/invitations", invitationRoute);

export const APIs_V1 = router;
