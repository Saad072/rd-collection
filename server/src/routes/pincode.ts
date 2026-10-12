import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validate';
import { ok } from '../utils/respond';
import { checkPincode } from '../services/pincode';

const router = Router();

/** GET /pincode/:code — delivery serviceability for a 6-digit pincode. */
router.get(
  '/:code',
  validateRequest({ params: z.object({ code: z.string().max(10) }) }),
  asyncHandler(async (req, res) => {
    res.json(ok(checkPincode(req.params.code)));
  }),
);

export default router;
