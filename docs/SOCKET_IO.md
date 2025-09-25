# Documentation Socket.IO - WebRTC Visioconférence

## Vue d'ensemble

L'application utilise Socket.IO pour la communication en temps réel entre le serveur et les clients. Cette documentation décrit tous les événements disponibles.

**URL de connexion** : `http://localhost:3000`

**Authentification** : JWT Token via `auth.token`

## Connexion

### Connexion client
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Connecté au serveur');
});
```

### Événements de connexion
- `connect` : Connexion établie
- `disconnect` : Connexion fermée
- `error` : Erreur de connexion

## Authentification

### Événements émis par le client
```javascript
socket.emit('authenticate', {
  token: 'your-jwt-token'
});
```

### Événements reçus du serveur
```javascript
socket.on('authenticated', (user) => {
  console.log('Authentifié:', user);
});

socket.on('authentication-error', (error) => {
  console.error('Erreur d\'authentification:', error);
});
```

## Réunions

### Rejoindre une réunion
```javascript
socket.emit('join-meeting', {
  meetingId: 'meeting-id'
});

socket.on('meeting-joined', (data) => {
  console.log('Réunion rejointe:', data);
});

socket.on('join-error', (error) => {
  console.error('Erreur de connexion:', error);
});
```

### Quitter une réunion
```javascript
socket.emit('leave-meeting', {
  meetingId: 'meeting-id'
});

socket.on('meeting-left', (data) => {
  console.log('Réunion quittée:', data);
});
```

### Événements de participants
```javascript
// Participant rejoint
socket.on('participant-joined', (data) => {
  console.log('Nouveau participant:', data);
  // { userId, username, participantCount }
});

// Participant quitte
socket.on('participant-left', (data) => {
  console.log('Participant parti:', data);
  // { userId, username, participantCount }
});

// Liste des participants mise à jour
socket.on('participants-updated', (data) => {
  console.log('Participants:', data.participants);
});
```

### Gestion des salles d'attente
```javascript
// Demande d'approbation
socket.on('waiting-join', (data) => {
  console.log('Demande d\'approbation:', data);
  // { meetingId, socketId, userId, username }
});

// En attente d'approbation
socket.on('waiting-room', (data) => {
  console.log('En salle d\'attente:', data);
});

// Approuver un participant
socket.emit('approve-waiting', {
  meetingId: 'meeting-id',
  socketId: 'socket-id'
});

