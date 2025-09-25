# 🚀 Déploiement sur Heroku

## Prérequis

1. **Compte Heroku** - Créez un compte sur [heroku.com](https://heroku.com)
2. **Heroku CLI** - Installez la CLI Heroku
3. **Git** - Pour pousser le code

## 📋 Étapes de déploiement

### 1. Préparer le projet

```bash
# S'assurer d'être dans le bon répertoire
cd webrtc-visioconf

# Vérifier que tout fonctionne localement
npm install
npm start
```

### 2. Créer l'application Heroku

```bash
# Se connecter à Heroku
heroku login

# Créer l'application
heroku create webrtc-visioconf-votre-nom

# Ajouter JawsDB (base de données MySQL)
heroku addons:create jawsdb:kitefin
```

### 3. Configurer les variables d'environnement

```bash
# Configurer le JWT secret
heroku config:set JWT_SECRET="votre-super-secret-jwt-key-tres-long-et-securise"

# Vérifier la configuration
heroku config
```

### 4. Déployer l'application

```bash
# Ajouter le remote Heroku
git remote add heroku https://git.heroku.com/webrtc-visioconf-votre-nom.git

# Pousser le code
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### 5. Vérifier le déploiement

```bash
# Voir les logs
heroku logs --tail

# Ouvrir l'application
heroku open
```

## 🔧 Configuration automatique

L'application se configure automatiquement :

- **Base de données** : JawsDB MySQL est automatiquement configuré
- **Migration** : Les tables sont créées automatiquement au déploiement
- **Utilisateur admin** : Créé automatiquement (admin/password123)

## 📊 Monitoring

```bash
# Voir les logs en temps réel
heroku logs --tail

# Voir les métriques
heroku ps

# Redémarrer l'application
heroku restart
```

## 🔒 Sécurité

- Changez le `JWT_SECRET` en production
- Changez le mot de passe admin après le premier déploiement
- Configurez HTTPS (automatique sur Heroku)

## 🐛 Dépannage

### Problème de base de données
```bash
# Vérifier la connexion à la base
heroku run node scripts/heroku-migrate.js
```

### Problème de port
```bash
# Vérifier que le port est correct
heroku config:get PORT
```

### Logs d'erreur
```bash
# Voir les logs détaillés
heroku logs --tail --source app
```

## 📱 URL de l'application

Une fois déployée, votre application sera disponible à :
`https://webrtc-visioconf-votre-nom.herokuapp.com`

## 🔄 Mises à jour

Pour mettre à jour l'application :

```bash
git add .
git commit -m "Update application"
git push heroku main
```
