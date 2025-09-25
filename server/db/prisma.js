// Create PrismaClient singleton for the application
const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
	prisma = new PrismaClient();
} else {
	if (!global.__prisma) {
		global.__prisma = new PrismaClient();
	}
	prisma = global.__prisma;
}

// Vérifier que Prisma est bien initialisé
if (!prisma) {
	console.error('❌ Erreur: Prisma n\'est pas initialisé');
	process.exit(1);
}

module.exports = prisma;
