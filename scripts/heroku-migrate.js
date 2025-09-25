#!/usr/bin/env node

/**
 * Script de migration pour Heroku
 * Crée les tables nécessaires sur JawsDB
 */

const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Configuration de la base de données
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    console.log('🌐 Configuration Heroku détectée');
    return {
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    };
  }
  
  console.log('🏠 Configuration locale détectée');
  return {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'webrtc_visioconf',
    ssl: false
  };
};

// Scripts SQL pour créer les tables
const createTablesSQL = [
  // Table des utilisateurs
  `CREATE TABLE IF NOT EXISTS \`user\` (
    \`id\` VARCHAR(36) PRIMARY KEY,
    \`username\` VARCHAR(50) UNIQUE NOT NULL,
    \`email\` VARCHAR(100) UNIQUE NOT NULL,
    \`password\` VARCHAR(255) NOT NULL,
    \`role\` ENUM('admin', 'user') DEFAULT 'user',
    \`firstName\` VARCHAR(50),
    \`lastName\` VARCHAR(50),
    \`avatar\` VARCHAR(255),
    \`isActive\` BOOLEAN DEFAULT TRUE,
    \`lastLogin\` DATETIME,
    \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Table des sessions
  `CREATE TABLE IF NOT EXISTS \`session\` (
    \`id\` VARCHAR(36) PRIMARY KEY,
    \`userId\` VARCHAR(36) NOT NULL,
    \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`lastActivity\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`ip\` VARCHAR(45),
    \`userAgent\` TEXT,
    \`rememberMe\` BOOLEAN DEFAULT FALSE,
    \`isActive\` BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Table des tokens de rafraîchissement
  `CREATE TABLE IF NOT EXISTS \`refreshtoken\` (
    \`id\` VARCHAR(36) PRIMARY KEY,
    \`token\` VARCHAR(255) UNIQUE NOT NULL,
    \`userId\` VARCHAR(36) NOT NULL,
    \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`expiresAt\` DATETIME NOT NULL,
    \`isActive\` BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Table des réunions programmées
  `CREATE TABLE IF NOT EXISTS \`meeting\` (
    \`id\` VARCHAR(36) PRIMARY KEY,
    \`ownerId\` VARCHAR(36) NOT NULL,
    \`title\` VARCHAR(200) NOT NULL,
    \`description\` TEXT,
    \`scheduledFor\` DATETIME NOT NULL,
    \`durationMin\` INT DEFAULT 60,
    \`password\` VARCHAR(50),
    \`status\` ENUM('scheduled', 'active', 'completed', 'cancelled') DEFAULT 'scheduled',
    \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (\`ownerId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Table des réunions instantanées
  `CREATE TABLE IF NOT EXISTS \`instantmeeting\` (
    \`id\` VARCHAR(36) PRIMARY KEY,
    \`title\` VARCHAR(200) NOT NULL,
    \`hostUsername\` VARCHAR(50) NOT NULL,
    \`createdAt\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    \`status\` ENUM('active', 'ended') DEFAULT 'active',
    \`participantCount\` INT DEFAULT 0
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  // Table des messages de chat
  `CREATE TABLE IF NOT EXISTS \`chatmessage\` (
    \`id\` VARCHAR(36) PRIMARY KEY,
    \`meetingId\` VARCHAR(36) NOT NULL,
    \`userId\` VARCHAR(36) NOT NULL,
    \`username\` VARCHAR(50) NOT NULL,
    \`message\` TEXT NOT NULL,
    \`type\` ENUM('text', 'image', 'file', 'system') DEFAULT 'text',
    \`timestamp\` DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (\`userId\`) REFERENCES \`user\`(\`id\`) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
];

// Données de test
const insertTestData = async (connection) => {
  try {
    console.log('📝 Insertion des données de test...');
    
    // Vérifier si l'utilisateur admin existe déjà
    const [existingAdmin] = await connection.execute(
      'SELECT id FROM `user` WHERE username = ?',
      ['admin']
    );
    
    if (existingAdmin.length === 0) {
      // Créer l'utilisateur admin
      const adminId = uuidv4();
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      await connection.execute(
        'INSERT INTO `user` (id, username, email, password, role, firstName, lastName, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [adminId, 'admin', 'admin@webrtc-visioconf.com', hashedPassword, 'admin', 'Admin', 'User', true]
      );
      
      console.log('✅ Utilisateur admin créé');
    } else {
      console.log('ℹ️ Utilisateur admin existe déjà');
    }
    
    console.log('✅ Données de test insérées');
  } catch (error) {
    console.error('❌ Erreur insertion données test:', error.message);
  }
};

// Fonction principale
async function migrate() {
  let connection;
  
  try {
    console.log('🚀 Démarrage de la migration Heroku...');
    
    const config = getDatabaseConfig();
    
    // Créer la connexion
    if (config.uri) {
      connection = await mysql.createConnection(config.uri);
    } else {
      connection = await mysql.createConnection(config);
    }
    
    console.log('🔌 Connexion à la base de données établie');
    
    // Créer les tables
    console.log('📋 Création des tables...');
    for (const sql of createTablesSQL) {
      await connection.execute(sql);
      console.log('✅ Table créée');
    }
    
    // Insérer les données de test
    await insertTestData(connection);
    
    console.log('🎉 Migration terminée avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connexion fermée');
    }
  }
}

// Exécuter la migration
if (require.main === module) {
  migrate();
}

module.exports = { migrate, createTablesSQL, insertTestData };
