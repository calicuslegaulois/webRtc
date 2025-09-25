// ========================================
// FONCTIONS WEBRTC POUR COMMUNICATION PEER-TO-PEER
// ========================================

// Configuration WebRTC
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

// Variables WebRTC
let peerConnections = new Map();
let isWebRTCInitialized = false;


// Initialiser WebRTC
async function initializeWebRTC() {
  if (isWebRTCInitialized) return;
  
  try {
    console.log('🚀 Initialisation WebRTC...');
    
    // Utiliser le stream local existant s'il est disponible
    if (window.localStream) {
      console.log('✅ Utilisation du stream local existant');
      localStream = window.localStream;
    } else {
      // Démarrer le stream local seulement s'il n'existe pas
      await startLocalStream();
    }
    
    isWebRTCInitialized = true;
    console.log('✅ WebRTC initialisé avec succès');
  } catch (error) {
    console.error('❌ Erreur initialisation WebRTC:', error);
    showNotification('Erreur lors de l\'initialisation de la vidéo', 'error');
  }
}

// Démarrer le stream local
async function startLocalStream(retryCount = 0) {
  try {
    // Vérifier si un stream local existe déjà
    if (window.localStream) {
      console.log('✅ Utilisation du stream local existant');
      localStream = window.localStream;
      return;
    }
    
    console.log(`🎥 Démarrage du stream local... (tentative ${retryCount + 1})`);
    
    const constraints = {
      video: { 
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };
    
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Exposer le stream local globalement
    window.localStream = localStream;
    
    // Afficher la vidéo locale
    const localVideo = document.getElementById('localVideo');
    const localVideoPlaceholder = document.getElementById('localVideoPlaceholder');
    
    if (localVideo && localVideoPlaceholder) {
      localVideo.srcObject = localStream;
      localVideo.style.display = 'block';
      localVideoPlaceholder.style.display = 'none';
    }
    
    // Variables locales pour l'état des contrôles
    const isVideoEnabled = true;
    const isMicEnabled = true;
    updateVideoStatus('local', true, false, false);
    
    console.log('✅ Stream local démarré');
  } catch (error) {
    console.error(`❌ Erreur stream local (tentative ${retryCount + 1}):`, error);
    
    // Système de retry pour les erreurs temporaires
    if (retryCount < 2 && (error.name === 'NotReadableError' || error.name === 'NotAllowedError')) {
      console.log(`🔄 Retry dans 3 secondes... (${retryCount + 1}/2)`);
      
      // Afficher une notification de retry
      if (window.showNotification) {
        window.showNotification(`Tentative ${retryCount + 1}/2 - Réessai dans 3 secondes...`, 'warning');
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      return startLocalStream(retryCount + 1);
    }
    
    // Gestion des erreurs spécifiques
    if (window.showNotification) {
      let errorMessage = 'Erreur lors de l\'accès à la caméra/microphone';
      
      if (error.name === 'NotReadableError') {
        errorMessage = 'Caméra déjà utilisée. Fermez les autres applications vidéo.';
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Permission refusée. Autorisez l\'accès à la caméra.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Aucune caméra trouvée.';
      }
      
      window.showNotification(errorMessage, 'error');
    }
    
    throw error;
  }
}

// Créer une connexion peer
async function createPeerConnection(userId) {
  try {
    console.log(`🔗 Création connexion peer avec ${userId}`);
    
    const peerConnection = new RTCPeerConnection(rtcConfig);
    peerConnections.set(userId, peerConnection);
    
    // Ajouter le stream local
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
        console.log(`📹 Track ajouté: ${track.kind}`);
      });
    }
    
    // Gérer les streams distants
    peerConnection.ontrack = (event) => {
      console.log(`📹 Stream distant reçu de ${userId}:`, event.streams[0]);

      const mainVideo = document.getElementById('remoteVideo');
      const mainVideoPlaceholder = document.getElementById('remoteVideoPlaceholder');

      if (mainVideo && mainVideoPlaceholder) {
        mainVideo.srcObject = event.streams[0];
        mainVideo.style.display = 'block';
        mainVideoPlaceholder.style.display = 'none';

        // Vérifier si c'est un partage d'écran ou une caméra normale
        const videoTracks = event.streams[0].getVideoTracks();
        const isScreenShare = videoTracks.length > 0 && 
          (videoTracks[0].label.toLowerCase().includes('screen') || 
           videoTracks[0].label.toLowerCase().includes('window') ||
           videoTracks[0].label.toLowerCase().includes('display'));

        const mainVideoLabel = document.getElementById('remoteVideoLabel');
        if (mainVideoLabel) {
          if (isScreenShare) {
            mainVideoLabel.textContent = `🖥️ ${userId} partage son écran`;
            mainVideoLabel.style.color = '#4CAF50'; // Vert pour le partage d'écran
          } else {
            mainVideoLabel.textContent = `📹 ${userId}`;
            mainVideoLabel.style.color = '#ffffff'; // Blanc pour la caméra normale
          }
          mainVideoLabel.style.display = 'block';
        }

        // Si c'est un partage d'écran, l'afficher dans la zone principale du layout de partage
        if (isScreenShare) {
          const screenShareVideo = document.getElementById('screenShareVideo');
          if (screenShareVideo) {
            screenShareVideo.srcObject = event.streams[0];
            screenShareVideo.style.display = 'block';
          }
          addRemoteScreenShareIndicator(userId);
        } else {
          removeRemoteScreenShareIndicator(userId);
        }
      }
      console.log(`✅ Stream distant affiché dans la zone principale pour ${userId}`);
    };
    
    // Gérer les ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`🧊 ICE candidate envoyé à ${userId}`);
        socket.emit('ice-candidate', {
          to: userId,
          candidate: event.candidate,
          meetingId: currentMeeting
        });
      }
    };
    
    // Gérer les changements d'état de connexion
    peerConnection.onconnectionstatechange = () => {
      console.log(`🔗 État connexion ${userId}:`, peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'connected') {
        showNotification(`Connexion établie avec ${userId}`, 'success');
      } else if (peerConnection.connectionState === 'disconnected' || 
                 peerConnection.connectionState === 'failed') {
        showNotification(`Connexion perdue avec ${userId}`, 'warning');
      }
    };
    
    return peerConnection;
  } catch (error) {
    console.error(`❌ Erreur création peer connection avec ${userId}:`, error);
    throw error;
  }
}