// Rejeter un participant
socket.emit('reject-waiting', {
  meetingId: 'meeting-id',
  socketId: 'socket-id',
  reason: 'Raison du refus'
});
```

## WebRTC - Communication P2P

### Événements de signalisation WebRTC
```javascript
// Offre WebRTC
socket.on('webrtc-offer', async (data) => {
  const { offer, from } = data;
  const peerConnection = new RTCPeerConnection();
  
  await peerConnection.setRemoteDescription(offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  
  socket.emit('webrtc-answer', {
    to: from,
    answer: answer
  });
});

// Réponse WebRTC
socket.on('webrtc-answer', async (data) => {
  const { answer, from } = data;
  await peerConnection.setRemoteDescription(answer);
});

// Candidats ICE
socket.on('webrtc-ice-candidate', async (data) => {
  const { candidate, from } = data;
  await peerConnection.addIceCandidate(candidate);
});

// Émettre des candidats ICE
socket.emit('webrtc-ice-candidate', {
  to: targetUserId,
  candidate: candidate
});
```

### Partage d'écran
```javascript
// Démarrer le partage d'écran
socket.emit('start-screen-share', {
  meetingId: 'meeting-id'
});

socket.on('screen-share-started', (data) => {
  console.log('Partage d\'écran démarré:', data);
});

// Arrêter le partage d'écran
socket.emit('stop-screen-share', {
  meetingId: 'meeting-id'
});

socket.on('screen-share-stopped', (data) => {
  console.log('Partage d\'écran arrêté:', data);
});
```

## Chat en temps réel

### Envoyer un message
```javascript
socket.emit('chat-message', {
  meetingId: 'meeting-id',
  text: 'Mon message',
  type: 'text' // text, system, reaction
});

socket.on('chat-message', (message) => {
  console.log('Nouveau message:', message);
  // { id, userId, username, message, type, timestamp, reactions }
});
```

### Réactions aux messages
```javascript
// Ajouter une réaction
socket.emit('chat-reaction', {
  meetingId: 'meeting-id',
  messageId: 'message-id',
  emoji: '👍'
});

socket.on('chat-reaction-added', (reaction) => {
  console.log('Réaction ajoutée:', reaction);
  // { messageId, emoji, count, users }
});

// Supprimer une réaction
socket.emit('chat-reaction-remove', {
  meetingId: 'meeting-id',
  messageId: 'message-id',
  emoji: '👍'
});

socket.on('chat-reaction-removed', (reaction) => {
  console.log('Réaction supprimée:', reaction);
});
```

### Mains levées
```javascript
// Lever la main
socket.emit('hand-raised', {
  meetingId: 'meeting-id'
});

socket.on('hand-raised', (data) => {
  console.log('Main levée:', data);
  // { userId, username, timestamp }
});

// Baisser la main
socket.emit('hand-lowered', {
  meetingId: 'meeting-id'
});

socket.on('hand-lowered', (data) => {
  console.log('Main baissée:', data);
  // { userId, username }
});

// Mise à jour des mains levées
socket.on('raised-hands-updated', (raisedHands) => {
  console.log('Mains levées:', raisedHands);
});
```

### Historique du chat
```javascript
// Charger l'historique
socket.emit('get-chat-history', {
  meetingId: 'meeting-id',
  limit: 50
});

socket.on('chat-history', (data) => {
  console.log('Historique du chat:', data.messages);
});
```

### Statistiques du chat
```javascript
socket.emit('get-chat-stats', {
  meetingId: 'meeting-id'
});

socket.on('chat-stats', (data) => {
  console.log('Statistiques du chat:', data.stats);
});
```

### Erreurs de chat
```javascript
socket.on('chat-error', (error) => {
  console.error('Erreur chat:', error.message);
});
```

## Enregistrements

### Démarrer l'enregistrement serveur
```javascript
socket.emit('start-recording', {
  meetingId: 'meeting-id',
  type: 'both' // audio, video, both
});

socket.on('recording-started', (data) => {
  console.log('Enregistrement démarré:', data);
  // { recordingId, meetingId, startedBy, type, startTime }
});
```

### Arrêter l'enregistrement serveur
```javascript
socket.emit('stop-recording', {
  meetingId: 'meeting-id'
});

socket.on('recording-stopped', (data) => {
  console.log('Enregistrement arrêté:', data);
  // { recordingId, meetingId, stoppedBy, endTime, duration, fileSize }
});
```

### Statut de l'enregistrement
```javascript
socket.emit('get-recording-status', {
  meetingId: 'meeting-id'
});

socket.on('recording-status', (data) => {
  console.log('Statut enregistrement:', data);
  // { recordingId, meetingId, status, startTime, type, participants }
});
```

### Envoyer des chunks d'enregistrement
```javascript
socket.emit('recording-chunk', {
  meetingId: 'meeting-id',
  chunk: audioVideoData,
  type: 'audio' // audio, video
});
```

### Erreurs d'enregistrement
```javascript
socket.on('recording-error', (error) => {
  console.error('Erreur enregistrement:', error.message);
});
```

## Notifications

### S'abonner aux notifications
```javascript
// Les notifications sont automatiquement activées lors de la connexion
socket.on('notification', (notification) => {
  console.log('Nouvelle notification:', notification);
  // { id, type, title, message, data, createdAt }
});
```

### Gérer les notifications
```javascript
// Récupérer les notifications
socket.emit('get-notifications', {
  limit: 50,
  unreadOnly: false
});

socket.on('notifications-list', (data) => {
  console.log('Liste des notifications:', data.notifications);
});

// Marquer comme lue
socket.emit('mark-notification-read', {
  notificationId: 'notification-id'
});

socket.on('notification-marked-read', (data) => {
  console.log('Notification marquée comme lue:', data.notificationId);
});

// Marquer toutes comme lues
socket.emit('mark-all-notifications-read');

socket.on('all-notifications-marked-read', (data) => {
  console.log('Notifications marquées comme lues:', data.markedCount);
});

// Supprimer une notification
socket.emit('delete-notification', {
  notificationId: 'notification-id'
});

socket.on('notification-deleted', (data) => {
  console.log('Notification supprimée:', data.notificationId);
});

// Compteur de notifications non lues
socket.on('unread-notifications-count', (data) => {
  console.log('Notifications non lues:', data.count);
});

// Demander le compteur
socket.emit('get-unread-count');
```

### Erreurs de notifications
```javascript
socket.on('notification-error', (error) => {
  console.error('Erreur notification:', error.error);
});
```

## Contrôles d'hôte

### Promotion d'hôte
```javascript
socket.emit('promote-to-host', {
  meetingId: 'meeting-id',
  newHostId: 'new-host-id'
});

socket.on('host-changed', (data) => {
  console.log('Hôte changé:', data);
  // { meetingId, oldHostId, newHostId, newHostName }
});
```

### Éjection de participants
```javascript
socket.emit('eject-participant', {
  meetingId: 'meeting-id',
  participantId: 'participant-id',
  reason: 'Raison de l\'éjection'
});

socket.on('participant-ejected', (data) => {
  console.log('Participant éjecté:', data);
  // { meetingId, participantId, reason }
});

socket.on('ejected', (data) => {
  console.log('Vous avez été éjecté:', data);
  // { meetingId, reason }
});
```

### Paramètres de qualité
```javascript
socket.emit('change-quality', {
  meetingId: 'meeting-id',
  video: 'high', // high, medium, low, auto
  audio: 'high'
});

socket.on('quality-changed', (data) => {
  console.log('Qualité changée:', data);
  // { meetingId, video, audio }
});
```

### Mise en page
```javascript
socket.emit('change-layout', {
  meetingId: 'meeting-id',
  layout: 'speaker' // grid, speaker, gallery
});

socket.on('layout-changed', (data) => {
  console.log('Mise en page changée:', data);
  // { meetingId, layout }
});
```

### Demandes de contrôle d'hôte
```javascript
// Demander le contrôle d'hôte
socket.emit('request-host-control', {
  meetingId: 'meeting-id'
});

socket.on('host-control-request', (data) => {
  console.log('Demande de contrôle:', data);
  // { meetingId, requesterId, requesterName }
});

// Répondre à la demande
socket.emit('respond-host-control', {
  meetingId: 'meeting-id',
  accepted: true
});

socket.on('host-control-response', (data) => {
  console.log('Réponse contrôle:', data);
  // { meetingId, accepted, requesterId }
});

socket.on('host-control-request-sent', (data) => {
  console.log('Demande envoyée:', data);
  // { meetingId, message }
});
```

## Contrôles audio/vidéo

### Microphone
```javascript
socket.emit('toggle-microphone', {
  meetingId: 'meeting-id',
  enabled: true
});

socket.on('microphone-toggled', (data) => {
  console.log('Microphone:', data);
  // { userId, enabled }
});
```

### Caméra
```javascript
socket.emit('toggle-camera', {
  meetingId: 'meeting-id',
  enabled: true
});

socket.on('camera-toggled', (data) => {
  console.log('Caméra:', data);
  // { userId, enabled }
});
```

## Gestion des erreurs

### Erreurs générales
```javascript
socket.on('error', (error) => {
  console.error('Erreur:', error.message);
});
```

### Reconnexion automatique
```javascript
socket.on('reconnect', (attemptNumber) => {
  console.log('Reconnexion automatique:', attemptNumber);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log('Tentative de reconnexion:', attemptNumber);
});

socket.on('reconnect_error', (error) => {
  console.error('Erreur de reconnexion:', error);
});

socket.on('reconnect_failed', () => {
  console.error('Échec de la reconnexion');
});
```

## Types de données

### Utilisateur
```typescript
interface User {
  id: string;
  username: string;
  createdAt: Date;
}
```

### Réunion
```typescript
interface Meeting {
  id: string;
  title: string;
  description: string;
  hostId: string;
  hostName: string;
  createdAt: Date;
  participants: Map<string, Participant>;
  settings: MeetingSettings;
}
```

### Participant
```typescript
interface Participant {
  userId: string;
  username: string;
  isHost: boolean;
  isConnected: boolean;
  joinTime: Date;
  lastActivity?: Date;
  connectionQuality?: string;
}
```

### Message de chat
```typescript
interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  type: 'text' | 'system' | 'reaction';
  timestamp: Date;
  reactions: Record<string, ReactionData>;
}

