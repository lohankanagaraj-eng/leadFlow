import { Router } from 'express';
import * as ctrl from '../controllers/employee.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateBody, requireParam } from '../middleware/validate.js';
import { employeeSchema } from '../middleware/validators.js';

const router = Router();
router.use(protect);

router.get('/performance', authorize('admin'), ctrl.performance);
router.get('/', authorize('admin'), ctrl.list);
router.get('/:id', authorize('admin'), requireParam('id'), ctrl.getOne);
router.post('/', authorize('admin'), validateBody(employeeSchema), ctrl.create);
router.put('/:id', authorize('admin'), requireParam('id'), validateBody(employeeSchema.partial()), ctrl.update);
router.delete('/:id', authorize('admin'), requireParam('id'), ctrl.remove);

export default router;
