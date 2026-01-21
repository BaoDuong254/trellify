import express, { Router } from "express";
import { columnController } from "src/controllers/column.controller";
import { columnValidation } from "src/validations/column.validation";

const router: Router = express.Router();

router.route("/").post(columnValidation.createNew, columnController.createNew);
router.route("/:id").put(columnValidation.update, columnController.update);

export const columnRoute = router;
