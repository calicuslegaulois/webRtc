# WebRTC Visioconférence

Une plateforme de visioconférence moderne et sécurisée basée sur WebRTC, développée pour un projet de mémoire de fin d'année.

## 🚀 Fonctionnalités

### ✅ Implémentées
- **Authentification sécurisée** avec JWT et bcrypt
- **Gestion des réunions** avec création et participation
- **Communication WebRTC** peer-to-peer
- **Partage d'écran** en temps réel
- **Interface moderne** et responsive
- **Sécurité renforcée** avec Helmet et CORS
- **Tests unitaires** avec Jest
- **Déploiement Docker** prêt à l'emploi
- **Serveur TURN** pour la traversée NAT

### 🔄 En cours de développement
- Chat en temps réel
- Enregistrement des réunions
- Support multi-participants (plus de 2)
- Notifications push

## 🛠️ Technologies utilisées

### Backend
- **Node.js** (v18 LTS)
- **Express.js** - Framework web
- **Socket.IO** - Communication temps réel
- **JWT** - Authentification
- **bcrypt** - Chiffrement des mots de passe
- **Helmet** - Sécurité HTTP

### Frontend
- **HTML5** - Structure sémantique
- **CSS3** - Design moderne avec variables CSS
- **JavaScript ES6+** - Logique métier
- **WebRTC API** - Communication peer-to-peer

### Infrastructure
- **Docker** - Conteneurisation
- **Coturn** - Serveur TURN/STUN
- **Jest** - Tests unitaires
- **Supertest** - Tests d'API

## 📋 Prérequis

- Node.js 18+ 
- npm ou yarn
- Docker et Docker Compose (pour le déploiement)

## 🚀 Installation et démarrage

### 1. Installation des dépendances
```bash
npm install
```

### 2. Configuration des variables d'environnement
Créez un fichier `.env` à la racine du projet :
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=votre-secret-jwt-super-securise
```

### 3. Démarrage en mode développement
```bash
npm run dev
```

### 4. Démarrage en mode production
```bash
npm start
```

### 5. Lancement des tests
```bash
npm test
npm run test:watch
npm run test:coverage
```

## 🐳 Déploiement avec Docker

### Démarrage rapide
```bash
docker-compose up -d
```

### Build personnalisé
```bash
docker build -t webrtc-visioconf .
docker run -p 3000:3000 webrtc-visioconf
```

## 📱 Utilisation

### 1. Créer un compte
- Accédez à l'application
- Cliquez sur "S'inscrire"
- Entrez un nom d'utilisateur et un mot de passe

### 2. Se connecter
- Utilisez vos identifiants pour vous connecter
- Vous accédez à l'interface principale

### 3. Créer une réunion
- Cliquez sur "Nouvelle réunion"
- Entrez un titre
- La réunion est créée et vous en êtes l'hôte

### 4. Rejoindre une réunion
- Utilisez l'ID de réunion fourni
- Ou rejoignez une réunion existante depuis la liste

### 5. Démarrer la visioconférence
- Cliquez sur "Démarrer caméra"
- Autorisez l'accès à la caméra/microphone
- Utilisez "Partager l'écran" si nécessaire

## 🔒 Sécurité

### Authentification
- JWT avec expiration automatique
- Mots de passe hashés avec bcrypt
- Validation des entrées utilisateur

### Protection HTTP
- Helmet.js pour les en-têtes de sécurité
- CORS configuré
- Protection XSS et CSRF

### WebRTC
- Chiffrement SRTP/DTLS par défaut
- Serveur TURN sécurisé
- Validation des tokens avant connexion

## 🧪 Tests

### Tests unitaires
```bash
npm test
```

### Tests avec couverture
```bash
npm run test:coverage
```

### Tests en mode watch
```bash
npm run test:watch
```

## 📊 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/users` - Liste des utilisateurs

### Réunions
- `GET /api/meetings` - Réunions actives
- `GET /api/meetings/:id` - Détails d'une réunion
- `GET /api/meetings/:id/participants` - Participants
- `GET /api/stats` - Statistiques

## 🏗️ Architecture

```
webrtc-visioconf/
├── server/
│   ├── controllers/     # Contrôleurs API
│   ├── services/        # Logique métier
│   ├── middlewares/     # Middlewares (auth, sécurité)
│   ├── __tests__/       # Tests unitaires
│   └── index.js         # Point d'entrée serveur
├── public/
│   ├── index.html       # Interface utilisateur
│   ├── style.css        # Styles CSS
│   └── app.js           # Logique frontend
├── Dockerfile           # Configuration Docker
├── docker-compose.yml   # Orchestration Docker
└── package.json         # Dépendances et scripts
```

## 🔧 Configuration avancée

### Serveur TURN personnalisé
Modifiez `coturn.conf` pour configurer votre serveur TURN :
```conf
listening-port=3478
realm=votre-domaine.com
user=username:password
```

### Variables d'environnement Docker
```bash
export JWT_SECRET=votre-secret-jwt
export TURN_USERNAME=votre-username
export TURN_PASSWORD=votre-password
docker-compose up -d
```

## 🐛 Dépannage

### Problèmes courants

1. **Caméra non accessible**
   - Vérifiez les permissions du navigateur
   - Assurez-vous qu'aucune autre application n'utilise la caméra

2. **Connexion WebRTC échoue**
   - Vérifiez que le serveur TURN est accessible
   - Consultez les logs du serveur

3. **Erreur d'authentification**
   - Vérifiez la validité du token JWT
   - Redémarrez le serveur si nécessaire

### Logs
```bash
# Logs du serveur
docker logs webrtc-signal-server

# Logs du serveur TURN
docker logs webrtc-coturn
```

## 📈 Performance

### Optimisations WebRTC
- Utilisation de serveurs STUN/TURN optimisés
- Gestion intelligente des flux multimédias
- Compression des données de signalisation

### Scalabilité
- Architecture modulaire
- Gestion des salles par réunion
- Support de multiples réunions simultanées

## 🤝 Contribution

Ce projet est développé dans le cadre d'un mémoire de fin d'année. Les contributions sont les bienvenues !

### Guide de contribution
1. Fork le projet
2. Créez une branche pour votre fonctionnalité
3. Committez vos changements
4. Poussez vers la branche
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence ISC.

## 👨‍💻 Auteur

Développé dans le cadre d'un projet de mémoire de fin d'année sur les technologies WebRTC et la visioconférence décentralisée.

## 🙏 Remerciements

- WebRTC Working Group pour la spécification
- Socket.IO pour la communication temps réel
- La communauté open source pour les outils et bibliothèques

---

**Note** : Ce projet est une démonstration technique et ne doit pas être utilisé en production sans audit de sécurité approprié.
