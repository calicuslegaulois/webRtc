# Guide d'Installation - WebRTC Visioconférence

## Prérequis

### Système
- **Node.js** : Version 16.x ou supérieure
- **npm** : Version 8.x ou supérieure
- **Docker** : Version 20.x ou supérieure (optionnel)
- **Docker Compose** : Version 2.x ou supérieure (optionnel)

### Navigateurs supportés
- **Chrome/Chromium** : Version 88+
- **Firefox** : Version 85+
- **Safari** : Version 14+
- **Edge** : Version 88+

## Installation Locale

### 1. Cloner le projet
```bash
git clone <repository-url>
cd webrtc-visioconf
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configuration de l'environnement
Créer un fichier `.env` à la racine du projet :
```env
# Serveur
NODE_ENV=development
PORT=3000
HOST=localhost

# JWT
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Base de données (optionnel - pour persistance)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=webrtc_visioconf
DB_USER=postgres
DB_PASSWORD=password

# TURN/STUN Server (optionnel)
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=your-username
TURN_PASSWORD=your-password

# Enregistrements
RECORDINGS_PATH=./recordings
MAX_RECORDING_SIZE=500MB
RECORDING_RETENTION_DAYS=30

# Notifications
NOTIFICATION_RETENTION_DAYS=30
```

### 4. Démarrer le serveur
```bash
# Mode développement
npm run dev

# Mode production
npm start
```

Le serveur sera accessible sur `http://localhost:3000`

## Installation avec Docker

### 1. Construction de l'image
```bash
docker build -t webrtc-visioconf .
```

### 2. Exécution avec Docker Compose
```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter les services
docker-compose down
```

### 3. Configuration Docker Compose
Le fichier `docker-compose.yml` inclut :
- **Application Node.js** : Service principal
- **Nginx** : Reverse proxy et serveur de fichiers statiques
- **Coturn** : Serveur TURN/STUN pour NAT traversal

## Configuration Avancée

### Serveur TURN/STUN

Pour un déploiement en production, configurez un serveur TURN :

```bash
# Installation de Coturn
sudo apt-get install coturn

# Configuration dans /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
external-ip=YOUR_PUBLIC_IP
realm=your-domain.com
server-name=your-domain.com
user=webrtc:password123
```

### Base de données PostgreSQL (Optionnel)

Pour la persistance des données :

```bash
# Installation PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Création de la base de données
sudo -u postgres createdb webrtc_visioconf

# Configuration de l'utilisateur
sudo -u postgres psql
CREATE USER webrtc_user WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE webrtc_visioconf TO webrtc_user;
```

### Nginx Reverse Proxy

Configuration Nginx pour la production :

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serveur de fichiers statiques
    location /static/ {
        alias /path/to/webrtc-visioconf/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Sécurité

### Variables d'environnement sécurisées
- Utilisez des secrets forts pour `JWT_SECRET`
- Configurez des mots de passe sécurisés pour les services
- Limitez les accès réseau avec des firewalls

### Certificats SSL/TLS
```bash
# Génération de certificats auto-signés (développement)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Configuration HTTPS dans l'application
HTTPS=true
SSL_CERT_PATH=./cert.pem
SSL_KEY_PATH=./key.pem
```

### Firewall
```bash
# Configuration UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # Application (si accès direct)
sudo ufw enable
```

## Monitoring et Logs

### Logs applicatifs
```bash
# Configuration des logs dans l'application
LOG_LEVEL=info
LOG_FILE=./logs/app.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Rotation des logs avec PM2
npm install -g pm2
pm2 start server/index.js --name webrtc-app
pm2 install pm2-logrotate
```

### Monitoring système
```bash
# Installation de monitoring (optionnel)
npm install -g clinic
clinic doctor -- node server/index.js
```

## Dépannage

### Problèmes courants

#### Port déjà utilisé
```bash
# Trouver le processus utilisant le port
sudo lsof -i :3000
# Arrêter le processus
sudo kill -9 PID
```

#### Erreurs de permissions
```bash
# Donner les permissions d'écriture pour les enregistrements
sudo chown -R $USER:$USER ./recordings
chmod 755 ./recordings
```

#### Problèmes WebRTC
- Vérifiez que le navigateur supporte WebRTC
- Testez avec HTTPS en production
- Configurez un serveur TURN pour NAT traversal

#### Erreurs de mémoire
```bash
# Augmenter la limite de mémoire Node.js
node --max-old-space-size=4096 server/index.js
```

### Logs de débogage
```bash
# Activer les logs détaillés
DEBUG=* npm start

# Logs spécifiques aux WebRTC
DEBUG=webrtc* npm start
```

## Tests

### Tests unitaires
```bash
npm test
```

### Tests d'intégration
```bash
npm run test:integration
```

### Tests de performance
```bash
npm run test:performance
```

### Tests de charge
```bash
# Installation d'Artillery
npm install -g artillery

# Test de charge
artillery run tests/load-test.yml
```

## Mise à jour

### Mise à jour de l'application
```bash
# Sauvegarder la configuration
cp .env .env.backup

# Mettre à jour le code
git pull origin main

# Mettre à jour les dépendances
npm update

# Redémarrer l'application
npm restart
```

### Mise à jour Docker
```bash
# Reconstruire l'image
docker-compose build --no-cache

# Redémarrer les services
docker-compose up -d
```

## Support

Pour obtenir de l'aide :
1. Consultez la documentation complète dans `/docs`
2. Vérifiez les issues sur GitHub
3. Contactez l'équipe de développement

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.
