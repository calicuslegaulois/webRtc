const db = require('../db/mysql');

/**
 * Service de gestion du chat en temps réel
 * Gère les messages, les réactions, et l'historique du chat
 */
class ChatService {
  constructor() {
    // Configuration du chat
    this.config = {
      maxMessages: 1000,
      messageRetention: 24 * 60 * 60 * 1000, // 24 heures
      maxMessageLength: 1000,
      allowedEmojis: ['👍', '👏', '❤️', '😂', '😮', '😢', '😡', '🎉', '👎']
    };
  }

  /**
   * Initialiser le chat pour une réunion
   */
  async initializeChat(meetingId, participants = []) {
    try {
      const meeting = await db.queryOne(
        'SELECT * FROM `instantmeeting` WHERE id = ?',
        [meetingId]
      );

      if (!meeting) {
        throw new Error('Réunion non trouvée');
      }

      console.log(`💬 Chat initialisé pour la réunion ${meetingId}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur:', error.message);
      throw error;
    }
  }

  /**
   * Envoyer un message
   */
  async sendMessage(meetingId, { userId, username, message, type = 'text' }) {
    try {
      // Vérifier la longueur du message
      if (message.length > this.config.maxMessageLength) {
        throw new Error('Message trop long');
      }

      // Vérifier que la réunion existe
      const meeting = await db.queryOne(
        'SELECT * FROM `instantmeeting` WHERE id = ?',
        [meetingId]
      );

      if (!meeting) {
        throw new Error('Réunion non trouvée');
      }

      const messageId = db.generateId();
      await db.insert('chatmessage', {
        id: messageId,
        meetingId,
        userId: userId || null,
        username,
        message,
        type,
        timestamp: new Date(),
        edited: false
      });

      console.log(`💬 Message envoyé par ${username} dans ${meetingId}`);
      return {
        id: messageId,
        meetingId,
        userId,
        username,
        message,
        type,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Erreur send message:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir l'historique des messages
   */
  async getMessageHistory(meetingId, limit = 50) {
    try {
      const messages = await db.find(
        'chatmessage',
        'meetingId = ?',
        [meetingId],
        'timestamp DESC'
      );

      // Limiter le nombre de messages
      const limitedMessages = messages.slice(0, limit).reverse();

      return limitedMessages.map(msg => ({
        id: msg.id,
        meetingId: msg.meetingId,
        userId: msg.userId,
        username: msg.username,
        message: msg.message,
        type: msg.type,
        timestamp: msg.timestamp,
        edited: msg.edited,
        editedAt: msg.editedAt
      }));
    } catch (error) {
      console.error('❌ Erreur get message history:', error.message);
      throw error;
    }
  }

  /**
   * Modifier un message
   */
  async editMessage(messageId, userId, newMessage) {
    try {
      // Vérifier que le message existe et appartient à l'utilisateur
      const message = await db.queryOne(
        'SELECT * FROM `chatmessage` WHERE id = ? AND userId = ?',
        [messageId, userId]
      );

      if (!message) {
        throw new Error('Message non trouvé ou accès refusé');
      }

      // Vérifier la longueur du nouveau message
      if (newMessage.length > this.config.maxMessageLength) {
        throw new Error('Message trop long');
      }

      await db.update('chatmessage', 
        { 
          message: newMessage, 
          edited: true, 
          editedAt: new Date() 
        }, 
        'id = ?', 
        [messageId]
      );

      console.log(`✏️ Message ${messageId} modifié`);
      return true;
    } catch (error) {
      console.error('❌ Erreur edit message:', error.message);
      throw error;
    }
  }

  /**
   * Supprimer un message
   */
  async deleteMessage(messageId, userId) {
    try {
      // Vérifier que le message existe et appartient à l'utilisateur
      const message = await db.queryOne(
        'SELECT * FROM `chatmessage` WHERE id = ? AND userId = ?',
        [messageId, userId]
      );

      if (!message) {
        throw new Error('Message non trouvé ou accès refusé');
      }

      await db.delete('chatmessage', 'id = ?', [messageId]);

      console.log(`🗑️ Message ${messageId} supprimé`);
      return true;
    } catch (error) {
      console.error('❌ Erreur delete message:', error.message);
      throw error;
    }
  }

  /**
   * Ajouter une réaction à un message
   */
  async addReaction(messageId, userId, emoji) {
    try {
      // Vérifier que l'emoji est autorisé
      if (!this.config.allowedEmojis.includes(emoji)) {
        throw new Error('Emoji non autorisé');
      }

      // Vérifier que le message existe
      const message = await db.queryOne(
        'SELECT * FROM `chatmessage` WHERE id = ?',
        [messageId]
      );

      if (!message) {
        throw new Error('Message non trouvé');
      }

      // Vérifier si la réaction existe déjà
      const existingReaction = await db.queryOne(
        'SELECT * FROM `messagereaction` WHERE messageId = ? AND userId = ? AND emoji = ?',
        [messageId, userId, emoji]
      );

      if (existingReaction) {
        throw new Error('Réaction déjà ajoutée');
      }

      const reactionId = db.generateId();
      await db.insert('messagereaction', {
        id: reactionId,
        messageId,
        userId,
        emoji,
        createdAt: new Date()
      });

      console.log(`😀 Réaction ${emoji} ajoutée au message ${messageId}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur add reaction:', error.message);
      throw error;
    }
  }

  /**
   * Supprimer une réaction
   */
  async removeReaction(messageId, userId, emoji) {
    try {
      const deleted = await db.delete(
        'messagereaction',
        'messageId = ? AND userId = ? AND emoji = ?',
        [messageId, userId, emoji]
      );

      if (deleted === 0) {
        throw new Error('Réaction non trouvée');
      }

      console.log(`😀 Réaction ${emoji} supprimée du message ${messageId}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur remove reaction:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir les réactions d'un message
   */
  async getMessageReactions(messageId) {
    try {
      const reactions = await db.find(
        'messagereaction',
        'messageId = ?',
        [messageId],
        'createdAt ASC'
      );

      // Grouper les réactions par emoji
      const groupedReactions = {};
      reactions.forEach(reaction => {
        if (!groupedReactions[reaction.emoji]) {
          groupedReactions[reaction.emoji] = [];
        }
        groupedReactions[reaction.emoji].push({
          userId: reaction.userId,
          createdAt: reaction.createdAt
        });
      });

      return groupedReactions;
    } catch (error) {
      console.error('❌ Erreur get message reactions:', error.message);
      throw error;
    }
  }

  /**
   * Nettoyer les anciens messages
   */
  async cleanupOldMessages() {
    try {
      const cutoffDate = new Date(Date.now() - this.config.messageRetention);
      
      const deleted = await db.delete(
        'chatmessage',
        'timestamp < ?',
        [cutoffDate]
      );

      console.log(`🧹 ${deleted} anciens messages supprimés`);
      return deleted;
    } catch (error) {
      console.error('❌ Erreur cleanup messages:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir les statistiques du chat
   */
  async getChatStats(meetingId) {
    try {
      const totalMessages = await db.count('chatmessage', 'meetingId = ?', [meetingId]);
      const totalReactions = await db.count('messagereaction', 'messageId IN (SELECT id FROM chatmessage WHERE meetingId = ?)', [meetingId]);
      
      const activeUsers = await db.query(
        'SELECT DISTINCT username FROM chatmessage WHERE meetingId = ? ORDER BY timestamp DESC',
        [meetingId]
      );

      return {
        totalMessages,
        totalReactions,
        activeUsers: activeUsers.length,
        users: activeUsers.map(u => u.username)
      };
    } catch (error) {
      console.error('❌ Erreur get chat stats:', error.message);
      throw error;
    }
  }

  /**
   * Ajouter un participant au chat
   */
  async addParticipant(meetingId, participant) {
    try {
      console.log(`👤 Participant ajouté au chat: ${participant.username} dans ${meetingId}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur add participant:', error.message);
      throw error;
    }
  }

  /**
   * Supprimer un participant du chat
   */
  async removeParticipant(meetingId, participantId) {
    try {
      console.log(`👋 Participant retiré du chat: ${participantId} de ${meetingId}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur remove participant:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir les participants du chat
   */
  async getParticipants(meetingId) {
    try {
      const participants = await db.query(
        'SELECT DISTINCT username, userId FROM chatmessage WHERE meetingId = ? ORDER BY timestamp DESC',
        [meetingId]
      );
      return participants;
    } catch (error) {
      console.error('❌ Erreur get participants:', error.message);
      throw error;
    }
  }
}

module.exports = ChatService;