// Gérer une offre WebRTC
async function handleOffer(data) {
  try {
    console.log(`📤 Offre reçue de ${data.from}`);
    
    const peerConnection = await createPeerConnection(data.from);
    
    await peerConnection.setRemoteDescription(data.offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    console.log(`📥 Réponse envoyée à ${data.from}`);
    socket.emit('answer', {
      to: data.from,
      answer: answer,
      meetingId: currentMeeting
    });
  } catch (error) {
    console.error('❌ Erreur gestion offre:', error);
  }
}

// Gérer une réponse WebRTC
async function handleAnswer(data) {
  try {
    console.log(`📥 Réponse reçue de ${data.from}`);
    
    const peerConnection = peerConnections.get(data.from);
    if (peerConnection) {
      await peerConnection.setRemoteDescription(data.answer);
    }
  } catch (error) {
    console.error('❌ Erreur gestion réponse:', error);
  }
}

// Gérer un ICE candidate
async function handleIceCandidate(data) {
  try {
    console.log(`🧊 ICE candidate reçu de ${data.from}`);
    
    const peerConnection = peerConnections.get(data.from);
    if (peerConnection) {
      await peerConnection.addIceCandidate(data.candidate);
    }
  } catch (error) {
    console.error('❌ Erreur gestion ICE candidate:', error);
  }
}

// Démarrer un appel
async function startCall(targetUserId) {
  try {
    console.log(`📞 Démarrage appel vers ${targetUserId}`);
    
    const peerConnection = await createPeerConnection(targetUserId);
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    console.log(`📤 Offre envoyée à ${targetUserId}`);
    socket.emit('offer', {
      to: targetUserId,
      offer: offer,
      meetingId: currentMeeting
    });
  } catch (error) {
    console.error('❌ Erreur démarrage appel:', error);
  }
}

// Terminer un appel
function endCall(userId) {
  try {
    console.log(`📞 Fin appel avec ${userId}`);
    
    const peerConnection = peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      peerConnections.delete(userId);
    }
    
    // Masquer la vidéo distante
    hideRemoteVideo();
  } catch (error) {
    console.error('❌ Erreur fin appel:', error);
  }
}

