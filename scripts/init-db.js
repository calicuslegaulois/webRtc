#!/usr/bin/env node

/**
 * Script d'initialisation de la base de données
 * Crée des utilisateurs de test pour le développement
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

// Créer des utilisateurs de test
async function createTestUsers() {
  console.log('🚀 Initialisation de la base de données...');
  
  try {
    // Vérifier si l'utilisateur admin existe déjà
    const existingAdmin = await prisma.user.findUnique({
      where: { username: 'admin' }
    });

    if (existingAdmin) {
      console.log('✅ Utilisateur admin existe déjà');
      return;
    }

    // Créer l'utilisateur admin
    const adminPassword = await bcrypt.hash('password123', 10);
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@webrtc-visioconf.com',
        password: adminPassword,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User'
      }
    });
    
    // Créer l'utilisateur test
    const testPassword = await bcrypt.hash('password123', 10);
    const testUser = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'test@webrtc-visioconf.com',
        password: testPassword,
        role: 'user',
        firstName: 'Test',
        lastName: 'User'
      }
    });
    
    // Créer l'utilisateur demo
    const demoPassword = await bcrypt.hash('demo123', 10);
    const demo = await prisma.user.create({
      data: {
        username: 'demo',
        email: 'demo@webrtc-visioconf.com',
        password: demoPassword,
        role: 'user',
        firstName: 'Demo',
        lastName: 'User'
      }
    });
    
    console.log('✅ Utilisateurs créés avec succès:');
    console.log('   👤 admin / password123');
    console.log('   👤 testuser / password123');
    console.log('   👤 demo / demo123');
    
    // Tester la connexion
    console.log('\n🧪 Test de connexion...');
    const isValid = await bcrypt.compare('password123', admin.password);
    console.log(`   Connexion admin: ${isValid ? '✅' : '❌'}`);
    
    // Générer un token de test
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = jwt.sign(
      { userId: admin.id, username: admin.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log(`   Token JWT généré: ${token.substring(0, 20)}...`);
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter l'initialisation
createTestUsers().then(() => {
  console.log('\n🎉 Initialisation terminée !');
  console.log('Vous pouvez maintenant démarrer le serveur avec: npm run dev');
  process.exit(0);
});
