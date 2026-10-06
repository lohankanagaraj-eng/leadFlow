import { Router } from 'express';
import * as ctrl from '../controllers/lead.controller.js';
import { protect, authorize, permission } from '../middleware/auth.js';
import { validateBody, requireParam } from '../middleware/validate.js';
import { leadSchema, leadStatusSchema, assignLeadSchema } from '../middleware/validators.js';

const router = Router();
router.use(protect);

router.get('/', permission('leads', 'read'), ctrl.list);
router.get('/:id', permission('leads', 'read'), requireParam('id'), ctrl.getOne);
router.post('/', authorize('admin', 'employee'), permission('leads', 'create'), validateBody(leadSchema), ctrl.create);
router.put('/:id', authorize('admin', 'employee'), permission('leads', 'update'), requireParam('id'), validateBody(leadSchema.partial()), ctrl.update);
router.patch('/:id/status', authorize('admin', 'employee'), permission('leads', 'update'), requireParam('id'), validateBody(leadStatusSchema), ctrl.update);
router.patch('/:id/assign', authorize('admin'), permission('leads', 'manage'), requireParam('id'), validateBody(assignLeadSchema), ctrl.assign);
router.delete('/:id', authorize('admin'), permission('leads', 'delete'), requireParam('id'), ctrl.remove);

export default router;
