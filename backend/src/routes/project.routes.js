import { Router } from 'express';
import * as ctrl from '../controllers/project.controller.js';
import { protect, authorize, permission } from '../middleware/auth.js';
import { validateBody, requireParam } from '../middleware/validate.js';
import {
  projectSchema, projectStatusSchema, assignDevelopersSchema,
  taskSchema, taskUpdateSchema, projectUpdateSchema,
} from '../middleware/validators.js';
import { upload } from '../middleware/upload.js';

const router = Router();
router.use(protect);

router.get('/', permission('projects', 'read'), ctrl.list);
router.get('/:id', permission('projects', 'read'), requireParam('id'), ctrl.getOne);
router.get('/:id/history', permission('projects', 'read'), requireParam('id'), ctrl.history);

router.post('/', authorize('admin'), permission('projects', 'create'), validateBody(projectSchema), ctrl.create);
router.put('/:id', authorize('admin'), permission('projects', 'update'), requireParam('id'), validateBody(projectSchema.partial()), ctrl.update);
router.delete('/:id', authorize('admin'), permission('projects', 'delete'), requireParam('id'), ctrl.remove);

router.patch('/:id/status', authorize('admin'), requireParam('id'), validateBody(projectStatusSchema), ctrl.changeStatus);
router.patch('/:id/assign', authorize('admin'), requireParam('id'), validateBody(assignDevelopersSchema), ctrl.assignDevelopers);
router.delete('/:id/assign/:devId', authorize('admin'), requireParam('id'), ctrl.unassignDeveloper);
router.post('/:id/updates', permission('projects', 'update'), requireParam('id'), validateBody(projectUpdateSchema), ctrl.addUpdate);

router.post('/:id/tasks', authorize('admin', 'employee', 'developer'), requireParam('id'), validateBody(taskSchema), ctrl.addTask);
router.put('/tasks/:id', authorize('admin', 'employee', 'developer'), requireParam('id'), validateBody(taskUpdateSchema), ctrl.updateTask);
router.delete('/tasks/:id', authorize('admin'), requireParam('id'), ctrl.deleteTask);

router.post('/:id/documents', authorize('admin', 'employee', 'developer'), requireParam('id'), upload.single('file'), ctrl.uploadDocument);
router.delete('/documents/:id', authorize('admin'), requireParam('id'), ctrl.deleteDocument);

export default router;