// Nettoyer toutes les connexions
function cleanupWebRTC() {
  try {
    console.log('🧹 Nettoyage WebRTC...');
    
    // Fermer toutes les connexions peer
    peerConnections.forEach((pc, userId) => {
      pc.close();
      console.log(`🔌 Connexion fermée avec ${userId}`);
    });
    peerConnections.clear();
    
    // Arrêter le stream local
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    
    // Masquer les vidéos
    hideRemoteVideo();
    
    const localVideo = document.getElementById('localVideo');
    const localVideoPlaceholder = document.getElementById('localVideoPlaceholder');
    
    if (localVideo && localVideoPlaceholder) {
      localVideo.style.display = 'none';
      localVideoPlaceholder.style.display = 'flex';
    }
    
    isWebRTCInitialized = false;
    // Arrêter les streams
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    console.log('✅ WebRTC nettoyé');
  } catch (error) {
    console.error('❌ Erreur nettoyage WebRTC:', error);
  }
}

// Mettre à jour les contrôles vidéo
function updateVideoControls() {
  const micBtn = document.getElementById('micBtn');
  const camBtn = document.getElementById('camBtn');
  
  // Mettre à jour les boutons selon l'état des tracks
  const audioTracks = localStream ? localStream.getAudioTracks() : [];
  const videoTracks = localStream ? localStream.getVideoTracks() : [];
  const micEnabled = audioTracks.length > 0 && audioTracks[0].enabled;
  const videoEnabled = videoTracks.length > 0 && videoTracks[0].enabled;
  
  if (micBtn) {
    micBtn.classList.toggle('muted', !micEnabled);
    micBtn.querySelector('i').className = micEnabled ? 'fas fa-microphone' : 'fas fa-microphone-slash';
  }
  
  if (camBtn) {
    camBtn.classList.toggle('muted', !videoEnabled);
    camBtn.querySelector('i').className = videoEnabled ? 'fas fa-video' : 'fas fa-video-slash';
  }
}

// Basculer le microphone
function toggleMicrophoneWebRTC() {
  if (!localStream) return;
  
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    const track = audioTracks[0];
    track.enabled = !track.enabled;
    
    // Mettre à jour les variables globales
    isMicEnabled = track.enabled;
    
    // Synchroniser tous les boutons microphone
    if (window.syncMicrophoneButtons) {
      window.syncMicrophoneButtons(isMicEnabled);
    }
    
    // Mettre à jour les contrôles vidéo
    updateVideoControls();
    updateVideoStatus('local', true, !track.enabled, !localStream.getVideoTracks()[0]?.enabled);
    
    // Afficher la notification
    if (window.showNotification) {
      window.showNotification(`Microphone ${isMicEnabled ? 'activé' : 'désactivé'}`, isMicEnabled ? 'success' : 'error');
    }
    
    console.log(`🎤 Micro ${track.enabled ? 'activé' : 'désactivé'}`);
  }
}

// Basculer la caméra
function toggleCameraWebRTC() {
  if (!localStream) return;
  
  const videoTracks = localStream.getVideoTracks();
  if (videoTracks.length > 0) {
    const track = videoTracks[0];
    track.enabled = !track.enabled;
    
    // Mettre à jour les variables globales
    isCamEnabled = track.enabled;
    
    // Synchroniser tous les boutons caméra
    if (window.syncCameraButtons) {
      window.syncCameraButtons(isCamEnabled);
    }
    
    // Mettre à jour l'affichage vidéo
    const localVideo = document.getElementById('localVideo');
    const localVideoPlaceholder = document.getElementById('localVideoPlaceholder');
    
    if (track.enabled) {
      localVideo.style.display = 'block';
      localVideoPlaceholder.style.display = 'none';
    } else {
      localVideo.style.display = 'none';
      localVideoPlaceholder.style.display = 'flex';
    }
    
    // Mettre à jour les contrôles vidéo
    updateVideoControls();
    updateVideoStatus('local', true, !localStream.getAudioTracks()[0]?.enabled, !track.enabled);
    
    // Afficher la notification
    if (window.showNotification) {
      window.showNotification(`Caméra ${isCamEnabled ? 'activée' : 'désactivée'}`, isCamEnabled ? 'success' : 'error');
    }
    
    console.log(`📹 Caméra ${track.enabled ? 'activée' : 'désactivée'}`);
  }
}

