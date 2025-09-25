const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const helmet = require("helmet");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { authenticateToken, authenticateHTTP, requireRole } = require("./middlewares/auth");
const { JWT_SECRET } = require("./config");
const AuthController = require("./controllers/authController");
const MeetingService = require("./services/meetingService");
const AuthService = require("./services/authService");
const ChatService = require("./services/chatService");
const RecordingService = require("./services/recordingService");
const NotificationService = require("./services/notificationService");

// Configuration de l'environnement
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
console.log(`🌍 Environnement: ${process.env.NODE_ENV}`);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Instance du service de gestion des réunions
const meetingService = new MeetingService();
// Instance du service de chat
const chatService = new ChatService();
// Instance du service d'enregistrement
const recordingService = new RecordingService();
// Instance du service de notifications
const notificationService = new NotificationService();

// Suppression de la création automatique d'admin (environnement réel requis)

// Middleware de sécurité
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Routes de santé / test
app.get('/health', (req, res) => {
  console.log('🟢 Route /health appelée');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  console.log('🟢 Route / appelée');
  res.send('Hello from Railway!');
});

// Routes d'authentification
app.post("/api/auth/register", AuthController.register);
app.post("/api/auth/login", AuthController.login);
app.post("/api/auth/refresh", AuthController.refreshToken);
app.post("/api/auth/logout", AuthController.logout);
app.get("/api/auth/profile", authenticateHTTP, AuthController.getProfile);
app.put("/api/auth/profile", authenticateHTTP, AuthController.updateProfile);
app.post("/api/auth/validate-password", AuthController.validatePassword);
app.get("/api/auth/verify", authenticateHTTP, AuthController.verifyToken);
app.get("/api/auth/users", authenticateHTTP, requireRole('admin'), AuthController.getUsers);
app.get("/api/auth/stats", authenticateHTTP, requireRole('admin'), AuthController.getStats);

