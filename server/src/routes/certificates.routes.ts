import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import * as certificateController from "../controllers/certificate.controller";

const router = Router();

const issueCertificateSchema = z.object({ cohortId: z.string().min(1), courseCertificateId: z.string().min(1) });

router.get("/me", authenticate, asyncHandler(certificateController.listMine));
router.get("/eligibility", authenticate, asyncHandler(certificateController.eligibility));
router.post("/", authenticate, validate(issueCertificateSchema), asyncHandler(certificateController.issue));
router.get("/verify/:token", asyncHandler(certificateController.verify));

export default router;
