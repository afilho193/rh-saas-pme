import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    req.companyId = decoded.companyId;
    // Tokens issued before roles existed carry no `role` claim — treat those as admin
    // (every user created before this change was created as admin anyway).
    req.role = decoded.role || 'admin';
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
