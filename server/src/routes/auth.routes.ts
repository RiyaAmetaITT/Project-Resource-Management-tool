import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middleware/authMiddleware';
import { createAuthService } from '../bootstrap/createAuthService';

const router = Router();
const authController = new AuthController(createAuthService());

router.post('/login', authController.login);
router.put('/change-password', authMiddleware, authController.changePassword);

export default router;