interface ReactionData {
  count: number;
  users: string[];
}
```

### Notification
```typescript
interface Notification {
  id: string;
  type: 'meeting_invite' | 'chat_message' | 'recording_status' | 'system';
  title: string;
  message: string;
  data: any;
  createdAt: Date;
  read: boolean;
}
```

## Bonnes pratiques

### Gestion de la connexion
```javascript
// Vérifier l'état de la connexion
if (socket.connected) {
  socket.emit('event', data);
} else {
  console.log('Socket non connecté');
}

// Gérer la reconnexion
socket.on('connect', () => {
  // Rejoindre automatiquement la réunion après reconnexion
  if (currentMeetingId) {
    socket.emit('join-meeting', { meetingId: currentMeetingId });
  }
});
```

### Gestion des erreurs
```javascript
// Wrapper pour les événements avec gestion d'erreur
function safeEmit(event, data, callback) {
  if (socket.connected) {
    socket.emit(event, data, callback);
  } else {
    console.error('Socket non connecté pour l\'événement:', event);
  }
}
```

### Nettoyage des ressources
```javascript
// Fermer les connexions WebRTC lors de la déconnexion
socket.on('disconnect', () => {
  peerConnections.forEach(pc => pc.close());
  peerConnections.clear();
});
```

## Debugging

### Activation des logs détaillés
```javascript
// Logs Socket.IO côté client
localStorage.debug = 'socket.io-client:*';

// Logs côté serveur
DEBUG=socket.io:* npm start
```

### Monitoring des événements
```javascript
// Logger tous les événements
socket.onAny((event, ...args) => {
  console.log('Event reçu:', event, args);
});

socket.onAnyOutgoing((event, ...args) => {
  console.log('Event envoyé:', event, args);
});
```
