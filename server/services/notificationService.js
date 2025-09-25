const { v4: uuidv4 } = require('uuid');

class NotificationService {
  constructor() {
    this.notifications = new Map(); // userId -> Set(notificationId)
    this.notificationData = new Map(); // notificationId -> notification data
    this.userSubscriptions = new Map(); // userId -> Set(socketId)
    this.meetingNotifications = new Map(); // meetingId -> Set(notificationId)
  }

  // S'abonner aux notifications pour un utilisateur
  subscribeToNotifications(userId, socketId) {
    if (!this.userSubscriptions.has(userId)) {
      this.userSubscriptions.set(userId, new Set());
    }
    this.userSubscriptions.get(userId).add(socketId);
    console.log(`📱 Utilisateur ${userId} abonné aux notifications (socket: ${socketId})`);
  }

  // Se désabonner des notifications
  unsubscribeFromNotifications(userId, socketId) {
    const subscriptions = this.userSubscriptions.get(userId);
    if (subscriptions) {
      subscriptions.delete(socketId);
      if (subscriptions.size === 0) {
        this.userSubscriptions.delete(userId);
      }
    }
    console.log(`📱 Utilisateur ${userId} désabonné des notifications (socket: ${socketId})`);
  }

  // Créer une notification
  createNotification(type, title, message, data = {}, recipients = []) {
    const notificationId = uuidv4();
    const notification = {
      id: notificationId,
      type, // 'meeting_invite', 'meeting_reminder', 'message', 'system', 'recording_started', etc.
      title,
      message,
      data,
      recipients: new Set(recipients),
      createdAt: new Date(),
      read: false,
      delivered: false
    };

    this.notificationData.set(notificationId, notification);

    // Ajouter à la liste des notifications de chaque destinataire
    recipients.forEach(userId => {
      if (!this.notifications.has(userId)) {
        this.notifications.set(userId, new Set());
      }
      this.notifications.get(userId).add(notificationId);
    });

    console.log(`📱 Notification créée: ${type} pour ${recipients.length} destinataire(s)`);
    return notification;
  }

  // Envoyer une notification en temps réel via Socket.IO
  sendRealtimeNotification(io, notification, socketIds = null) {
    const notificationToSend = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: notification.createdAt
    };

    if (socketIds) {
      // Envoyer à des sockets spécifiques
      socketIds.forEach(socketId => {
        io.to(socketId).emit('notification', notificationToSend);
      });
    } else {
      // Envoyer à tous les destinataires connectés
      notification.recipients.forEach(userId => {
        const subscriptions = this.userSubscriptions.get(userId);
        if (subscriptions) {
          subscriptions.forEach(socketId => {
            io.to(socketId).emit('notification', notificationToSend);
          });
        }
      });
    }

