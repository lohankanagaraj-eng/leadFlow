import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller.js';
import { protect } from '../middleware/auth.js';
import { requireParam } from '../middleware/validate.js';

const router = Router();
router.use(protect);

router.get('/', ctrl.list);
router.get('/unread', ctrl.unread);
router.post('/read-all', ctrl.readAll);
router.post('/:id/read', requireParam('id'), ctrl.readOne);

export default router;
