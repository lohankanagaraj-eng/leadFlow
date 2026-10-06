import { Router } from 'express';
import * as ctrl from '../controllers/developer.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateBody, requireParam } from '../middleware/validate.js';
import { developerSchema, developerUpdateSchema } from '../middleware/validators.js';

const router = Router();
router.use(protect);

router.get('/skills', ctrl.skills);
router.get('/', ctrl.list);
router.get('/:id', requireParam('id'), ctrl.getOne);
router.post('/', authorize('admin'), validateBody(developerSchema), ctrl.create);
router.put('/:id', authorize('admin'), requireParam('id'), validateBody(developerUpdateSchema), ctrl.update);
router.delete('/:id', authorize('admin'), requireParam('id'), ctrl.remove);

export default router;