    notification.delivered = true;
    console.log(`📱 Notification envoyée en temps réel: ${notification.type}`);
  }

  // Notification d'invitation à une réunion
  sendMeetingInvite(io, meetingId, meetingTitle, hostId, hostName, inviteeIds) {
    const notification = this.createNotification(
      'meeting_invite',
      `Invitation à la réunion: ${meetingTitle}`,
      `${hostName} vous a invité à rejoindre la réunion "${meetingTitle}"`,
      {
        meetingId,
        hostId,
        hostName,
        meetingTitle,
        action: 'join_meeting'
      },
      inviteeIds
    );

    this.sendRealtimeNotification(io, notification);
    return notification;
  }

  // Notification de rappel de réunion
  sendMeetingReminder(io, meetingId, meetingTitle, participantIds, minutesBefore = 5) {
    const notification = this.createNotification(
      'meeting_reminder',
      `Rappel: Réunion dans ${minutesBefore} minutes`,
      `La réunion "${meetingTitle}" commence dans ${minutesBefore} minutes`,
      {
        meetingId,
        meetingTitle,
        minutesBefore,
        action: 'join_meeting'
      },
      participantIds
    );

    this.sendRealtimeNotification(io, notification);
    return notification;
  }

  // Notification de nouveau message dans le chat
  sendChatNotification(io, meetingId, senderId, senderName, message, recipientIds) {
    const notification = this.createNotification(
      'chat_message',
      `Nouveau message de ${senderName}`,
      message.length > 50 ? message.substring(0, 50) + '...' : message,
      {
        meetingId,
        senderId,
        senderName,
        message,
        action: 'view_chat'
      },
      recipientIds
    );

    this.sendRealtimeNotification(io, notification);
    return notification;
  }

  // Notification de réaction
  sendReactionNotification(io, meetingId, reactorId, reactorName, emoji, messageAuthorId) {
    const notification = this.createNotification(
      'chat_reaction',
      `${reactorName} a réagi avec ${emoji}`,
      `${reactorName} a ajouté une réaction ${emoji} à votre message`,
      {
        meetingId,
        reactorId,
        reactorName,
        emoji,
        action: 'view_chat'
      },
      [messageAuthorId]
    );

    this.sendRealtimeNotification(io, notification);
    return notification;
  }

  // Notification d'enregistrement démarré/arrêté
  sendRecordingNotification(io, meetingId, meetingTitle, action, participantIds) {
    const actionText = action === 'started' ? 'démarré' : 'arrêté';
    const notification = this.createNotification(
      'recording_status',
      `Enregistrement ${actionText}`,
      `L'enregistrement de la réunion "${meetingTitle}" a été ${actionText}`,
      {
        meetingId,
        meetingTitle,
        recordingAction: action,
        action: 'view_meeting'
      },
      participantIds
    );

    this.sendRealtimeNotification(io, notification);
    return notification;
  }

  // Notification de changement d'hôte
  sendHostChangeNotification(io, meetingId, meetingTitle, oldHostId, newHostId, newHostName, participantIds) {
    const notification = this.createNotification(
      'host_change',
      `Nouvel hôte: ${newHostName}`,
      `${newHostName} est maintenant l'hôte de la réunion "${meetingTitle}"`,
      {
        meetingId,
        meetingTitle,
        oldHostId,
        newHostId,
        newHostName,
        action: 'view_meeting'
      },
      participantIds
    );

    this.sendRealtimeNotification(io, notification);
    return notification;
  }

  // Notification d'éjection
  sendEjectionNotification(io, meetingId, ejectedUserId, hostName, reason = '') {
    const notification = this.createNotification(
      'participant_ejected',
      `Vous avez été retiré de la réunion`,
      `${hostName} vous a retiré de la réunion${reason ? `: ${reason}` : ''}`,
      {
        meetingId,
        ejectedUserId,
        hostName,
        reason,
        action: 'meeting_ended'
      },
      [ejectedUserId]
    );

    this.sendRealtimeNotification(io, notification);
    return notification;
  }

  // Notification système
  sendSystemNotification(io, title, message, recipientIds = []) {
    const notification = this.createNotification(
      'system',
      title,
      message,
      {
        action: 'view_system'
      },
      recipientIds
    );

    this.sendRealtimeNotification(io, notification);
    return notification;
  }

  // Marquer une notification comme lue
  markNotificationAsRead(userId, notificationId) {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications && userNotifications.has(notificationId)) {
      const notification = this.notificationData.get(notificationId);
      if (notification) {
        notification.read = true;
        console.log(`📱 Notification ${notificationId} marquée comme lue par ${userId}`);
        return true;
      }
    }
    return false;
  }

  // Marquer toutes les notifications comme lues
  markAllNotificationsAsRead(userId) {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications) {
      let markedCount = 0;
      userNotifications.forEach(notificationId => {
        const notification = this.notificationData.get(notificationId);
        if (notification && !notification.read) {
          notification.read = true;
          markedCount++;
        }
      });
      console.log(`📱 ${markedCount} notifications marquées comme lues par ${userId}`);
      return markedCount;
    }
    return 0;
  }

  // Obtenir les notifications d'un utilisateur
  getUserNotifications(userId, limit = 50, unreadOnly = false) {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return [];

    const notifications = Array.from(userNotifications)
      .map(id => this.notificationData.get(id))
      .filter(notification => notification && (!unreadOnly || !notification.read))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return notifications.map(notification => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      createdAt: notification.createdAt,
      read: notification.read
    }));
  }

  // Obtenir le nombre de notifications non lues
  getUnreadNotificationCount(userId) {
    const userNotifications = this.notifications.get(userId);
    if (!userNotifications) return 0;

    let unreadCount = 0;
    userNotifications.forEach(notificationId => {
      const notification = this.notificationData.get(notificationId);
      if (notification && !notification.read) {
        unreadCount++;
      }
    });

    return unreadCount;
  }

  // Supprimer une notification
  deleteNotification(userId, notificationId) {
    const userNotifications = this.notifications.get(userId);
    if (userNotifications && userNotifications.has(notificationId)) {
      userNotifications.delete(notificationId);
      this.notificationData.delete(notificationId);
      console.log(`📱 Notification ${notificationId} supprimée pour ${userId}`);
      return true;
    }
    return false;
  }

  // Nettoyer les anciennes notifications
  cleanupOldNotifications(ageDays = 30) {
    const now = new Date();
    let cleanedCount = 0;

    for (const [notificationId, notification] of this.notificationData.entries()) {
      const ageMs = now.getTime() - notification.createdAt.getTime();
      if (ageMs > ageDays * 24 * 60 * 60 * 1000) {
        // Supprimer de tous les utilisateurs
        notification.recipients.forEach(userId => {
          const userNotifications = this.notifications.get(userId);
          if (userNotifications) {
            userNotifications.delete(notificationId);
          }
        });
        
        this.notificationData.delete(notificationId);
        cleanedCount++;
      }
    }

    console.log(`📱 ${cleanedCount} anciennes notifications nettoyées`);
    return cleanedCount;
  }

  // Obtenir les statistiques des notifications
  getNotificationStats() {
    const totalNotifications = this.notificationData.size;
    let totalUnread = 0;
    const typeCounts = {};

    for (const notification of this.notificationData.values()) {
      if (!notification.read) {
        totalUnread++;
      }
      typeCounts[notification.type] = (typeCounts[notification.type] || 0) + 1;
    }

    return {
      totalNotifications,
      totalUnread,
      typeCounts,
      activeSubscriptions: Array.from(this.userSubscriptions.values())
        .reduce((total, subscriptions) => total + subscriptions.size, 0)
    };
  }
}

module.exports = NotificationService;
