/**
 * Service de gestion de l'enregistrement des réunions
 * Gère l'enregistrement des flux audio/vidéo et le stockage des fichiers
 */
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class RecordingService {
  constructor() {
    // Map des enregistrements actifs par meetingId
    this.activeRecordings = new Map(); // meetingId -> { recordingId, participants, startTime, status }
    // Configuration de l'enregistrement
    this.config = {
      recordingsDir: process.env.RECORDINGS_PATH
        ? path.resolve(process.env.RECORDINGS_PATH)
        : (process.env.NODE_ENV === 'production'
            ? '/tmp/recordings'
            : path.join(__dirname, '../../recordings')),
      maxRecordingDuration: 4 * 60 * 60 * 1000, // 4 heures
      allowedFormats: ['webm', 'mp4'],
      compressionQuality: 0.8,
      audioBitrate: 128000,
      videoBitrate: 2500000
    };
    
    // Initialiser le répertoire d'enregistrement
    this.initializeRecordingsDirectory();
  }

  /**
   * Initialiser le répertoire d'enregistrements
   */
  async initializeRecordingsDirectory() {
    try {
      await fs.mkdir(this.config.recordingsDir, { recursive: true });
      console.log(`📹 Répertoire d'enregistrements initialisé: ${this.config.recordingsDir}`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du répertoire d\'enregistrements:', error);
      // Fallback automatique vers /tmp/recordings en environnement type production/container
      const fallbackDir = '/tmp/recordings';
      if (this.config.recordingsDir !== fallbackDir) {
        try {
          await fs.mkdir(fallbackDir, { recursive: true });
          this.config.recordingsDir = fallbackDir;
          console.log(`✅ Dossier d'enregistrements de repli créé et utilisé: ${fallbackDir}`);
        } catch (fallbackError) {
          console.error('❌ Échec de la création du répertoire de repli /tmp/recordings:', fallbackError);
        }
      }
    }
  }

  /**
   * Démarrer l'enregistrement d'une réunion
   * @param {string} meetingId - ID de la réunion
   * @param {string} userId - ID de l'utilisateur qui démarre l'enregistrement
   * @param {string} recordingType - Type d'enregistrement (audio, video, both)
   * @returns {Object} Informations sur l'enregistrement démarré
   */
  async startRecording(meetingId, userId, recordingType = 'both') {
    // Vérifier si un enregistrement est déjà en cours
    if (this.activeRecordings.has(meetingId)) {
      throw new Error('Un enregistrement est déjà en cours pour cette réunion');
    }

    const recordingId = uuidv4();
    const startTime = new Date();
    
    const recording = {
      id: recordingId,
      meetingId,
      startedBy: userId,
      startTime,
      type: recordingType,
      status: 'recording',
      participants: new Set(),
      chunks: [],
      metadata: {
        format: recordingType === 'audio' ? 'webm' : 'webm',
        quality: this.config.compressionQuality,
        bitrate: recordingType === 'audio' ? this.config.audioBitrate : this.config.videoBitrate
      }
    };

    this.activeRecordings.set(meetingId, recording);

    // Créer le fichier de métadonnées
    await this.saveRecordingMetadata(recording);

    console.log(`🎬 Enregistrement démarré: ${recordingId} pour la réunion ${meetingId}`);
    
    return {
      recordingId,
      meetingId,
      startTime,
      type: recordingType,
      status: 'recording'
    };
  }

  /**
   * Arrêter l'enregistrement d'une réunion
   * @param {string} meetingId - ID de la réunion
   * @param {string} userId - ID de l'utilisateur qui arrête l'enregistrement
   * @returns {Object} Informations sur l'enregistrement arrêté
   */
  async stopRecording(meetingId, userId) {
    const recording = this.activeRecordings.get(meetingId);
    if (!recording) {
      throw new Error('Aucun enregistrement en cours pour cette réunion');
    }

    recording.status = 'processing';
    recording.endTime = new Date();
    recording.duration = recording.endTime - recording.startTime;

    // Traiter et sauvegarder l'enregistrement
    const result = await this.processRecording(recording);

    // Supprimer de la liste des enregistrements actifs
    this.activeRecordings.delete(meetingId);

    console.log(`⏹️ Enregistrement arrêté: ${recording.id} pour la réunion ${meetingId}`);
    
    return {
      recordingId: recording.id,
      meetingId,
      endTime: recording.endTime,
      duration: recording.duration,
      status: 'completed',
      filePath: result.filePath,
      fileSize: result.fileSize
    };
  }

  /**
   * Ajouter un participant à l'enregistrement
   * @param {string} meetingId - ID de la réunion
   * @param {string} userId - ID du participant
   * @param {string} username - Nom d'utilisateur
   */
  addParticipantToRecording(meetingId, userId, username) {
    const recording = this.activeRecordings.get(meetingId);
    if (recording) {
      recording.participants.add({ userId, username, joinTime: new Date() });
      console.log(`👤 ${username} ajouté à l'enregistrement de ${meetingId}`);
    }
  }

  /**
   * Retirer un participant de l'enregistrement
   * @param {string} meetingId - ID de la réunion
   * @param {string} userId - ID du participant
   */
  removeParticipantFromRecording(meetingId, userId) {
    const recording = this.activeRecordings.get(meetingId);
    if (recording) {
      const participant = Array.from(recording.participants).find(p => p.userId === userId);
      if (participant) {
        participant.leaveTime = new Date();
        console.log(`👤 ${participant.username} retiré de l'enregistrement de ${meetingId}`);
      }
    }
  }

  /**
   * Ajouter des données d'enregistrement
   * @param {string} meetingId - ID de la réunion
   * @param {Buffer} chunk - Données d'enregistrement
   * @param {string} type - Type de données (audio, video)
   */
  addRecordingChunk(meetingId, chunk, type = 'audio') {
    const recording = this.activeRecordings.get(meetingId);
    if (recording && recording.status === 'recording') {
      recording.chunks.push({
        data: chunk,
        type,
        timestamp: new Date(),
        size: chunk.length
      });
    }
  }

  /**
   * Traiter et sauvegarder un enregistrement
   * @param {Object} recording - Objet d'enregistrement
   * @returns {Object} Résultat du traitement
   */
  async processRecording(recording) {
    try {
      const fileName = `${recording.id}_${recording.meetingId}.webm`;
      const filePath = path.join(this.config.recordingsDir, fileName);
      
      // Simuler le traitement des chunks (dans un vrai projet, vous utiliseriez FFmpeg)
      let totalSize = 0;
      const chunks = recording.chunks;
      
      // Créer un buffer combiné
      const combinedBuffer = Buffer.concat(chunks.map(chunk => chunk.data));
      totalSize = combinedBuffer.length;
      
      // Sauvegarder le fichier
      await fs.writeFile(filePath, combinedBuffer);
      
      // Mettre à jour les métadonnées
      recording.filePath = filePath;
      recording.fileSize = totalSize;
      recording.processedAt = new Date();
      
      // Sauvegarder les métadonnées finales
      await this.saveRecordingMetadata(recording);
      
      console.log(`💾 Enregistrement sauvegardé: ${filePath} (${this.formatFileSize(totalSize)})`);
      
      return {
        filePath,
        fileSize: totalSize,
        chunks: chunks.length
      };
    } catch (error) {
      console.error('❌ Erreur lors du traitement de l\'enregistrement:', error);
      throw error;
    }
  }

  /**
   * Sauvegarder les métadonnées d'un enregistrement
   * @param {Object} recording - Objet d'enregistrement
   */
  async saveRecordingMetadata(recording) {
    const metadataPath = path.join(this.config.recordingsDir, `${recording.id}_metadata.json`);
    
    const metadata = {
      id: recording.id,
      meetingId: recording.meetingId,
      startedBy: recording.startedBy,
      startTime: recording.startTime,
      endTime: recording.endTime,
      duration: recording.duration,
      type: recording.type,
      status: recording.status,
      participants: Array.from(recording.participants),
      metadata: recording.metadata,
      filePath: recording.filePath,
      fileSize: recording.fileSize,
      processedAt: recording.processedAt
    };
    
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Obtenir les informations d'un enregistrement actif
   * @param {string} meetingId - ID de la réunion
   * @returns {Object|null} Informations de l'enregistrement
   */
  getActiveRecording(meetingId) {
    const recording = this.activeRecordings.get(meetingId);
    if (!recording) return null;
    
    return {
      id: recording.id,
      meetingId,
      startedBy: recording.startedBy,
      startTime: recording.startTime,
      type: recording.type,
      status: recording.status,
      participants: Array.from(recording.participants),
      duration: Date.now() - recording.startTime.getTime()
    };
  }

  /**
   * Lister tous les enregistrements d'une réunion
   * @param {string} meetingId - ID de la réunion
   * @returns {Array} Liste des enregistrements
   */
  async getRecordingsForMeeting(meetingId) {
    try {
      const files = await fs.readdir(this.config.recordingsDir);
      const recordings = [];
      
      for (const file of files) {
        if (file.endsWith('_metadata.json')) {
          const metadataPath = path.join(this.config.recordingsDir, file);
          const metadataContent = await fs.readFile(metadataPath, 'utf8');
          const metadata = JSON.parse(metadataContent);
          
          if (metadata.meetingId === meetingId) {
            recordings.push({
              id: metadata.id,
              meetingId: metadata.meetingId,
              startedBy: metadata.startedBy,
              startTime: metadata.startTime,
              endTime: metadata.endTime,
              duration: metadata.duration,
              type: metadata.type,
              status: metadata.status,
              participants: metadata.participants,
              filePath: metadata.filePath,
              fileSize: metadata.fileSize,
              processedAt: metadata.processedAt
            });
          }
        }
      }
      
      return recordings.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des enregistrements:', error);
      return [];
    }
  }

  /**
   * Obtenir tous les enregistrements
   * @returns {Array} Liste de tous les enregistrements
   */
  async getAllRecordings() {
    try {
      const files = await fs.readdir(this.config.recordingsDir);
      const recordings = [];
      
      for (const file of files) {
        if (file.endsWith('_metadata.json')) {
          const metadataPath = path.join(this.config.recordingsDir, file);
          const metadataContent = await fs.readFile(metadataPath, 'utf8');
          const metadata = JSON.parse(metadataContent);
          
          recordings.push({
            id: metadata.id,
            meetingId: metadata.meetingId,
            startedBy: metadata.startedBy,
            startTime: metadata.startTime,
            endTime: metadata.endTime,
            duration: metadata.duration,
            type: metadata.type,
            status: metadata.status,
            participants: metadata.participants,
            fileSize: metadata.fileSize,
            processedAt: metadata.processedAt
          });
        }
      }
      
      return recordings.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de tous les enregistrements:', error);
      return [];
    }
  }

  /**
   * Supprimer un enregistrement
   * @param {string} recordingId - ID de l'enregistrement
   * @returns {boolean} True si supprimé avec succès
   */
  async deleteRecording(recordingId) {
    try {
      const metadataPath = path.join(this.config.recordingsDir, `${recordingId}_metadata.json`);
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);
      
      // Supprimer le fichier vidéo
      if (metadata.filePath) {
        await fs.unlink(metadata.filePath);
      }
      
      // Supprimer le fichier de métadonnées
      await fs.unlink(metadataPath);
      
      console.log(`🗑️ Enregistrement supprimé: ${recordingId}`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur lors de la suppression de l'enregistrement ${recordingId}:`, error);
      return false;
    }
  }

  /**
   * Obtenir les statistiques des enregistrements
   * @returns {Object} Statistiques
   */
  async getRecordingStats() {
    try {
      const allRecordings = await this.getAllRecordings();
      const activeRecordings = this.activeRecordings.size;
      
      const totalDuration = allRecordings.reduce((total, recording) => {
        return total + (recording.duration || 0);
      }, 0);
      
      const totalSize = allRecordings.reduce((total, recording) => {
        return total + (recording.fileSize || 0);
      }, 0);
      
      const recordingsByType = allRecordings.reduce((acc, recording) => {
        acc[recording.type] = (acc[recording.type] || 0) + 1;
        return acc;
      }, {});
      
      return {
        totalRecordings: allRecordings.length,
        activeRecordings,
        totalDuration,
        totalSize,
        recordingsByType,
        averageDuration: allRecordings.length > 0 ? totalDuration / allRecordings.length : 0,
        averageSize: allRecordings.length > 0 ? totalSize / allRecordings.length : 0
      };
    } catch (error) {
      console.error('❌ Erreur lors du calcul des statistiques:', error);
      return {
        totalRecordings: 0,
        activeRecordings: 0,
        totalDuration: 0,
        totalSize: 0,
        recordingsByType: {},
        averageDuration: 0,
        averageSize: 0
      };
    }
  }

  /**
   * Nettoyer les enregistrements anciens
   * @param {number} maxAge - Âge maximum en millisecondes
   * @returns {number} Nombre d'enregistrements supprimés
   */
  async cleanupOldRecordings(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 jours
    try {
      const allRecordings = await this.getAllRecordings();
      const cutoffDate = new Date(Date.now() - maxAge);
      let deletedCount = 0;
      
      for (const recording of allRecordings) {
        if (new Date(recording.startTime) < cutoffDate) {
          const deleted = await this.deleteRecording(recording.id);
          if (deleted) deletedCount++;
        }
      }
      
      if (deletedCount > 0) {
        console.log(`🧹 ${deletedCount} enregistrements anciens supprimés`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage des enregistrements:', error);
      return 0;
    }
  }

  /**
   * Formater la taille de fichier
   * @param {number} bytes - Taille en octets
   * @returns {string} Taille formatée
   */
  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Vérifier si un enregistrement est en cours
   * @param {string} meetingId - ID de la réunion
   * @returns {boolean} True si un enregistrement est en cours
   */
  isRecording(meetingId) {
    return this.activeRecordings.has(meetingId);
  }
}

module.exports = RecordingService;
