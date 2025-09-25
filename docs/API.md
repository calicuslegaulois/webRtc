# Documentation API - WebRTC Visioconférence

## Vue d'ensemble

L'API REST de WebRTC Visioconférence fournit des endpoints pour la gestion des utilisateurs, des réunions, du chat, des enregistrements et des notifications.

**Base URL** : `http://localhost:3000/api`

**Authentification** : JWT Bearer Token

## Authentification

### POST /api/auth/register
Crée un nouveau compte utilisateur.

**Body** :
```json
{
  "username": "string",
  "password": "string"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Utilisateur créé avec succès",
  "token": "jwt-token",
  "user": {
    "id": "string",
    "username": "string",
    "createdAt": "datetime"
  }
}
```

### POST /api/auth/login
Connecte un utilisateur existant.

**Body** :
```json
{
  "username": "string",
  "password": "string"
}
```

**Réponse** :
```json
{
  "success": true,
  "message": "Connexion réussie",
  "token": "jwt-token",
  "user": {
    "id": "string",
    "username": "string",
    "createdAt": "datetime"
  }
}
```

## Réunions

### GET /api/meetings
Récupère la liste de toutes les réunions.

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "meetings": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "hostId": "string",
      "hostName": "string",
      "createdAt": "datetime",
      "participants": [],
      "settings": {
        "maxParticipants": 50,
        "allowScreenShare": true,
        "allowChat": true,
        "recording": false,
        "locked": false,
        "allowGuestJoin": true,
        "requireApproval": false,
        "qualitySettings": {
          "video": "auto",
          "audio": "high"
        },
        "layout": "grid"
      }
    }
  ]
}
```

### POST /api/meetings
Crée une nouvelle réunion.

**Headers** : `Authorization: Bearer <token>`

**Body** :
```json
{
  "title": "string",
  "description": "string",
  "settings": {
    "maxParticipants": 50,
    "allowScreenShare": true,
    "allowChat": true,
    "recording": false,
    "locked": false,
    "allowGuestJoin": true,
    "requireApproval": false,
    "qualitySettings": {
      "video": "auto",
      "audio": "high"
    },
    "layout": "grid"
  }
}
```

**Réponse** :
```json
{
  "meeting": {
    "id": "string",
    "title": "string",
    "description": "string",
    "hostId": "string",
    "hostName": "string",
    "createdAt": "datetime",
    "participants": [],
    "settings": {}
  }
}
```

### GET /api/meetings/:id
Récupère les détails d'une réunion spécifique.

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "meeting": {
    "id": "string",
    "title": "string",
    "description": "string",
    "hostId": "string",
    "hostName": "string",
    "createdAt": "datetime",
    "participants": [],
    "settings": {}
  }
}
```

### PUT /api/meetings/:id
Met à jour une réunion.

**Headers** : `Authorization: Bearer <token>`

**Body** :
```json
{
  "title": "string",
  "description": "string",
  "settings": {}
}
```

### DELETE /api/meetings/:id
Supprime une réunion.

**Headers** : `Authorization: Bearer <token>`

### GET /api/meetings/:id/participants
Récupère la liste des participants d'une réunion.

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "participants": [
    {
      "userId": "string",
      "username": "string",
      "isHost": true,
      "isConnected": true,
      "joinTime": "datetime"
    }
  ]
}
```

### GET /api/meetings/:id/participants/detailed
Récupère les informations détaillées des participants.

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "participants": [
    {
      "userId": "string",
      "username": "string",
      "isHost": true,
      "isConnected": true,
      "joinTime": "datetime",
      "lastActivity": "datetime",
      "connectionQuality": "high"
    }
  ]
}
```

### POST /api/meetings/:id/promote-host
Promouvoir un participant en hôte.

**Headers** : `Authorization: Bearer <token>`

**Body** :
```json
{
  "newHostId": "string"
}
```

### POST /api/meetings/:id/eject-participant
Éjecter un participant de la réunion.

**Headers** : `Authorization: Bearer <token>`

**Body** :
```json
{
  "participantId": "string",
  "reason": "string"
}
```

### POST /api/meetings/:id/quality-settings
Mettre à jour les paramètres de qualité.

**Headers** : `Authorization: Bearer <token>`