// Mettre à jour le stream local (pour partage d'écran)
function updateLocalStream(newStream) {
  console.log('🔄 Mise à jour du stream local...');
  
  if (localStream) {
    // Arrêter l'ancien stream
    localStream.getTracks().forEach(track => track.stop());
  }
  
  localStream = newStream;
  
  // Mettre à jour toutes les connexions peer existantes
  peerConnections.forEach((connection, userId) => {
    console.log(`🔄 Mise à jour stream pour ${userId}`);
    
    // Remplacer les tracks existants
    const senders = connection.getSenders();
    const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
    const audioSender = senders.find(sender => sender.track && sender.track.kind === 'audio');
    
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      const audioTrack = localStream.getAudioTracks()[0];
      
      // Remplacer la piste vidéo
      if (videoTrack && videoSender) {
        videoSender.replaceTrack(videoTrack);
        console.log(`📹 Piste vidéo remplacée pour ${userId}`);
      } else if (videoTrack) {
        connection.addTrack(videoTrack, localStream);
        console.log(`📹 Nouvelle piste vidéo ajoutée pour ${userId}`);
      }
      
      // Remplacer la piste audio
      if (audioTrack && audioSender) {
        audioSender.replaceTrack(audioTrack);
        console.log(`🎤 Piste audio remplacée pour ${userId}`);
      } else if (audioTrack) {
        connection.addTrack(audioTrack, localStream);
        console.log(`🎤 Nouvelle piste audio ajoutée pour ${userId}`);
      }
    }
  });
  
  // Mettre à jour l'affichage local
  const localVideo = document.getElementById('localVideo');
  if (localVideo && localStream) {
    localVideo.srcObject = localStream;
    console.log('📹 Affichage local mis à jour');
  }
  
  console.log('✅ Stream local mis à jour et transmis à tous les participants');
}

// Ajouter un indicateur de partage d'écran distant
function addRemoteScreenShareIndicator(userId) {
  // Supprimer l'ancien indicateur s'il existe
  removeRemoteScreenShareIndicator(userId);
  
  const indicator = document.createElement('div');
  indicator.id = `remote-screen-share-${userId}`;
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    ">
      <div style="display: flex; align-items: center; gap: 8px;">
        <i class="fas fa-desktop" style="color: #4CAF50;"></i>
        <span>${userId} partage son écran</span>
      </div>
    </div>
  `;
  
  document.body.appendChild(indicator);
}

// Supprimer l'indicateur de partage d'écran distant
function removeRemoteScreenShareIndicator(userId) {
  const indicator = document.getElementById(`remote-screen-share-${userId}`);
  if (indicator) {
    indicator.remove();
  }
}

// Exporter les fonctions pour utilisation globale
window.WebRTC = {
  initialize: initializeWebRTC,
  startCall: startCall,
  endCall: endCall,
  cleanup: cleanupWebRTC,
  toggleMic: toggleMicrophoneWebRTC,
  toggleCam: toggleCameraWebRTC,
  handleOffer: handleOffer,
  handleAnswer: handleAnswer,
  handleIceCandidate: handleIceCandidate,
  updateLocalStream: updateLocalStream
};

// Exposer les fonctions d'indicateurs de partage d'écran
window.addRemoteScreenShareIndicator = addRemoteScreenShareIndicator;
window.removeRemoteScreenShareIndicator = removeRemoteScreenShareIndicator;
