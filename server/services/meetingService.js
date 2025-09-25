const db = require('../db/mysql');

class MeetingService {
  constructor() {
    // Configuration des réunions
    this.config = {
      maxParticipants: 100,
      meetingTimeout: 24 * 60 * 60 * 1000, // 24 heures
      defaultDuration: 60 // minutes
    };
  }

  /**
   * Créer une réunion instantanée
   */
  async createMeeting(meetingId, { title, username }) {
    try {
      await db.insert('instantmeeting', {
        id: meetingId,
        title: title || 'Réunion instantanée',
        hostUsername: username,
        status: 'active',
        participantCount: 0,
        createdAt: new Date()
      });

      console.log(`📹 Réunion créée: ${meetingId} par ${username}`);
      return { id: meetingId, title, hostUsername: username, status: 'active' };
    } catch (error) {
      console.error('❌ Erreur création réunion:', error.message);
      throw error;
    }
  }

  /**
   * Rejoindre une réunion
   */
  async joinMeeting(meetingId, { username, userId }) {
    try {
      // Vérifier que la réunion existe
      const meeting = await db.queryOne(
        'SELECT * FROM `instantmeeting` WHERE id = ? AND status = ?',
        [meetingId, 'active']
      );
      
      if (!meeting) {
        throw new Error('Réunion non trouvée ou fermée');
      }

      // Ajouter le participant
      const participantId = db.generateId();
      await db.insert('instantmeetingparticipant', {
        id: participantId,
        meetingId,
        userId: userId || null,
        username,
        joinedAt: new Date(),
        isMuted: false,
        isVideoEnabled: true,
        role: 'participant'
      });

      // Mettre à jour le compteur de participants
      const participantCount = await db.count('instantmeetingparticipant', 'meetingId = ?', [meetingId]);
      await db.update('instantmeeting', 
        { participantCount }, 
        'id = ?', 
        [meetingId]
      );

      console.log(`👤 ${username} a rejoint la réunion ${meetingId}`);
      return { meetingId, participantId, username };
    } catch (error) {
      console.error('❌ Erreur join meeting:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir les détails d'une réunion
   */
  async getMeeting(meetingId) {
    try {
      const meeting = await db.queryOne(
        'SELECT * FROM `instantmeeting` WHERE id = ?',
        [meetingId]
      );
      return meeting;
    } catch (error) {
      console.error('❌ Erreur get meeting:', error.message);
      throw error;
    }
  }

  /**
   * Supprimer un participant
   */
  async removeParticipant(meetingId, participantId) {
    try {
      const participant = await db.queryOne(
        'SELECT * FROM `instantmeetingparticipant` WHERE id = ? AND meetingId = ?',
        [participantId, meetingId]
      );

      if (!participant) {
        throw new Error('Participant non trouvé');
      }

      await db.delete('instantmeetingparticipant', 'id = ?', [participantId]);

      // Mettre à jour le compteur
      const participantCount = await db.count('instantmeetingparticipant', 'meetingId = ?', [meetingId]);
      await db.update('instantmeeting', 
        { participantCount }, 
        'id = ?', 
        [meetingId]
      );

      console.log(`👋 Participant ${participant.username} retiré de la réunion ${meetingId}`);
      return true;
    } catch (error) {
      console.error('❌ Erreur remove participant:', error.message);
      throw error;
    }
  }

  /**
   * Lister les réunions actives
   */
  async listMeetings() {
    try {
      const meetings = await db.find(
        'instantmeeting', 
        'status = ?', 
        ['active'], 
        'createdAt DESC'
      );
      return meetings;
    } catch (error) {
      console.error('❌ Erreur list meetings:', error.message);
      throw error;
    }
  }

  /**
   * Lister les participants d'une réunion
   */
  async listMeetingParticipants(meetingId) {
    try {
      const participants = await db.find(
        'instantmeetingparticipant',
        'meetingId = ?',
        [meetingId],
        'joinedAt ASC'
      );
      return participants;
    } catch (error) {
      console.error('❌ Erreur list participants:', error.message);
      throw error;
    }
  }

  /**
   * Programmer une réunion
   */
  async scheduleMeeting(ownerId, { title, description, scheduledFor, durationMin, password, options = {} }) {
    try {
      const meetingId = db.generateId();
      const meeting = await db.insert('meeting', {
        id: meetingId,
        ownerId,
        title,
        description: description || null,
        scheduledFor: new Date(scheduledFor),
        durationMin,
        password: password || null,
        status: 'scheduled',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`📅 Réunion programmée: ${title} pour ${scheduledFor}`);
      return { id: meetingId, ...meeting };
    } catch (error) {
      console.error('❌ Erreur schedule meeting:', error.message);
      throw error;
    }
  }

  /**
   * Mettre à jour une réunion
   */
  async updateMeeting(meetingId, ownerId, updateData) {
    try {
      const meeting = await db.queryOne(
        'SELECT * FROM `meeting` WHERE id = ? AND ownerId = ?',
        [meetingId, ownerId]
      );

      if (!meeting) {
        throw new Error('Réunion non trouvée ou accès refusé');
      }

      const updatedData = {
        ...updateData,
        updatedAt: new Date()
      };

      await db.update('meeting', updatedData, 'id = ?', [meetingId]);

      console.log(`📝 Réunion ${meetingId} mise à jour`);
      return true;
    } catch (error) {
      console.error('❌ Erreur update meeting:', error.message);
      throw error;
    }
  }

  /**
   * Annuler une réunion
   */
  async cancelMeeting(meetingId, ownerId) {
    try {
      const meeting = await db.queryOne(
        'SELECT * FROM `meeting` WHERE id = ? AND ownerId = ?',
        [meetingId, ownerId]
      );

      if (!meeting) {
        throw new Error('Réunion non trouvée ou accès refusé');
      }

      await db.update('meeting', 
        { status: 'cancelled', updatedAt: new Date() }, 
        'id = ?', 
        [meetingId]
      );

      console.log(`❌ Réunion ${meetingId} annulée`);
      return true;
    } catch (error) {
      console.error('❌ Erreur cancel meeting:', error.message);
      throw error;
    }
  }

  /**
   * Lister mes réunions
   */
  async listMyMeetings(ownerId) {
    try {
      const meetings = await db.find(
        'meeting',
        'ownerId = ?',
        [ownerId],
        'createdAt DESC'
      );
      return meetings;
    } catch (error) {
      console.error('❌ Erreur list my meetings:', error.message);
      throw error;
    }
  }

  /**
   * Lister mes enregistrements
   */
  async listMyRecordings(ownerId) {
    try {
      const recordings = await db.find(
        'recording',
        'ownerId = ?',
        [ownerId],
        'startedAt DESC'
      );
      return recordings;
    } catch (error) {
      console.error('❌ Erreur list my recordings:', error.message);
      throw error;
    }
  }

  /**
   * Fermer une réunion
   */
  async endMeeting(meetingId, hostId) {
    try {
      const meeting = await db.queryOne(
        'SELECT * FROM `instantmeeting` WHERE id = ?',
        [meetingId]
      );

      if (!meeting) {
        throw new Error('Réunion non trouvée');
      }

      await db.update('instantmeeting', 
        { 
          status: 'ended', 
          endedAt: new Date() 
        }, 
        'id = ?', 
        [meetingId]
      );

      console.log(`🔚 Réunion ${meetingId} fermée`);
      return true;
    } catch (error) {
      console.error('❌ Erreur end meeting:', error.message);
      throw error;
    }
  }
}

module.exports = MeetingService;