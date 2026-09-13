import express, { Router } from "express";

import { boardRoute } from "src/routes/v1/board.route";
import { cardRoute } from "src/routes/v1/card.route";
import { columnRoute } from "src/routes/v1/column.route";
import { diagnosticsRoute } from "src/routes/v1/diagnostics.route";
import { invitationRoute } from "src/routes/v1/invitation.route";
import { systemRoute } from "src/routes/v1/system.route";
import { userRoute } from "src/routes/v1/user.route";

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

// System routes
router.use("/system", systemRoute);

// Diagnostics routes
router.use("/diagnostics", diagnosticsRoute);

export const APIs_V1 = router;
