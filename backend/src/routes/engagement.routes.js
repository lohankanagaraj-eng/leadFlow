import { Router } from 'express';
import * as ctrl from '../controllers/call.controller.js';
import * as fu from '../controllers/followup.controller.js';
import { protect, authorize, permission } from '../middleware/auth.js';
import { validateBody, requireParam } from '../middleware/validate.js';
import { callSchema, followupSchema, followupUpdateSchema } from '../middleware/validators.js';

const router = Router();
router.use(protect);

// ---- call logs ----
router.get('/calls', permission('calls', 'read'), ctrl.list);
router.post('/calls', authorize('admin', 'employee'), permission('calls', 'create'), validateBody(callSchema), ctrl.create);
router.delete('/calls/:id', authorize('admin'), requireParam('id'), ctrl.remove);

// ---- follow-ups ----
router.get('/followups', permission('followups', 'read'), fu.list);
router.post('/followups', authorize('admin', 'employee'), permission('followups', 'create'), validateBody(followupSchema), fu.create);
router.put('/followups/:id', authorize('admin', 'employee'), permission('followups', 'update'), requireParam('id'), validateBody(followupUpdateSchema), fu.update);
router.delete('/followups/:id', authorize('admin'), requireParam('id'), fu.remove);

export default router;
