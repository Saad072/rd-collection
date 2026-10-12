import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateRequest } from '../middleware/validate';
import { ok, ApiError } from '../utils/respond';
import { NewsletterSubscriber } from '../models/Misc';

const router = Router();

/** POST /newsletter — subscribe. Duplicate email -> 409 with a friendly message. */
router.post(
  '/',
  validateRequest({
    body: z.object({ email: z.string().email('Please enter a valid email address.') }),
  }),
  asyncHandler(async (req, res) => {
    const email = (req.body.email as string).toLowerCase().trim();
    const existing = await NewsletterSubscriber.findOne({ email }).select('_id').lean();
    if (existing) {
      throw new ApiError(
        409,
        'ALREADY_SUBSCRIBED',
        'This email is already subscribed to our newsletter.',
      );
    }
    await NewsletterSubscriber.create({ email });
    res.status(201).json(ok({ subscribed: true, duplicate: false }));
  }),
);

export default router;
