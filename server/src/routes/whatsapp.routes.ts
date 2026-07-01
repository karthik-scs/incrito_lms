import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import {
  updateWhatsAppSettingsSchema,
  createWhatsAppTemplateSchema,
  updateWhatsAppTemplateSchema,
  updateWhatsAppTemplateStatusSchema,
} from "../validators/whatsapp.validators";
import * as whatsappController from "../controllers/whatsapp.controller";

const router = Router();

router.get("/settings", authenticate, authorize("whatsapp:read"), asyncHandler(whatsappController.getSettings));
router.patch(
  "/settings",
  authenticate,
  authorize("whatsapp:write"),
  validate(updateWhatsAppSettingsSchema),
  asyncHandler(whatsappController.updateSettings)
);

router.get("/templates", authenticate, authorize("whatsapp:read"), asyncHandler(whatsappController.listTemplates));
router.post(
  "/templates",
  authenticate,
  authorize("whatsapp:write"),
  validate(createWhatsAppTemplateSchema),
  asyncHandler(whatsappController.createTemplate)
);
router.patch(
  "/templates/:id",
  authenticate,
  authorize("whatsapp:write"),
  validate(updateWhatsAppTemplateSchema),
  asyncHandler(whatsappController.updateTemplate)
);
router.patch(
  "/templates/:id/status",
  authenticate,
  authorize("whatsapp:write"),
  validate(updateWhatsAppTemplateStatusSchema),
  asyncHandler(whatsappController.updateTemplateStatus)
);
router.delete(
  "/templates/:id",
  authenticate,
  authorize("whatsapp:write"),
  asyncHandler(whatsappController.deleteTemplate)
);

export default router;
