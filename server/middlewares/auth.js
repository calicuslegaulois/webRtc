const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

// Middleware pour Socket.IO
const authenticateToken = (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return next(new Error('Token d\'authentification manquant'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Vérifier que c'est un token d'accès
    if (decoded.type !== 'access') {
      return next(new Error('Type de token invalide'));
    }

    socket.userId = decoded.userId;
    socket.username = decoded.username;
    socket.userRole = decoded.role;
    next();
  } catch (error) {
    return next(new Error('Token invalide ou expiré'));
  }
};

// Middleware pour Express (HTTP)
const authenticateHTTP = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Token d\'authentification manquant',
      code: 'NO_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Vérifier que c'est un token d'accès
    if (decoded.type !== 'access') {
      return res.status(401).json({ 
        error: 'Type de token invalide',
        code: 'INVALID_TOKEN_TYPE'
      });
    }

    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expiré',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Token invalide',
        code: 'INVALID_TOKEN'
      });
    } else {
      return res.status(401).json({ 
        error: 'Erreur d\'authentification',
        code: 'AUTH_ERROR'
      });
    }
  }
};

// Middleware pour vérifier les rôles
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentification requise',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Permissions insuffisantes',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

// Middleware optionnel (pour les routes publiques avec auth optionnelle)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type === 'access') {
      req.user = {
        userId: decoded.userId,
        username: decoded.username,
        role: decoded.role
      };
    }
  } catch (error) {
    // Ignorer les erreurs pour l'auth optionnelle
    req.user = null;
  }

  next();
};

// Middleware pour vérifier les sessions actives
const checkSession = (req, res, next) => {
  if (!req.user) {
    return next();
  }

  // Ici on pourrait vérifier si la session est encore active
  // Pour l'instant, on passe juste au suivant
  next();
};

module.exports = { 
  authenticateToken, 
  authenticateHTTP, 
  requireRole, 
  optionalAuth, 
  checkSession, 
  JWT_SECRET 
};
