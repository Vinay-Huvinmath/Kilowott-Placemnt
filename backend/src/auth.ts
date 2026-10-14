import { Request, Response, NextFunction } from 'express';

const activeTokens = new Set<string>();

const HARDCODED_ADMIN = {
  username: 'admin',
  password: 'password',
  name: 'Govind Rao',
  storeRole: 'Chief Shopkeeper'
};

export function issueToken(): string {
  const token = 'pulse_tok_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  activeTokens.add(token);
  return token;
}

export function revokeToken(token: string): boolean {
  return activeTokens.delete(token);
}

export function isValidToken(token: string): boolean {
  return activeTokens.has(token);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!isValidToken(token)) {
    res.status(401).json({ error: 'Session expired. Sign in again.' });
    return;
  }

  next();
}

export function handleLogin(req: Request, res: Response) {
  const { username, password } = req.body || {};
  if (username === HARDCODED_ADMIN.username && password === HARDCODED_ADMIN.password) {
    const token = issueToken();
    res.json({
      token,
      user: {
        username: HARDCODED_ADMIN.username,
        name: HARDCODED_ADMIN.name,
        storeRole: HARDCODED_ADMIN.storeRole
      }
    });
    return;
  }

  res.status(401).json({ error: 'Invalid username or password' });
}

export function handleLogout(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    revokeToken(token);
  }
  res.json({ success: true });
}

export function handleMe(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!isValidToken(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.json({
    user: {
      username: HARDCODED_ADMIN.username,
      name: HARDCODED_ADMIN.name,
      storeRole: HARDCODED_ADMIN.storeRole
    }
  });
}
