import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema, registerSchema, changePasswordSchema } from '../middleware/validators.js';

const router = Router();

router.post('/login', validateBody(loginSchema), ctrl.login);
router.post('/register', protect, authorize('admin'), validateBody(registerSchema), ctrl.register);
router.get('/me', protect, ctrl.me);
router.put('/password', protect, validateBody(changePasswordSchema), ctrl.changePassword);

export default router;
