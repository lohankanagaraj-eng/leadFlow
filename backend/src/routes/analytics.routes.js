import { Router } from 'express';
import * as ctrl from '../controllers/analytics.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();
router.use(protect, authorize('admin'));

router.get('/config', ctrl.powerBiConfig);
router.get('/leads', ctrl.leadAnalytics);
router.get('/employees', ctrl.employeeAnalytics);
router.get('/calls', ctrl.callAnalytics);
router.get('/projects', ctrl.projectAnalytics);
router.get('/revenue', ctrl.revenueAnalytics);
router.get('/resources', ctrl.resourceAnalytics);

export default router;
