import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/overview', ctrl.overview);
router.get('/admin', authorize('admin'), ctrl.adminDashboard);
router.get('/employee', authorize('employee', 'admin'), ctrl.employeeDashboard);
router.get('/developer', authorize('developer', 'admin'), ctrl.developerDashboard);

export default router;
