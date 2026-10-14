import { Router, Request, Response } from 'express';
import { handleLogin, handleLogout, handleMe } from '../auth.js';

export const authRouter = Router();

authRouter.post('/login', handleLogin);
authRouter.post('/logout', handleLogout);
authRouter.get('/me', handleMe);
