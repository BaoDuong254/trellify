import express, { Router } from "express";
import { systemController } from "src/controllers/system.controller";

const router: Router = express.Router();

router.route("/load-balancer").get(systemController.getLoadBalancerProbe);

export const systemRoute = router;
