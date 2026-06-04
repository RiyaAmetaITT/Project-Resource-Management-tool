import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middleware/authMiddleware';
import { UserRepository } from '../repositories/UserRepository';
import { AuthService } from '../services/AuthService';

const router = Router();
const authService = new AuthService(new UserRepository());
const authController = new AuthController(authService);

router.post('/login', authController.login);
router.put('/change-password', authMiddleware, authController.changePassword);

export default router;
