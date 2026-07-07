import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { stream } from "../controllers/sse.controller";

const router = Router();

// asyncHandler is intentionally omitted — SSE keeps the response open indefinitely,
// so there is no "return value" to wrap and any thrown error before flushHeaders
// is handled by Express's default error handler.
router.get("/stream", authenticate, stream);

export default router;
