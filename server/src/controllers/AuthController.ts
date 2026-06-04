import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { LoginDto, ChangePasswordDto } from '../dtos/auth.dto';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as LoginDto;
      const result = await this.authService.authenticate(dto);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { newPassword, confirmPassword } = req.body as ChangePasswordDto;
      const userId = req.user!.userId;
      await this.authService.changePassword(userId, newPassword, confirmPassword);
      res.status(200).json({ success: true, message: 'Password updated successfully.' });
    } catch (err) {
      next(err);
    }
  };
}
