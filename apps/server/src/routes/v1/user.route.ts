import express, { Router } from "express";
import { userController } from "src/controllers/user.controller";
import { authMiddleware } from "src/middlewares/auth.middleware";
import { userValidation } from "src/validations/user.validation";

const router: Router = express.Router();

router.route("/register").post(userValidation.createNew, userController.createNew);

router.route("/verify").put(userValidation.verifyAccount, userController.verifyAccount);

router.route("/login").post(userValidation.login, userController.login);

router.route("/logout").delete(userController.logout);

router.route("/refresh_token").get(userController.refreshToken);

router.route("/update").put(authMiddleware.isAuthorized, userValidation.update, userController.update);

export const userRoute = router;
