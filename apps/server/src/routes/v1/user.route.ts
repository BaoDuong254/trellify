import express, { Router } from "express";
import { userController } from "src/controllers/user.controller";
import { userValidation } from "src/validations/user.validation";

const router: Router = express.Router();

router.route("/register").post(userValidation.createNew, userController.createNew);

router.route("/verify").put(userValidation.verifyAccount, userController.verifyAccount);

router.route("/login").post(userValidation.login, userController.login);

export const userRoute = router;