**Body** :
```json
{
  "video": "high|medium|low|auto",
  "audio": "high|medium|low"
}
```

### POST /api/meetings/:id/layout
Changer la mise en page de la réunion.

**Headers** : `Authorization: Bearer <token>`

**Body** :
```json
{
  "layout": "grid|speaker|gallery"
}
```

## Chat

### GET /api/meetings/:id/chat
Récupère l'historique du chat d'une réunion.

**Query Parameters** :
- `limit` : Nombre maximum de messages (défaut: 50)
- `since` : Récupérer les messages depuis cette date

**Réponse** :
```json
{
  "success": true,
  "messages": [
    {
      "id": "string",
      "userId": "string",
      "username": "string",
      "message": "string",
      "type": "text|system|reaction",
      "timestamp": "datetime",
      "reactions": {
        "👍": {
          "count": 3,
          "users": ["user1", "user2", "user3"]
        }
      }
    }
  ]
}
```

### GET /api/meetings/:id/chat/stats
Récupère les statistiques du chat.

**Réponse** :
```json
{
  "success": true,
  "stats": {
    "totalMessages": 150,
    "uniqueParticipants": 8,
    "messageTypes": {
      "text": 140,
      "system": 10
    },
    "raisedHandsCount": 2,
    "lastMessageTime": "datetime"
  }
}
```

### GET /api/meetings/:id/raised-hands
Récupère la liste des mains levées.

**Réponse** :
```json
{
  "success": true,
  "raisedHands": [
    {
      "userId": "string",
      "username": "string",
      "timestamp": "datetime"
    }
  ]
}
```

## Enregistrements

### POST /api/meetings/:id/recording/start
Démarrer l'enregistrement d'une réunion.

**Headers** : `Authorization: Bearer <token>`

**Body** :
```json
{
  "type": "audio|video|both"
}
```

**Réponse** :
```json
{
  "success": true,
  "recording": {
    "recordingId": "string",
    "meetingId": "string",
    "startedBy": "string",
    "startTime": "datetime",
    "type": "both"
  }
}
```

### POST /api/meetings/:id/recording/stop
Arrêter l'enregistrement d'une réunion.

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "success": true,
  "recording": {
    "recordingId": "string",
    "meetingId": "string",
    "startedBy": "string",
    "startTime": "datetime",
    "endTime": "datetime",
    "duration": 1800000,
    "fileSize": 52428800,
    "type": "both",
    "status": "completed"
  }
}
```

### GET /api/meetings/:id/recording
Récupère le statut de l'enregistrement actuel.

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "success": true,
  "recording": {
    "recordingId": "string",
    "meetingId": "string",
    "startedBy": "string",
    "startTime": "datetime",
    "type": "both",
    "status": "in-progress",
    "participants": ["user1", "user2"]
  }
}
```

### GET /api/meetings/:id/recordings
Récupère la liste des enregistrements d'une réunion.

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "success": true,
  "recordings": [
    {
      "recordingId": "string",
      "meetingId": "string",
      "startedBy": "string",
      "startTime": "datetime",
      "endTime": "datetime",
      "duration": 1800000,
      "fileSize": 52428800,
      "type": "both",
      "status": "completed"
    }
  ]
}
```

### GET /api/recordings
Récupère tous les enregistrements de l'utilisateur.

**Headers** : `Authorization: Bearer <token>`

**Query Parameters** :
- `limit` : Nombre maximum d'enregistrements
- `offset` : Décalage pour la pagination

### GET /api/recordings/stats
Récupère les statistiques des enregistrements.

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "success": true,
  "stats": {
    "totalRecordings": 25,
    "totalDuration": 7200000,
    "totalFileSize": 1073741824,
    "activeRecordings": 2
  }
}
```

### DELETE /api/recordings/:id
Supprime un enregistrement.

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "success": true,
  "message": "Enregistrement supprimé avec succès"
}
```

## Notifications

### GET /api/notifications
Récupère les notifications de l'utilisateur.

**Headers** : `Authorization: Bearer <token>`

**Query Parameters** :
- `limit` : Nombre maximum de notifications (défaut: 50)
- `unreadOnly` : Récupérer uniquement les notifications non lues (défaut: false)

**Réponse** :
```json
{
  "success": true,
  "notifications": [
    {
      "id": "string",
      "type": "meeting_invite|chat_message|recording_status|system",
      "title": "string",
      "message": "string",
      "data": {},
      "createdAt": "datetime",
      "read": false
    }
  ]
}
```

### PUT /api/notifications/:id/read
Marque une notification comme lue.

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "success": true,
  "message": "Notification marquée comme lue"
}
```

