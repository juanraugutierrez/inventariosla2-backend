
import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

export function requireRole(checkFn) {
  return (req, res, next) => {
    const role = req.user?.role || 'viewer';
    if (!checkFn(role)) return res.status(403).json({ error: 'Permisos insuficientes' });
    next();
  };
}
