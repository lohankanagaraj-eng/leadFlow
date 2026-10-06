import { Router } from 'express';
import * as ctrl from '../controllers/activity.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect, authorize('admin', 'employee'));
router.get('/', ctrl.list);

export default router;
