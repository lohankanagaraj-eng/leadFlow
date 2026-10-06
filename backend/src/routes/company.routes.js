import { Router } from 'express';
import * as ctrl from '../controllers/company.controller.js';
import { protect, authorize, permission } from '../middleware/auth.js';
import { validateBody, requireParam } from '../middleware/validate.js';
import { companySchema } from '../middleware/validators.js';

const router = Router();
router.use(protect);

router.get('/', permission('companies', 'read'), ctrl.list);
router.get('/:id', permission('companies', 'read'), requireParam('id'), ctrl.getOne);
router.post('/', authorize('admin'), permission('companies', 'create'), validateBody(companySchema), ctrl.create);
router.put('/:id', authorize('admin'), permission('companies', 'update'), requireParam('id'), validateBody(companySchema.partial()), ctrl.update);
router.delete('/:id', authorize('admin'), permission('companies', 'delete'), requireParam('id'), ctrl.remove);

export default router;