### PUT /api/notifications/read-all
Marque toutes les notifications comme lues.

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "success": true,
  "message": "X notifications marquées comme lues",
  "markedCount": 5
}
```

### DELETE /api/notifications/:id
Supprime une notification.

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "success": true,
  "message": "Notification supprimée"
}
```

### GET /api/notifications/unread-count
Récupère le nombre de notifications non lues.

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "success": true,
  "unreadCount": 3
}
```

### GET /api/notifications/stats
Récupère les statistiques des notifications (admin uniquement).

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "success": true,
  "stats": {
    "totalNotifications": 150,
    "totalUnread": 25,
    "typeCounts": {
      "meeting_invite": 50,
      "chat_message": 75,
      "recording_status": 20,
      "system": 5
    },
    "activeSubscriptions": 12
  }
}
```

## Statistiques

### GET /api/stats
Récupère les statistiques globales du système.

**Headers** : `Authorization: Bearer <token>`

**Réponse** :
```json
{
  "stats": {
    "totalMeetings": 25,
    "activeMeetings": 3,
    "totalUsers": 150,
    "totalParticipants": 450,
    "totalMessages": 1250,
    "totalRecordings": 45,
    "uptime": 86400000
  }
}
```

## Codes d'erreur

### Erreurs HTTP
- `400` : Bad Request - Données invalides
- `401` : Unauthorized - Token manquant ou invalide
- `403` : Forbidden - Accès non autorisé
- `404` : Not Found - Ressource non trouvée
- `409` : Conflict - Conflit (ex: utilisateur déjà existe)
- `500` : Internal Server Error - Erreur serveur

### Format des erreurs
```json
{
  "success": false,
  "error": "Message d'erreur détaillé",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Codes d'erreur spécifiques
- `USER_NOT_FOUND` : Utilisateur non trouvé
- `MEETING_NOT_FOUND` : Réunion non trouvée
- `INVALID_TOKEN` : Token JWT invalide
- `MEETING_FULL` : Réunion pleine
- `PERMISSION_DENIED` : Permissions insuffisantes
- `RECORDING_ACTIVE` : Enregistrement déjà en cours
- `CHAT_DISABLED` : Chat désactivé pour cette réunion

## Rate Limiting

L'API implémente un rate limiting pour protéger contre les abus :

- **Authentification** : 5 tentatives par minute par IP
- **Création de réunions** : 10 réunions par heure par utilisateur
- **Messages de chat** : 100 messages par minute par utilisateur
- **Notifications** : 50 requêtes par minute par utilisateur

## Webhooks (Futur)

Les webhooks permettront de recevoir des notifications en temps réel :

```json
{
  "event": "meeting.created|meeting.ended|recording.completed",
  "timestamp": "datetime",
  "data": {
    "meetingId": "string",
    "userId": "string",
    "details": {}
  }
}
```

## SDK et Bibliothèques

### JavaScript/TypeScript
```bash
npm install webrtc-visioconf-sdk
```

```javascript
import { WebRTCClient } from 'webrtc-visioconf-sdk';

const client = new WebRTCClient({
  apiUrl: 'http://localhost:3000/api',
  token: 'your-jwt-token'
});

// Créer une réunion
const meeting = await client.meetings.create({
  title: 'Ma réunion',
  description: 'Description'
});
```

### Python
```bash
pip install webrtc-visioconf-sdk
```

```python
from webrtc_visioconf import WebRTCClient

client = WebRTCClient(
    api_url='http://localhost:3000/api',
    token='your-jwt-token'
)

# Créer une réunion
meeting = client.meetings.create(
    title='Ma réunion',
    description='Description'
)
```

## Support et Contribution

- **Documentation** : Consultez les autres fichiers dans `/docs`
- **Issues** : Signalez les bugs sur GitHub
- **Contributions** : Les pull requests sont les bienvenues
- **Support** : Contactez l'équipe de développement
