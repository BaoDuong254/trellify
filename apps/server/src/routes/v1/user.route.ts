import express, { Router } from "express";
import { userController } from "src/controllers/user.controller";
import { userValidation } from "src/validations/user.validation";

const router: Router = express.Router();

router.route("/register").post(userValidation.createNew, userController.createNew);

export const userRoute = router;