// Routes de gestion des réunions
app.post("/api/meetings", async (req, res) => {
  try {
    console.log('📝 Body reçu:', req.body);
    const { title, hostUsername } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Titre de réunion requis' });
    }

    const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const meeting = await meetingService.createMeeting(meetingId, { title, username: hostUsername || 'admin' });
    
    res.status(201).json({
      message: 'Réunion créée avec succès',
      meeting: {
        id: meeting.id,
        title: meeting.title,
        hostUsername: meeting.hostUsername,
        participantCount: meeting.participantCount,
        createdAt: meeting.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Erreur création réunion:', error);
    res.status(500).json({ error: error.message });
  }
});

// Planifier une réunion (nouvelle route DB)
app.post('/api/meetings/schedule', authenticateHTTP, async (req, res) => {
  try {
    const { title, description, scheduledFor, durationMin, password, options } = req.body;
    if (!title || !scheduledFor || !durationMin) {
      return res.status(400).json({ error: 'Champs requis manquants' });
    }
    const meeting = await meetingService.scheduleMeeting(req.user.userId, {
      title, description, scheduledFor, durationMin, password, options
    });
    res.status(201).json({ meeting });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mes réunions
app.get('/api/meetings/mine', authenticateHTTP, async (req, res) => {
  try {
    const scope = req.query.scope === 'past' ? 'past' : 'upcoming';
    const meetings = await meetingService.listMyMeetings(req.user.userId, scope);
    res.json({ meetings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Annuler / mettre à jour
app.put('/api/meetings/:id', authenticateHTTP, async (req, res) => {
  try {
    const updated = await meetingService.updateMeeting(req.user.userId, req.params.id, req.body);
    res.json({ meeting: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/meetings/:id', authenticateHTTP, async (req, res) => {
  try {
    const meeting = await meetingService.cancelMeeting(req.user.userId, req.params.id);
    res.json({ meeting });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mes enregistrements
app.get('/api/recordings/mine', authenticateHTTP, async (req, res) => {
  try {
    const recs = await meetingService.listMyRecordings(req.user.userId);
    res.json({ recordings: recs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/meetings", (req, res) => {
  try {
    const meetings = meetingService.getActiveMeetings();
    res.json({ meetings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/meetings/:id", (req, res) => {
  try {
    const meeting = meetingService.getMeeting(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Réunion non trouvée' });
    }
    res.json({ meeting });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/meetings/:id/participants", (req, res) => {
  try {
    const participants = meetingService.getMeetingParticipants(req.params.id);
    res.json({ participants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/meetings/:id/participants/detailed", (req, res) => {
  try {
    const participants = meetingService.getDetailedParticipants(req.params.id);
    res.json({ participants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/meetings/:id/promote-host", (req, res) => {
  try {
    const { currentHostId, newHostId } = req.body;
    const result = meetingService.promoteToHost(req.params.id, currentHostId, newHostId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/meetings/:id/eject-participant", (req, res) => {
  try {
    const { hostId, participantId } = req.body;
    const ejected = meetingService.ejectParticipant(req.params.id, hostId, participantId);
    res.json({ ejected, participantId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/meetings/:id/quality-settings", (req, res) => {
  try {
    const { qualitySettings } = req.body;
    const updated = meetingService.updateQualitySettings(req.params.id, qualitySettings);
    res.json({ qualitySettings: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/meetings/:id/layout", (req, res) => {
  try {
    const { layout } = req.body;
    const updated = meetingService.setLayout(req.params.id, layout);
    res.json({ layout: updated });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/stats", (req, res) => {
  try {
    const stats = meetingService.getStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes pour les notifications
app.get("/api/notifications", authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 50;
    const unreadOnly = req.query.unreadOnly === 'true';

    const notifications = notificationService.getUserNotifications(userId, limit, unreadOnly);
    res.json({ success: true, notifications });
  } catch (error) {
    console.error("Erreur lors de la récupération des notifications:", error);
    res.status(500).json({ success: false, error: "Erreur interne du serveur" });
  }
});

// Route pour marquer une notification comme lue
app.put("/api/notifications/:id/read", authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.id;

    const success = notificationService.markNotificationAsRead(userId, notificationId);
    if (success) {
      res.json({ success: true, message: "Notification marquée comme lue" });
    } else {
      res.status(404).json({ success: false, error: "Notification non trouvée" });
    }
  } catch (error) {
    console.error("Erreur lors du marquage de la notification:", error);
    res.status(500).json({ success: false, error: "Erreur interne du serveur" });
  }
});

// Route pour marquer toutes les notifications comme lues
app.put("/api/notifications/read-all", authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const markedCount = notificationService.markAllNotificationsAsRead(userId);
    
    res.json({ 
      success: true, 
      message: `${markedCount} notifications marquées comme lues`,
      markedCount 
    });
  } catch (error) {
    console.error("Erreur lors du marquage des notifications:", error);
    res.status(500).json({ success: false, error: "Erreur interne du serveur" });
  }
});

// Route pour supprimer une notification
app.delete("/api/notifications/:id", authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const notificationId = req.params.id;

    const success = notificationService.deleteNotification(userId, notificationId);
    if (success) {
      res.json({ success: true, message: "Notification supprimée" });
    } else {
      res.status(404).json({ success: false, error: "Notification non trouvée" });
    }
  } catch (error) {
    console.error("Erreur lors de la suppression de la notification:", error);
    res.status(500).json({ success: false, error: "Erreur interne du serveur" });
  }
});

// Route pour obtenir le nombre de notifications non lues
app.get("/api/notifications/unread-count", authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const unreadCount = notificationService.getUnreadNotificationCount(userId);
    
    res.json({ success: true, unreadCount });
  } catch (error) {
    console.error("Erreur lors du comptage des notifications:", error);
    res.status(500).json({ success: false, error: "Erreur interne du serveur" });
  }
});

// Route pour obtenir les statistiques des notifications (admin)
app.get("/api/notifications/stats", authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Vérifier si l'utilisateur est admin (simplifié)
    const user = AuthService.getUserById(userId);
    if (!user || user.username !== 'admin') {
      return res.status(403).json({ success: false, error: "Accès non autorisé" });
    }

    const stats = notificationService.getNotificationStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res.status(500).json({ success: false, error: "Erreur interne du serveur" });
  }
});

// Routes du chat
app.get("/api/meetings/:id/chat", (req, res) => {
  try {
    const { id: meetingId } = req.params;
    const { limit = 50, since } = req.query;
    
    const sinceDate = since ? new Date(since) : null;
    const messages = chatService.getMessages(meetingId, parseInt(limit), sinceDate);
    
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/meetings/:id/chat/stats", (req, res) => {
  try {
    const { id: meetingId } = req.params;
    const stats = chatService.getChatStats(meetingId);
    
    if (!stats) {
      return res.status(404).json({ error: 'Chat non trouvé pour cette réunion' });
    }
    
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/meetings/:id/raised-hands", (req, res) => {
  try {
    const { id: meetingId } = req.params;
    const raisedHands = chatService.getRaisedHands(meetingId);
    
    res.json({ raisedHands });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes d'enregistrement
app.post("/api/meetings/:id/recording/start", async (req, res) => {
  try {
    const { id: meetingId } = req.params;
    const { userId, type = 'both' } = req.body;
    
    const recording = await recordingService.startRecording(meetingId, userId, type);
    res.status(201).json(recording);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/meetings/:id/recording/stop", async (req, res) => {
  try {
    const { id: meetingId } = req.params;
    const { userId } = req.body;
    
    const result = await recordingService.stopRecording(meetingId, userId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/api/meetings/:id/recording", (req, res) => {
  try {
    const { id: meetingId } = req.params;
    const recording = recordingService.getActiveRecording(meetingId);
    
    res.json({ recording });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/meetings/:id/recordings", async (req, res) => {
  try {
    const { id: meetingId } = req.params;
    const recordings = await recordingService.getRecordingsForMeeting(meetingId);
    
    res.json({ recordings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/recordings", async (req, res) => {
  try {
    const recordings = await recordingService.getAllRecordings();
    res.json({ recordings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/recordings/stats", async (req, res) => {
  try {
    const stats = await recordingService.getRecordingStats();
    res.json({ stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/recordings/:id", async (req, res) => {
  try {
    const { id: recordingId } = req.params;
    const deleted = await recordingService.deleteRecording(recordingId);
    
    if (deleted) {
      res.json({ message: 'Enregistrement supprimé avec succès' });
    } else {
      res.status(404).json({ error: 'Enregistrement non trouvé' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware d'authentification pour Socket.IO
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      console.log('❌ Connexion rejetée: Token manquant');
      return next(new Error('Token d\'authentification manquant'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      console.log(`✅ Utilisateur authentifié: ${socket.username} (ID: ${socket.userId})`);
      next();
    } catch (error) {
      console.log('❌ Connexion rejetée: Token invalide');
      return next(new Error('Token invalide'));
    }
  } catch (error) {
    console.log('❌ Erreur d\'authentification:', error.message);
    return next(error);
  }
});

// Gestion des connexions WebSocket authentifiées
io.on("connection", (socket) => {
  console.log(`Utilisateur connecté: ${socket.username} (ID: ${socket.userId})`);
  
  // Gestion des réunions
  socket.on("create-meeting", async ({ title, meetingId, username }) => {
    try {
      const finalMeetingId = meetingId || `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const meeting = await meetingService.createMeeting(finalMeetingId, { title, username: username || socket.username });
      
      // Initialiser le chat pour cette réunion
      await chatService.initializeChat(finalMeetingId, [socket.userId]);
      await chatService.addParticipant(finalMeetingId, socket.userId);
      
      // Rejoindre la salle de la réunion
      socket.join(finalMeetingId);
      
      socket.emit("meeting-created", { meeting, meetingId: finalMeetingId });
      console.log(`Réunion créée: ${finalMeetingId} par ${username || socket.username}`);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("join-meeting", async ({ meetingId, username }) => {
    try {
      const meeting = await meetingService.getMeeting(meetingId);
      if (!meeting) throw new Error('Réunion non trouvée');
      
      // Rejoindre la réunion
      const { meeting: updatedMeeting, participant } = await meetingService.joinMeeting(meetingId, { 
        username: username || socket.username, 
        userId: socket.userId 
      });
      
      // S'abonner aux notifications
      notificationService.subscribeToNotifications(socket.userId, socket.id);
      
      // Rejoindre la salle de la réunion
      socket.join(meetingId);
      
      // Ajouter au chat
      await chatService.addParticipant(meetingId, socket.userId);
      
      // Notifier les autres participants
      socket.to(meetingId).emit('participant-joined', {
        userId: socket.userId,
        username: username || socket.username,
        participant
      });
      
      // Confirmer la connexion
      socket.emit("meeting-joined", { meeting: updatedMeeting, meetingId });
      console.log(`${username || socket.username} a rejoint la réunion ${meetingId}`);
      
      // Envoyer les notifications non lues
      const unreadCount = notificationService.getUnreadNotificationCount(socket.userId);
      socket.emit("unread-notifications-count", { count: unreadCount });
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("get-participants", async ({ meetingId }) => {
    try {
      const participants = await meetingService.listMeetingParticipants(meetingId);
      socket.emit("participants-list", participants);
      console.log(`📋 Liste des participants envoyée pour la réunion ${meetingId}:`, participants.length);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  socket.on('approve-waiting', ({ meetingId, socketId }) => {
    try {
      const meeting = meetingService.getMeeting(meetingId);
      if (!meeting) throw new Error('Réunion non trouvée');
      if (socket.userId !== meeting.hostId) throw new Error('Seul l\'hôte peut approuver');
      const info = meetingService.approveFromWaiting(meetingId, socketId);
      if (info) {
        const result = meetingService.joinMeeting(meetingId, info.userId, info.username);
        const peerSocket = io.sockets.sockets.get(socketId);
        if (peerSocket) {
          peerSocket.join(meetingId);
          peerSocket.emit('meeting-joined', result);
          peerSocket.to(meetingId).emit('participant-joined', { userId: info.userId, username: info.username, participantCount: result.participantCount });
        }
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('set-locked', ({ meetingId, locked }) => {
    try {
      const meeting = meetingService.getMeeting(meetingId);
      if (!meeting) throw new Error('Réunion non trouvée');
      if (socket.userId !== meeting.hostId) throw new Error('Seul l\'hôte peut verrouiller');
      const state = meetingService.setLocked(meetingId, !!locked);
      io.to(meetingId).emit('locked-updated', { meetingId, locked: state });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on("leave-meeting", async ({ meetingId }) => {
    try {
      const result = await meetingService.removeParticipant(meetingId, socket.userId);
      
      // Retirer du chat
      await chatService.removeParticipant(meetingId, socket.userId);
      
      // Retirer de l'enregistrement
      recordingService.removeParticipantFromRecording(meetingId, socket.userId);
      
      // Quitter la salle de la réunion
      socket.leave(meetingId);
      
      // Notifier les autres participants
      socket.to(meetingId).emit("participant-left", {
        userId: socket.userId,
        username: socket.username,
        participantCount: result ? result.participantCount : 0
      });
      
      if (result && result.closed) {
        // Fermer le chat de la réunion
        await chatService.closeChat(meetingId);
        socket.to(meetingId).emit("meeting-closed", { meetingId });
        console.log(`Réunion ${meetingId} fermée`);
      }
      
      console.log(`${socket.username} a quitté la réunion ${meetingId}`);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  // Gestion de l'événement de départ d'utilisateur avec notification
  socket.on("user-left-meeting", ({ meetingId, userId, username, message }) => {
    try {
      console.log(`👋 ${username} a quitté la réunion ${meetingId}`);
      
      // Diffuser la notification à tous les participants de la réunion
      socket.to(meetingId).emit("user-left-meeting", {
        meetingId,
        userId,
        username,
        message,
        timestamp: new Date()
      });
      
      console.log(`📢 Notification de départ diffusée pour ${username}`);
    } catch (error) {
      console.error('❌ Erreur lors de la diffusion du départ:', error);
      socket.emit("error", { message: error.message });
    }
  });

  // Qui est en ligne dans la salle ?
  socket.on("who-is-online", ({ meetingId }) => {
    const room = meetingId || 'general';
    const peers = Array.from(io.sockets.adapter.rooms.get(room) || [])
      .filter(id => id !== socket.id);
    socket.emit("online-peers", peers);
  });

  // Notifier l'autre qu'on veut l'appeler
  socket.on("call", ({ to, meetingId }) => socket.to(to).emit("incoming-call", { 
    from: socket.id,
    username: socket.username,
    meetingId
  }));

  // Relais Offer/Answer/ICE
  socket.on("offer", (p) => io.to(p.to).emit("offer", { ...p, from: socket.id }));
  socket.on("answer", (p) => io.to(p.to).emit("answer", { ...p, from: socket.id }));
  socket.on("ice-candidate", (p) => io.to(p.to).emit("ice-candidate", { ...p, from: socket.id }));

  // Chat & Reactions - Version améliorée
  socket.on("chat-message", ({ meetingId, text, type = 'text' }) => {
    try {
      const message = chatService.sendMessage(meetingId, socket.userId, socket.username, text, type);
      
      // Diffuser le message à tous les participants de la réunion
      io.to(meetingId).emit("chat-message", {
        id: message.id,
        userId: socket.userId,
        username: socket.username,
        message: message.message,
        type: message.type,
        timestamp: message.timestamp,
        reactions: message.reactions
      });
      
      // Envoyer des notifications aux participants qui ne sont pas dans le chat
      const meeting = meetingService.getMeeting(meetingId);
      if (meeting) {
        const participantIds = Array.from(meeting.participants.keys()).filter(id => id !== socket.userId);
        if (participantIds.length > 0) {
          notificationService.sendChatNotification(
            io,
            meetingId,
            socket.userId,
            socket.username,
            text,
            participantIds
          );
        }
      }
      
      console.log(`💬 Message chat envoyé par ${socket.username} dans ${meetingId}`);
    } catch (error) {
      socket.emit("chat-error", { message: error.message });
    }
  });

  socket.on("chat-reaction", ({ meetingId, messageId, emoji }) => {
    try {
      const reaction = chatService.addReaction(meetingId, messageId, socket.userId, emoji);
      
      // Diffuser la réaction à tous les participants
      io.to(meetingId).emit("chat-reaction-added", {
        messageId: reaction.messageId,
        emoji: reaction.emoji,
        count: reaction.count,
        users: reaction.users
      });
      
      console.log(`😊 Réaction ${emoji} ajoutée par ${socket.username} au message ${messageId}`);
    } catch (error) {
      socket.emit("chat-error", { message: error.message });
    }
  });

  socket.on("chat-reaction-remove", ({ meetingId, messageId, emoji }) => {
    try {
      const reaction = chatService.removeReaction(meetingId, messageId, socket.userId, emoji);
      
      if (reaction) {
        // Diffuser la mise à jour de la réaction
        io.to(meetingId).emit("chat-reaction-removed", {
          messageId: reaction.messageId,
          emoji: reaction.emoji,
          count: reaction.count,
          users: reaction.users
        });
      }
      
      console.log(`😊 Réaction ${emoji} retirée par ${socket.username} du message ${messageId}`);
    } catch (error) {
      socket.emit("chat-error", { message: error.message });
    }
  });

  socket.on("hand-raised", ({ meetingId }) => {
    try {
      const wasRaised = chatService.raiseHand(meetingId, socket.userId, socket.username);
      
      if (wasRaised) {
        // Diffuser à tous les participants
        io.to(meetingId).emit("hand-raised", {
          userId: socket.userId,
          username: socket.username,
          timestamp: new Date()
        });
        
        // Envoyer la liste mise à jour des mains levées
        const raisedHands = chatService.getRaisedHands(meetingId);
        io.to(meetingId).emit("raised-hands-updated", { raisedHands });
      }
    } catch (error) {
      socket.emit("chat-error", { message: error.message });
    }
  });

  socket.on("hand-lowered", ({ meetingId }) => {
    try {
      const wasLowered = chatService.lowerHand(meetingId, socket.userId, socket.username);
      
      if (wasLowered) {
        // Diffuser à tous les participants
        io.to(meetingId).emit("hand-lowered", {
          userId: socket.userId,
          username: socket.username,
          timestamp: new Date()
        });
        
        // Envoyer la liste mise à jour des mains levées
        const raisedHands = chatService.getRaisedHands(meetingId);
        io.to(meetingId).emit("raised-hands-updated", { raisedHands });
      }
    } catch (error) {
      socket.emit("chat-error", { message: error.message });
    }
  });

  // Demander l'historique du chat
  socket.on("get-chat-history", ({ meetingId, limit = 50, since }) => {
    try {
      const sinceDate = since ? new Date(since) : null;
      const messages = chatService.getMessages(meetingId, limit, sinceDate);
      
      socket.emit("chat-history", {
        meetingId,
        messages,
        hasMore: messages.length === limit
      });
    } catch (error) {
      socket.emit("chat-error", { message: error.message });
    }
  });

  // Demander les statistiques du chat
  socket.on("get-chat-stats", ({ meetingId }) => {
    try {
      const stats = chatService.getChatStats(meetingId);
      
      if (stats) {
        socket.emit("chat-stats", {
          meetingId,
          stats
        });
      } else {
        socket.emit("chat-error", { message: "Chat non trouvé" });
      }
    } catch (error) {
      socket.emit("chat-error", { message: error.message });
    }
  });

  // Événements d'enregistrement
  socket.on("start-recording", async ({ meetingId, type = 'both' }) => {
    try {
      const recording = await recordingService.startRecording(meetingId, socket.userId, type);
      
      // Notifier tous les participants de la réunion
      io.to(meetingId).emit("recording-started", {
        recordingId: recording.recordingId,
        meetingId,
        startedBy: socket.username,
        type: recording.type,
        startTime: recording.startTime
      });
      
      console.log(`🎬 Enregistrement démarré par ${socket.username} dans ${meetingId}`);
    } catch (error) {
      socket.emit("recording-error", { message: error.message });
    }
  });

  socket.on("stop-recording", async ({ meetingId }) => {
    try {
      const result = await recordingService.stopRecording(meetingId, socket.userId);
      
      // Notifier tous les participants de la réunion
      io.to(meetingId).emit("recording-stopped", {
        recordingId: result.recordingId,
        meetingId,
        stoppedBy: socket.username,
        endTime: result.endTime,
        duration: result.duration,
        filePath: result.filePath,
        fileSize: result.fileSize
      });
      
      console.log(`⏹️ Enregistrement arrêté par ${socket.username} dans ${meetingId}`);
    } catch (error) {
      socket.emit("recording-error", { message: error.message });
    }
  });

  socket.on("get-recording-status", ({ meetingId }) => {
    try {
      const recording = recordingService.getActiveRecording(meetingId);
      
      socket.emit("recording-status", {
        meetingId,
        isRecording: !!recording,
        recording
      });
    } catch (error) {
      socket.emit("recording-error", { message: error.message });
    }
  });

  socket.on("recording-chunk", ({ meetingId, chunk, type = 'audio' }) => {
    try {
      // Convertir le chunk base64 en Buffer
      const buffer = Buffer.from(chunk, 'base64');
      recordingService.addRecordingChunk(meetingId, buffer, type);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du chunk d\'enregistrement:', error);
    }
  });

  // Gestion des événements de partage d'écran
  socket.on('screen-share-started', (data) => {
    try {
      console.log(`🖥️ Partage d'écran démarré par ${data.username} dans ${data.meetingId}`);
      
      // Notifier tous les autres participants de la réunion
      socket.to(data.meetingId).emit('screen-share-started', {
        userId: data.userId,
        username: data.username,
        meetingId: data.meetingId
      });
    } catch (error) {
      console.error('Erreur lors du démarrage du partage d\'écran:', error);
      socket.emit('error', { message: 'Erreur lors du démarrage du partage d\'écran' });
    }
  });

  socket.on('screen-share-stopped', (data) => {
    try {
      console.log(`🖥️ Partage d'écran arrêté par ${data.username} dans ${data.meetingId}`);
      
      // Notifier tous les autres participants de la réunion
      socket.to(data.meetingId).emit('screen-share-stopped', {
        userId: data.userId,
        username: data.username,
        meetingId: data.meetingId
      });
    } catch (error) {
      console.error('Erreur lors de l\'arrêt du partage d\'écran:', error);
      socket.emit('error', { message: 'Erreur lors de l\'arrêt du partage d\'écran' });
    }
  });

  socket.on('screen-share-paused', (data) => {
    try {
      console.log(`⏸️ Partage d'écran en pause par ${data.username} dans ${data.meetingId}`);
      
      // Notifier tous les autres participants de la réunion
      socket.to(data.meetingId).emit('screen-share-paused', {
        userId: data.userId,
        username: data.username,
        meetingId: data.meetingId
      });
    } catch (error) {
      console.error('Erreur lors de la pause du partage d\'écran:', error);
      socket.emit('error', { message: 'Erreur lors de la pause du partage d\'écran' });
    }
  });

  socket.on('screen-share-resumed', (data) => {
    try {
      console.log(`▶️ Partage d'écran repris par ${data.username} dans ${data.meetingId}`);
      
      // Notifier tous les autres participants de la réunion
      socket.to(data.meetingId).emit('screen-share-resumed', {
        userId: data.userId,
        username: data.username,
        meetingId: data.meetingId
      });
    } catch (error) {
      console.error('Erreur lors de la reprise du partage d\'écran:', error);
      socket.emit('error', { message: 'Erreur lors de la reprise du partage d\'écran' });
    }
  });

  // Gestion des confirmations de partage d'écran
  socket.on('screen-share-confirmation', (data) => {
    try {
      console.log(`✅ Confirmation de partage d'écran reçue de ${data.username} pour ${data.fromUserId}`);
      
      // Envoyer la confirmation à l'utilisateur qui partage
      socket.to(data.meetingId).emit('screen-share-confirmation', {
        username: data.username,
        confirmed: data.confirmed,
        meetingId: data.meetingId
      });
    } catch (error) {
      console.error('Erreur lors de la confirmation de partage d\'écran:', error);
      socket.emit('error', { message: 'Erreur lors de la confirmation de partage d\'écran' });
    }
  });

  // Événements multi-participants
  socket.on("promote-to-host", ({ meetingId, newHostId }) => {
    try {
      const result = meetingService.promoteToHost(meetingId, socket.userId, newHostId);
      
      // Notifier tous les participants
      io.to(meetingId).emit("host-changed", {
        meetingId,
        newHostId: result.newHostId,
        newHostUsername: result.newHostUsername,
        previousHostId: result.previousHostId
      });
      
      console.log(`👑 ${result.newHostUsername} promu hôte de ${meetingId} par ${socket.username}`);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("eject-participant", ({ meetingId, participantId }) => {
    try {
      const ejected = meetingService.ejectParticipant(meetingId, socket.userId, participantId);
      
      if (ejected) {
        // Notifier le participant éjecté
        const ejectedSocket = Array.from(io.sockets.sockets.values())
          .find(s => s.userId === participantId);
        if (ejectedSocket) {
          ejectedSocket.emit("ejected", { meetingId, reason: "Éjecté par l'hôte" });
          ejectedSocket.leave(meetingId);
        }
        
        // Notifier tous les autres participants
        socket.to(meetingId).emit("participant-ejected", {
          meetingId,
          ejectedUserId: participantId,
          ejectedBy: socket.username
        });
        
        console.log(`👤 ${participantId} éjecté de ${meetingId} par ${socket.username}`);
      }
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("change-quality", ({ meetingId, qualitySettings }) => {
    try {
      const updated = meetingService.updateQualitySettings(meetingId, qualitySettings);
      
      // Notifier tous les participants
      io.to(meetingId).emit("quality-changed", {
        meetingId,
        qualitySettings: updated,
        changedBy: socket.username
      });
      
      console.log(`⚙️ Qualité changée dans ${meetingId} par ${socket.username}`);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("change-layout", ({ meetingId, layout }) => {
    try {
      const updated = meetingService.setLayout(meetingId, layout);
      
      // Notifier tous les participants
      io.to(meetingId).emit("layout-changed", {
        meetingId,
        layout: updated,
        changedBy: socket.username
      });
      
      console.log(`📐 Mise en page changée dans ${meetingId} par ${socket.username}`);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("request-host-control", ({ meetingId }) => {
    try {
      const meeting = meetingService.getMeeting(meetingId);
      if (!meeting) {
        throw new Error('Réunion non trouvée');
      }
      
      // Demander l'approbation de l'hôte
      const hostSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.userId === meeting.hostId);
      
      if (hostSocket) {
        hostSocket.emit("host-control-request", {
          meetingId,
          requesterId: socket.userId,
          requesterUsername: socket.username
        });
      }
      
      socket.emit("host-control-request-sent", { meetingId });
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("respond-host-control", ({ meetingId, requesterId, approved }) => {
    try {
      const meeting = meetingService.getMeeting(meetingId);
      if (!meeting || meeting.hostId !== socket.userId) {
        throw new Error('Seul l\'hôte peut répondre à cette demande');
      }
      
      const requesterSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.userId === requesterId);
      
      if (requesterSocket) {
        requesterSocket.emit("host-control-response", {
          meetingId,
          approved,
          respondedBy: socket.username
        });
      }
      
      console.log(`🎛️ Demande de contrôle hôte ${approved ? 'approuvée' : 'refusée'} pour ${requesterId} par ${socket.username}`);
    } catch (error) {
      socket.emit("error", { message: error.message });
    }
  });

  // Événements de notifications
  socket.on("get-notifications", ({ limit = 50, unreadOnly = false }) => {
    try {
      const notifications = notificationService.getUserNotifications(socket.userId, limit, unreadOnly);
      socket.emit("notifications-list", { notifications });
    } catch (error) {
      socket.emit("notification-error", { error: error.message });
    }
  });

  socket.on("mark-notification-read", ({ notificationId }) => {
    try {
      const success = notificationService.markNotificationAsRead(socket.userId, notificationId);
      if (success) {
        socket.emit("notification-marked-read", { notificationId });
        
        // Mettre à jour le compteur de notifications non lues
        const unreadCount = notificationService.getUnreadNotificationCount(socket.userId);
        socket.emit("unread-notifications-count", { count: unreadCount });
      } else {
        socket.emit("notification-error", { error: "Notification non trouvée" });
      }
    } catch (error) {
      socket.emit("notification-error", { error: error.message });
    }
  });

  socket.on("mark-all-notifications-read", () => {
    try {
      const markedCount = notificationService.markAllNotificationsAsRead(socket.userId);
      socket.emit("all-notifications-marked-read", { markedCount });
      
      // Mettre à jour le compteur
      const unreadCount = notificationService.getUnreadNotificationCount(socket.userId);
      socket.emit("unread-notifications-count", { count: unreadCount });
    } catch (error) {
      socket.emit("notification-error", { error: error.message });
    }
  });

  socket.on("delete-notification", ({ notificationId }) => {
    try {
      const success = notificationService.deleteNotification(socket.userId, notificationId);
      if (success) {
        socket.emit("notification-deleted", { notificationId });
        
        // Mettre à jour le compteur
        const unreadCount = notificationService.getUnreadNotificationCount(socket.userId);
        socket.emit("unread-notifications-count", { count: unreadCount });
      } else {
        socket.emit("notification-error", { error: "Notification non trouvée" });
      }
    } catch (error) {
      socket.emit("notification-error", { error: error.message });
    }
  });

  socket.on("get-unread-count", () => {
    try {
      const unreadCount = notificationService.getUnreadNotificationCount(socket.userId);
      socket.emit("unread-notifications-count", { count: unreadCount });
    } catch (error) {
      socket.emit("notification-error", { error: error.message });
    }
  });

  // Gestion de la déconnexion
  socket.on("disconnect", () => {
    console.log(`Utilisateur déconnecté: ${socket.username}`);
    
    // Se désabonner des notifications
    if (socket.userId) {
      notificationService.unsubscribeFromNotifications(socket.userId, socket.id);
    }
    
    // Quitter toutes les réunions actives
    const rooms = Array.from(socket.rooms);
    rooms.forEach(roomId => {
      if (roomId !== socket.id) {
        try {
          const result = meetingService.leaveMeeting(roomId, socket.userId);
          if (result && !result.closed) {
            socket.to(roomId).emit("participant-left", {
              userId: socket.userId,
              username: socket.username,
              participantCount: result.participantCount
            });
          }
        } catch (error) {
          console.error(`Erreur lors de la déconnexion de ${roomId}:`, error);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur sécurisé démarré sur le port ${PORT}`);
  console.log(`🔒 Sécurité: Helmet, CORS, JWT activés`);
  console.log(`📹 Gestion des réunions et salles activée`);
  console.log(`💬 Service de chat en temps réel activé`);
});

// Nettoyage périodique des chats anciens (toutes les heures)
setInterval(() => {
  const cleanedCount = chatService.cleanupOldChats();
  if (cleanedCount > 0) {
    console.log(`🧹 ${cleanedCount} chats anciens nettoyés`);
  }
}, 60 * 60 * 1000); // 1 heure

// Nettoyage périodique des enregistrements anciens (tous les jours)
setInterval(async () => {
  const cleanedCount = await recordingService.cleanupOldRecordings();
  if (cleanedCount > 0) {
    console.log(`🧹 ${cleanedCount} enregistrements anciens nettoyés`);
  }
}, 24 * 60 * 60 * 1000); // 24 heures

// Nettoyage périodique des anciennes notifications (tous les jours)
setInterval(() => {
  const cleanedCount = notificationService.cleanupOldNotifications(30); // 30 jours
  if (cleanedCount > 0) {
    console.log(`🧹 ${cleanedCount} anciennes notifications nettoyées`);
  }
}, 24 * 60 * 60 * 1000); // 24 heures