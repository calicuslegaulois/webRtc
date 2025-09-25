const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const db = require('../db/mysql');

class AuthService {
  /**
   * Hacher un mot de passe
   */
  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  /**
   * Vérifier un mot de passe
   */
  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Générer les tokens JWT
   */
  static generateTokens(userId, username, role) {
    const accessToken = jwt.sign(
      { userId, username, role, type: 'access' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, username, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Créer un token court pour la base de données
    const shortRefreshToken = 'rt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);

    return { accessToken, refreshToken: shortRefreshToken };
  }

  /**
   * Enregistrer un nouvel utilisateur
   */
  static async registerUser(userData) {
    // Vérifier que tous les champs requis sont présents
    if (!userData.password) {
      throw new Error('Mot de passe requis');
    }
    
    const hashedPassword = await this.hashPassword(userData.password);
    const userId = db.generateId();
    
    try {
      await db.insert('user', {
        id: userId,
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        role: 'user',
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        isActive: true,
        createdAt: new Date()
      });

      console.log(`✅ Nouvel utilisateur enregistré: ${userData.username} (${userData.email})`);
      return { userId, username: userData.username, email: userData.email, role: 'user' };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Nom d\'utilisateur ou email déjà utilisé');
      }
      throw error;
    }
  }

  /**
   * Connexion d'un utilisateur
   */
  static async loginUser(username, password, sessionData) {
    try {
      // Trouver l'utilisateur par nom d'utilisateur ou email
      const user = await db.queryOne(
        'SELECT * FROM `user` WHERE (username = ? OR email = ?) AND isActive = 1',
        [username, username]
      );

      if (!user) {
        throw new Error('Nom d\'utilisateur ou mot de passe incorrect');
      }

      const isValidPassword = await this.verifyPassword(password, user.password);
      if (!isValidPassword) {
        throw new Error('Nom d\'utilisateur ou mot de passe incorrect');
      }

      // Mettre à jour la dernière connexion
      await db.update('user', { lastLogin: new Date() }, 'id = ?', [user.id]);

      // Créer une session
      const sessionId = await this.createSession(user.id, sessionData);

      // Générer les tokens
      const tokens = this.generateTokens(user.id, user.username, user.role);

      // Sauvegarder le refresh token
      await db.insert('refreshtoken', {
        id: db.generateId(),
        token: tokens.refreshToken,
        userId: user.id,
        createdAt: new Date()
      });

      console.log(`🔐 Connexion réussie: ${username} (Session: ${sessionId})`);
      return {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        sessionId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        profile: {
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        },
      };
    } catch (error) {
      console.error('❌ Erreur de connexion:', error.message);
      throw error;
    }
  }

  /**
   * Créer une session utilisateur
   */
  static async createSession(userId, sessionData) {
    const sessionId = db.generateId();
    
    await db.insert('session', {
      id: sessionId,
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      ip: sessionData.ip || null,
      userAgent: sessionData.userAgent || null,
      rememberMe: sessionData.rememberMe || false
    });

    return sessionId;
  }

  /**
   * Rafraîchir un token d'accès
   */
  static async refreshAccessToken(refreshToken) {
    try {
      // Vérifier le refresh token dans la base de données
      const tokenRecord = await db.queryOne(
        'SELECT * FROM `refreshtoken` WHERE token = ?',
        [refreshToken]
      );

      if (!tokenRecord) {
        throw new Error('Refresh token invalide');
      }

      // Récupérer l'utilisateur
      const user = await db.findById('user', tokenRecord.userId);
      if (!user || !user.isActive) {
        throw new Error('Utilisateur non trouvé ou inactif');
      }

      // Générer un nouveau token d'accès
      const tokens = this.generateTokens(user.id, user.username, user.role);

      // Mettre à jour le refresh token
      await db.update('refreshtoken', {
        token: tokens.refreshToken,
        createdAt: new Date()
      }, 'id = ?', [tokenRecord.id]);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      console.error('❌ Erreur refresh token:', error.message);
      throw error;
    }
  }

  /**
   * Déconnexion
   */
  static async logout(sessionId, refreshToken) {
    if (sessionId) {
      await db.delete('session', 'id = ?', [sessionId]);
    }
    if (refreshToken) {
      await db.delete('refreshtoken', 'token = ?', [refreshToken]);
    }
    console.log(`🔓 Déconnexion: Session ${sessionId} fermée`);
  }

  /**
   * Supprimer une session
   */
  static async deleteSession(sessionId) {
    await db.delete('session', 'id = ?', [sessionId]);
  }

  /**
   * Obtenir la liste des utilisateurs
   */
  static async getUsers() {
    try {
      const users = await db.find('user', '1=1', [], 'createdAt DESC');
      return users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        profile: {
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        },
      }));
    } catch (error) {
      console.error('❌ Erreur getUsers:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir un utilisateur par ID
   */
  static async getUserById(userId) {
    try {
      const user = await db.findById('user', userId);
      if (!user) return null;

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        profile: {
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        },
      };
    } catch (error) {
      console.error('❌ Erreur getUserById:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir un utilisateur par nom d'utilisateur
   */
  static async getUserByUsername(username) {
    try {
      const user = await db.queryOne(
        'SELECT * FROM `user` WHERE username = ? AND isActive = 1',
        [username]
      );
      return user;
    } catch (error) {
      console.error('❌ Erreur getUserByUsername:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques
   */
  static async getStats() {
    try {
      const totalUsers = await db.count('user');
      const activeUsers = await db.count('user', 'isActive = 1');
      const totalSessions = await db.count('session');
      const totalMeetings = await db.count('meeting');
      const totalInstantMeetings = await db.count('instantmeeting');

      return {
        users: { total: totalUsers, active: activeUsers },
        sessions: totalSessions,
        meetings: { scheduled: totalMeetings, instant: totalInstantMeetings }
      };
    } catch (error) {
      console.error('❌ Erreur getStats:', error.message);
      throw error;
    }
  }
}

module.exports = AuthService;