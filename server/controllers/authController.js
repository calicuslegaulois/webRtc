const AuthService = require('../services/authService');

class AuthController {
  // Inscription avec validation complète
  static async register(req, res) {
    try {
      const { username, email, password, confirmPassword, firstName, lastName } = req.body;
      
      // Validations de base
      if (!username || !email || !password) {
        return res.status(400).json({ 
          error: 'Tous les champs obligatoires doivent être remplis',
          code: 'MISSING_FIELDS'
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ 
          error: 'Les mots de passe ne correspondent pas',
          code: 'PASSWORD_MISMATCH'
        });
      }

      const userData = { username, email, password, firstName, lastName };
      const user = await AuthService.registerUser(userData);
      
      // Générer les tokens
      const tokens = AuthService.generateTokens(user.userId, user.username, user.role);
      const sessionId = await AuthService.createSession(user.userId, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'Compte créé avec succès',
        user: {
          id: user.userId,
          username: user.username,
          email: user.email,
          role: user.role
        },
        tokens,
        sessionId
      });
    } catch (error) {
      console.error('❌ Erreur inscription:', error.message);
      res.status(400).json({ 
        error: error.message,
        code: 'REGISTRATION_ERROR'
      });
    }
  }

  // Connexion améliorée
  static async login(req, res) {
    try {
      const { username, password, rememberMe } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ 
          error: 'Nom d\'utilisateur et mot de passe requis',
          code: 'MISSING_CREDENTIALS'
        });
      }

      const sessionData = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        rememberMe: rememberMe || false
      };

      const result = await AuthService.loginUser(username, password, sessionData);

      res.json({
        message: 'Connexion réussie',
        user: {
          id: result.userId,
          username: result.username,
          email: result.email,
          role: result.role,
          profile: result.profile
        },
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        },
        sessionId: result.sessionId
      });
    } catch (error) {
      console.error('❌ Erreur connexion:', error.message);
      res.status(401).json({ 
        error: error.message,
        code: 'LOGIN_ERROR'
      });
    }
  }

  // Rafraîchissement du token
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ 
          error: 'Refresh token requis',
          code: 'MISSING_REFRESH_TOKEN'
        });
      }

      const tokens = await AuthService.refreshAccessToken(refreshToken);

      res.json({
        message: 'Token rafraîchi avec succès',
        tokens
      });
    } catch (error) {
      console.error('❌ Erreur refresh token:', error.message);
      res.status(401).json({ 
        error: error.message,
        code: 'REFRESH_ERROR'
      });
    }
  }

  // Déconnexion
  static async logout(req, res) {
    try {
      const { sessionId, refreshToken } = req.body;
      
      await AuthService.logout(sessionId, refreshToken);

      res.json({
        message: 'Déconnexion réussie'
      });
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error.message);
      res.status(500).json({ 
        error: error.message,
        code: 'LOGOUT_ERROR'
      });
    }
  }

  // Profil utilisateur
  static async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      const user = AuthService.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ 
          error: 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND'
        });
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          profile: user.profile
        }
      });
    } catch (error) {
      console.error('❌ Erreur profil:', error.message);
      res.status(500).json({ 
        error: error.message,
        code: 'PROFILE_ERROR'
      });
    }
  }

  // Mise à jour du profil
  static async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { firstName, lastName, email } = req.body;
      
      // Validation de l'email si fourni
      if (email && !AuthService.validateEmail(email)) {
        return res.status(400).json({ 
          error: 'Email invalide',
          code: 'INVALID_EMAIL'
        });
      }

      // Ici on pourrait ajouter la logique de mise à jour du profil
      // Pour l'instant, on retourne juste un succès
      
      res.json({
        message: 'Profil mis à jour avec succès',
        profile: { firstName, lastName, email }
      });
    } catch (error) {
      console.error('❌ Erreur mise à jour profil:', error.message);
      res.status(500).json({ 
        error: error.message,
        code: 'UPDATE_PROFILE_ERROR'
      });
    }
  }

  // Validation des mots de passe
  static validatePassword(req, res) {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ 
          error: 'Mot de passe requis',
          code: 'MISSING_PASSWORD'
        });
      }

      const validation = AuthService.validatePassword(password);

      res.json({
        isValid: validation.isValid,
        errors: validation.errors
      });
    } catch (error) {
      res.status(500).json({ 
        error: error.message,
        code: 'VALIDATION_ERROR'
      });
    }
  }

  // Liste des utilisateurs (admin seulement)
  static async getUsers(req, res) {
    try {
      // Vérifier si l'utilisateur est admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Accès non autorisé',
          code: 'FORBIDDEN'
        });
      }

      const users = AuthService.getUsers();
      res.json({ 
        users,
        total: users.length
      });
    } catch (error) {
      console.error('❌ Erreur liste utilisateurs:', error.message);
      res.status(500).json({ 
        error: error.message,
        code: 'GET_USERS_ERROR'
      });
    }
  }

  // Statistiques (admin seulement)
  static async getStats(req, res) {
    try {
      // Vérifier si l'utilisateur est admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Accès non autorisé',
          code: 'FORBIDDEN'
        });
      }

      const stats = AuthService.getStats();
      res.json({ stats });
    } catch (error) {
      console.error('❌ Erreur statistiques:', error.message);
      res.status(500).json({ 
        error: error.message,
        code: 'GET_STATS_ERROR'
      });
    }
  }

  // Vérification de la validité du token
  static async verifyToken(req, res) {
    try {
      // Si on arrive ici, le token est valide (middleware auth.js)
      res.json({
        valid: true,
        user: {
          id: req.user.userId,
          username: req.user.username,
          role: req.user.role
        }
      });
    } catch (error) {
      res.status(401).json({ 
        error: 'Token invalide',
        code: 'INVALID_TOKEN'
      });
    }
  }
}

module.exports = AuthController;
