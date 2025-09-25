// Variables globales
let socket = null;
let currentUser = null;
let currentMeeting = null;

// Variables d'authentification
let authToken = null;
let refreshToken = null;
let sessionId = null;
let localStream = null;
let targetId = null;

// Variables de partage d'écran
let currentScreenStream = null;
let isScreenSharing = false;
let screenShareBlocked = false; // Protection contre le redémarrage automatique

// Variables pour la barre de progression
let connectionProgress = 0;
let connectionStatus = 'Connexion en cours...';
let isScreenSharePaused = false;
let selectedShareType = 'screen';
let isAnnotationMode = false;
let isMicEnabled = true;
let isCamEnabled = true;
let isRecording = false;
let recordedChunks = [];
let mediaRecorder = null;
let recordingStartTime = null;
let recordingTimer = null;
let recordingTimerInterval = null;

// Variables DOM
let authContainer = null;
let mainContainer = null;
let prejoinContainer = null;
let meetingContainer = null;
let videoGrid = null;
let sidePanel = null;
let meetingsList = null;
let meetingTitle = null;
let participantsList = null;
let chatMessages = null;
let chatInput = null;
let recordingStatus = null;

// Variables pour les réunions
let pendingMeetingId = null;
let pendingMeetingPassword = null;

// Timer de réunion
let meetingTimer = null;
let meetingStartTime = null;

// Onglets panneau latéral
let currentSideTab = 'participants';
let unreadChatCount = 0;


// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 DOM chargé, initialisation...');
  
  // Initialiser les éléments DOM
  authContainer = document.getElementById('auth-container');
  mainContainer = document.getElementById('main-container');
  prejoinContainer = document.getElementById('prejoin-container');
  meetingContainer = document.getElementById('meeting-container');
  videoGrid = document.getElementById('videoGrid');
  sidePanel = document.getElementById('sidePanel');
  meetingsList = document.getElementById('upcoming-meetings');
  meetingTitle = document.getElementById('meeting-title');
  participantsList = document.getElementById('participants-list');
  chatMessages = document.getElementById('chat-messages');
  chatInput = document.getElementById('chat-input');
  recordingStatus = document.getElementById('recording-status');
  
  // Configurer les écouteurs d'événements
  setupEventListeners();
  setupAuthEventListeners();
  
  // Afficher la page de connexion par défaut et vérifier l'auth
  if (authContainer) authContainer.style.display = 'flex';
  if (mainContainer) mainContainer.style.display = 'none';
  checkAuth();
  
  console.log('✅ Application initialisée');
  // Focus automatique sur email
  setTimeout(() => document.getElementById('login-email')?.focus(), 0);
});

// Rendre switchView global (déclaré hors portée des closures)
function switchView(view) {
  document.querySelectorAll('.zoom-view').forEach(v => v.classList.add('hidden'));
  const target = document.getElementById(`view-${view}`);
  if (target) target.classList.remove('hidden');
}

// Initialiser l'application
function initializeApp() {}

async function checkAuth() {
  try {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      showAuth();
      return;
    }
    const res = await fetch('/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      showAuth();
      return;
    }
    const data = await res.json();
    currentUser = { id: data.user.id, username: data.user.username };
    const homeUsername = document.getElementById('home-username');
    if (homeUsername) homeUsername.textContent = currentUser.username;
    initSocket(token);
  showMain();
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.style.display = 'inline-block';
  } catch (_e) {
    showAuth();
  }
}


// Interface simple et épurée comme Zoom

// Configuration des écouteurs d'événements
function setupEventListeners() {
  console.log('🔧 Configuration des écouteurs d\'événements...');
  
  // Fonction helper pour ajouter un écouteur d'événement en toute sécurité
  const safeAddEventListener = (id, event, handler) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener(event, handler);
      console.log(`✅ Écouteur ${event} attaché à ${id}`);
      return true;
    } else {
      console.warn(`⚠️ Élément ${id} non trouvé, écouteur non attaché`);
      return false;
    }
  };

  // Bouton créer une réunion
  safeAddEventListener('create-meeting-btn', 'click', () => {
    console.log('🎯 Bouton "Créer une réunion" cliqué');
    showCreateMeetingModal();
  });

  // Bouton rejoindre une réunion
  safeAddEventListener('join-meeting-btn-home', 'click', () => {
    console.log('🎯 Bouton "Rejoindre" cliqué');
    showJoinMeetingModal();
  });

  // Bouton rejoindre rapide
  safeAddEventListener('quick-join-btn', 'click', () => {
    console.log('🎯 Bouton "Rejoindre rapide" cliqué');
    quickJoinMeeting();
  });

  // Navigation style Zoom
  const navBtns = document.querySelectorAll('.zoom-nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.zoom-nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.getAttribute('data-view');
      switchView(view);
      if (view === 'my-meetings') loadMyMeetings('upcoming');
      if (view === 'recordings') loadMyRecordings();
      if (view === 'calendar') renderCalendar();
    });
  });
// (moved to global)


  // Tabs Mes réunions
  document.querySelectorAll('#view-my-meetings .tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#view-my-meetings .tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const scope = tab.getAttribute('data-scope');
      loadMyMeetings(scope);
    });
  });

  // Soumission Planifier
  const schForm = document.getElementById('schedule-form');
  if (schForm) {
    schForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await scheduleMeetingFromForm();
    });
  }

  // Édition: soumission & annulation
  const editForm = document.getElementById('edit-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await submitEditForm();
    });
  }
  const editCancel = document.getElementById('edit-cancel');
  if (editCancel) {
    editCancel.addEventListener('click', () => {
      switchView('my-meetings');
    });
  }

  // Bouton planifier une réunion
  safeAddEventListener('schedule-meeting-btn', 'click', () => {
    console.log('🎯 Bouton "Planifier" cliqué');
    showNotification('Fonctionnalité de planification à venir', 'info');
  });

  // Bouton partage d'écran (page d'accueil)
  safeAddEventListener('share-screen-btn', 'click', () => {
    console.log('🎯 Bouton "Partage d\'écran" (accueil) cliqué');
    showNotification('Fonctionnalité de partage d\'écran à venir', 'info');
  });

  // Contrôles vidéo
  safeAddEventListener('btnToggleMic', 'click', () => {
    console.log('🎯 Bouton "Toggle Micro" cliqué');
    console.log('🔍 LocalStream disponible:', !!localStream);
    toggleMicrophone();
  });

  safeAddEventListener('btnToggleCam', 'click', () => {
    console.log('🎯 Bouton "Toggle Caméra" cliqué');
    console.log('🔍 LocalStream disponible:', !!localStream);
    toggleCamera();
  });

  safeAddEventListener('btnShareScreen', 'click', () => {
    console.log('🎯 Bouton "Partage d\'écran" (bas) cliqué');
    console.log('🔍 ScreenSharing actuel:', isScreenSharing);
    console.log('🔍 LocalStream disponible:', !!localStream);
    toggleScreenShare();
  });

  // Bouton partage dans le header
  safeAddEventListener('share-btn', 'click', () => {
    console.log('🎯 Bouton "Partager" (header) cliqué');
    console.log('🔍 ScreenSharing actuel:', isScreenSharing);
    console.log('🔍 LocalStream disponible:', !!localStream);
    toggleScreenShare();
  });

  // Bouton de minimisation
  safeAddEventListener('minimize-btn', 'click', () => {
    console.log('🎯 Bouton "Minimiser" cliqué');
    minimizeMeeting();
  });

  // Bouton d'enregistrement dans le header
  safeAddEventListener('record-btn', 'click', () => {
    console.log('🎯 Bouton "Enregistrer" (header) cliqué');
    toggleRecording();
  });

  // Bouton d'invitation dans le header
  safeAddEventListener('invite-btn', 'click', () => {
    console.log('🎯 Bouton "Inviter" (header) cliqué');
    inviteParticipants();
  });

  safeAddEventListener('btnLeave', 'click', () => {
    console.log('🎯 Bouton "Quitter" cliqué');
    leaveMeeting();
  });

  // Bouton Raise Hand
  safeAddEventListener('hand-btn', 'click', () => {
    console.log('🎯 Bouton "Lever la main" cliqué');
    toggleRaiseHand();
  });

  // Bouton Record
  safeAddEventListener('record-control-btn', 'click', () => {
    console.log('🎯 Bouton "Enregistrer" cliqué');
    toggleRecording();
  });

  // Boutons de basculement des onglets
  safeAddEventListener('participants-control-btn', 'click', () => {
    console.log('🎯 Bouton "Participants" cliqué');
    // Ouvrir le panneau latéral ET basculer vers l'onglet participants
    toggleSidePanel();
    setTimeout(() => switchToTab('participants'), 100);
  });

  safeAddEventListener('chat-control-btn', 'click', () => {
    console.log('🎯 Bouton "Chat" cliqué');
    console.log('🔍 Vérification des éléments avant basculement...');
    
    // Vérifier que les éléments existent
    const chatTab = document.getElementById('chat-tab');
    const participantsTab = document.getElementById('participants-tab');
    const chatBtn = document.getElementById('chat-control-btn');
    const participantsBtn = document.getElementById('participants-control-btn');
    
    console.log('Chat tab:', chatTab);
    console.log('Participants tab:', participantsTab);
    console.log('Chat button:', chatBtn);
    console.log('Participants button:', participantsBtn);
    
    // Ouvrir le panneau latéral ET basculer vers l'onglet chat
    toggleSidePanel();
    setTimeout(() => switchToTab('chat'), 100);
  });

  // Boutons des participants
  safeAddEventListener('invite-participants-btn', 'click', () => {
    console.log('🎯 Bouton "Inviter des participants" cliqué');
    inviteParticipants();
  });

  safeAddEventListener('participants-settings-btn', 'click', () => {
    console.log('🎯 Bouton "Paramètres des participants" cliqué');
    showParticipantsSettings();
  });

  safeAddEventListener('participants-search-input', 'input', (e) => {
    console.log('🔍 Recherche de participants:', e.target.value);
    searchParticipants(e.target.value);
  });

  // Boutons du chat
  safeAddEventListener('clear-chat-btn', 'click', () => {
    console.log('🎯 Bouton "Effacer le chat" cliqué');
    clearChat();
  });

  safeAddEventListener('chat-settings-btn', 'click', () => {
    console.log('🎯 Bouton "Paramètres du chat" cliqué');
    showChatSettings();
  });

  safeAddEventListener('emoji-btn', 'click', () => {
    console.log('🎯 Bouton "Emoji" cliqué');
    showEmojiPicker();
  });

  safeAddEventListener('attach-btn', 'click', () => {
    console.log('🎯 Bouton "Joindre fichier" cliqué');
    attachFile();
  });

  // Boutons du header
  safeAddEventListener('more-btn', 'click', () => {
    console.log('🎯 Bouton "Plus" cliqué');
    showMoreOptionsModal();
  });

  safeAddEventListener('more-control-btn', 'click', () => {
    console.log('🎯 Bouton "Plus" (contrôles) cliqué');
    showMoreOptionsModal();
  });

  // Fermer modal Plus d'options
  safeAddEventListener('close-more-options', 'click', () => {
    console.log('🎯 Fermer modal Plus d\'options');
    hideMoreOptionsModal();
  });

  // Options du modal Plus d'options
  safeAddEventListener('invite-participants', 'click', () => {
    console.log('🎯 Inviter des participants');
    inviteParticipants();
  });

  safeAddEventListener('meeting-settings', 'click', () => {
    console.log('🎯 Paramètres de réunion');
    showMeetingSettings();
  });

  safeAddEventListener('share-social', 'click', () => {
    console.log('🎯 Partager sur les réseaux sociaux');
    shareOnSocial();
  });

  safeAddEventListener('download-recording', 'click', () => {
    console.log('🎯 Télécharger l\'enregistrement');
    downloadRecording();
  });

  // Panneau latéral
  safeAddEventListener('participants-btn', 'click', () => {
    console.log('🎯 Bouton "Participants" cliqué');
    toggleSidePanel();
  });

  // Supprimé - conflit avec l'écouteur de basculement d'onglet

  safeAddEventListener('chat-btn', 'click', () => {
    console.log('🎯 Bouton "Chat" cliqué');
    toggleSidePanel();
    switchToChatTab();
  });

  // Supprimé - conflit avec l'autre écouteur

  // Confirmer rejoindre
  safeAddEventListener('confirm-join-meeting-btn', 'click', () => {
    console.log('🎯 Bouton "Confirmer rejoindre" cliqué');
    joinMeetingConfirm();
  });

  // Bouton d'annulation de rejoindre une réunion
  safeAddEventListener('cancel-join-meeting-btn', 'click', () => {
    console.log('🎯 Bouton "Annuler" cliqué');
    hideJoinMeetingModal();
  });

  // Fermer le modal de rejoindre
  safeAddEventListener('close-join-meeting-btn', 'click', () => {
    console.log('🎯 Bouton "Fermer rejoindre" cliqué');
    hideJoinMeetingModal();
  });

  // Bouton des enregistrements
  safeAddEventListener('recordings-btn', 'click', () => {
    console.log('🎯 Bouton "Enregistrements" cliqué');
    showRecordingsModal();
  });

  // Fermer le modal des enregistrements
  safeAddEventListener('close-recordings-btn', 'click', () => {
    console.log('🎯 Bouton "Fermer enregistrements" cliqué');
    hideRecordingsModal();
  });

  // Contrôles de l'aperçu de la caméra
  safeAddEventListener('toggle-camera-preview', 'click', () => {
    console.log('🎯 Bouton "Toggle caméra preview" cliqué');
    toggleCameraPreview();
  });

  safeAddEventListener('toggle-mic-preview', 'click', () => {
    console.log('🎯 Bouton "Toggle micro preview" cliqué');
    toggleMicPreview();
  });

  // Modal de création de réunion
  safeAddEventListener('close-create-meeting-btn', 'click', () => {
    console.log('🎯 Bouton "Fermer créer réunion" cliqué');
    hideCreateMeetingModal();
  });

  safeAddEventListener('confirm-create-meeting-btn', 'click', () => {
    console.log('🎯 Bouton "Créer la réunion" cliqué');
    createMeetingConfirm();
  });

  // Contrôles de l'aperçu de la caméra pour création
  safeAddEventListener('toggle-create-camera-preview', 'click', () => {
    console.log('🎯 Bouton "Toggle caméra preview création" cliqué');
    toggleCreateCameraPreview();
  });

  safeAddEventListener('toggle-create-mic-preview', 'click', () => {
    console.log('🎯 Bouton "Toggle micro preview création" cliqué');
    toggleCreateMicPreview();
  });

  // Event listeners pour le menu Plus d'options
  safeAddEventListener('more-control-btn', 'click', () => {
    console.log('🎯 Bouton "Plus d\'options" cliqué');
    toggleMoreOptionsMenu();
  });


  // Fermer le menu Plus d'options quand on clique ailleurs
  document.addEventListener('click', (e) => {
    const moreContainer = document.querySelector('.more-options-container');
    const menu = document.getElementById('more-options-menu');
    
    if (moreContainer && menu && !moreContainer.contains(e.target) && !menu.classList.contains('hidden')) {
      hideMoreOptionsMenu();
    }
  });

  console.log('✅ Écouteurs d\'événements configurés');
}

// Configuration des écouteurs d'authentification
function setupAuthEventListeners() {
  // Écouteur pour le formulaire de connexion
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      login();
    });
  }

  // Écouteur pour le formulaire d'inscription
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      register();
    });
  }

  // Écouteur pour le lien "S'inscrire"
  const showRegisterLink = document.getElementById('show-register-link');
  if (showRegisterLink) {
    showRegisterLink.addEventListener('click', function(e) {
      e.preventDefault();
      showRegister();
    });
  }

  // Écouteur pour le lien "Se connecter"
  const showLoginLink = document.getElementById('show-login-link');
  if (showLoginLink) {
    showLoginLink.addEventListener('click', function(e) {
      e.preventDefault();
      showLogin();
    });
  }

  // Bouton de copie de l'ID de réunion
  const copyMeetingIdBtn = document.getElementById('copy-meeting-id');
  if (copyMeetingIdBtn) {
    copyMeetingIdBtn.addEventListener('click', copyMeetingId);
  }

  // Bouton de déconnexion (header)
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async function() {
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const sessionId = localStorage.getItem('sessionId');
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken, sessionId })
        }).catch(() => {});
      } finally {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('sessionId');
        if (socket) try { socket.disconnect(); } catch(_) {}
      showAuth();
        // Afficher/masquer boutons
        document.getElementById('btnLogout').style.display = 'none';
      }
    });
  }
}

// Fonctions d'authentification (réelles)
async function login() {
  try {
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value || '';
    if (!email || !password) return;

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Erreur de connexion');

    localStorage.setItem('accessToken', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
    localStorage.setItem('sessionId', data.sessionId);
    localStorage.setItem('username', data.user.username);

    // Connexion Socket.IO avec token
    initSocket(data.tokens.accessToken);
    showMain();
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.style.display = 'inline-block';
  } catch (err) {
    alert(err.message);
  }
}

async function register() {
  try {
    const username = document.getElementById('register-username')?.value?.trim();
    const email = document.getElementById('register-email')?.value?.trim();
    const password = document.getElementById('register-password')?.value || '';
    if (!username || !email || !password) return;

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, confirmPassword: password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || 'Erreur d\'inscription');

    // Enchaîner sur la connexion
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = password;
    showLogin();
  } catch (err) {
    alert(err.message);
  }
}

function showRegister() {
  document.getElementById('login-form-container').style.display = 'none';
  document.getElementById('register-form-container').style.display = 'block';
}

function showLogin() {
  document.getElementById('register-form-container').style.display = 'none';
  document.getElementById('login-form-container').style.display = 'block';
}

function showAuth() {
  console.log('🔐 Affichage de l\'interface d\'authentification');
  if (authContainer) authContainer.style.display = 'flex';
  if (mainContainer) mainContainer.style.display = 'none';
}

function showMain() {
  console.log('🏠 Affichage de l\'interface principale');
  if (authContainer) authContainer.style.display = 'none';
  if (mainContainer) mainContainer.style.display = 'block';
}

// Socket.IO avec JWT
function initSocket(accessToken) {
  if (socket && socket.connected) return;
  socket = io({
    auth: { token: accessToken }
  });
  socket.on('connect', () => {
    console.log('✅ Socket connecté', socket.id);
  });
  socket.on('connect_error', (err) => {
    console.error('❌ Erreur Socket.IO', err.message);
  });

  // Participants temps réel
  socket.on('participant-joined', (p) => {
    try {
      addParticipantItem(p.userId, p.username, 'online');
      showRemoteVideo(p.userId, p.username);
      // Message système dans le chat
      addChatMessage('Système', `${p.username} a rejoint la réunion`, false, true);
      
      // Démarrer la communication WebRTC
      if (window.WebRTC && isInMeeting) {
        console.log(`🚀 Démarrage WebRTC avec ${p.username} (${p.userId})`);
        window.WebRTC.startCall(p.userId);
      }
    } catch (e) { console.error(e); }
  });
  socket.on('participant-left', (p) => {
    try {
      removeParticipantItem(p.userId);
      hideRemoteVideo();
      // Message système dans le chat
      addChatMessage('Système', `${p.username} a quitté la réunion`, false, true);
      
      // Nettoyer la connexion WebRTC
      if (window.WebRTC) {
        console.log(`🧹 Nettoyage WebRTC avec ${p.username} (${p.userId})`);
        window.WebRTC.endCall(p.userId);
      }
    } catch (e) { console.error(e); }
  });
  socket.on('participant-ejected', (p) => {
    try {
      removeParticipantItem(p.ejectedUserId);
    } catch (e) { console.error(e); }
  });

  // Événement de départ d'utilisateur
  socket.on('user-left-meeting', (data) => {
    console.log('👋 Utilisateur a quitté la réunion:', data);
    try {
      // Afficher une notification pour informer les autres participants
      showNotification(data.message, 'info');
      
      // Retirer l'utilisateur de la liste des participants
      removeParticipantItem(data.userId);
      
      // Mettre à jour le compteur de participants
      updateParticipantCount();
      
      console.log(`✅ ${data.username} a quitté la réunion`);
    } catch (e) { 
      console.error('❌ Erreur lors du traitement du départ:', e); 
    }
  });

  // Événements WebRTC
  socket.on('offer', (data) => {
    console.log('📤 Offre WebRTC reçue de:', data.from);
    if (window.WebRTC) {
      window.WebRTC.handleOffer(data);
    }
  });

  socket.on('answer', (data) => {
    console.log('📥 Réponse WebRTC reçue de:', data.from);
    if (window.WebRTC) {
      window.WebRTC.handleAnswer(data);
    }
  });

  socket.on('ice-candidate', (data) => {
    console.log('🧊 ICE candidate reçu de:', data.from);
    if (window.WebRTC) {
      window.WebRTC.handleIceCandidate(data);
    }
  });

  // Gestionnaires pour les réunions
  socket.on('meeting-created', (data) => {
    console.log('✅ Réunion créée:', data);
    currentMeeting = data.meetingId;
    isInMeeting = true; // Marquer qu'on est dans une réunion
    initializeMeeting(data.meetingId);
    showMeeting();
    
    // Initialiser le stream local immédiatement
    initializeLocalStream();
    
    // Initialiser WebRTC
    if (window.WebRTC) {
      console.log('🚀 Initialisation WebRTC pour la réunion');
      window.WebRTC.initialize();
    }
  });

  socket.on('meeting-joined', (data) => {
    console.log('✅ Réunion rejointe:', data);
    currentMeeting = data.meetingId;
    isInMeeting = true; // Marquer qu'on est dans une réunion
    initializeMeeting(data.meetingId);
    showMeeting();
    
    // Initialiser le stream local immédiatement
    initializeLocalStream();
    
    // Initialiser WebRTC
    if (window.WebRTC) {
      console.log('🚀 Initialisation WebRTC pour rejoindre la réunion');
      window.WebRTC.initialize();
    }
    
    // Demander la liste des participants existants
    if (socket && currentMeeting) {
      console.log('📋 Demande de la liste des participants pour:', currentMeeting);
      socket.emit('get-participants', { meetingId: currentMeeting });
    }
  });

  socket.on('participants-list', (participants) => {
    console.log('👥 Participants existants:', participants);
    
    // Afficher les participants existants
    participants.forEach(participant => {
      // Ne pas s'afficher soi-même (comparer avec l'ID de socket ou l'ID utilisateur)
      if (participant.userId !== socket.userId && participant.userId !== currentUser?.id) {
        console.log(`👤 Affichage participant existant: ${participant.username} (${participant.userId})`);
        addParticipantItem(participant.userId, participant.username, 'online');
        showRemoteVideo(participant.userId, participant.username);
        
        // Démarrer la communication WebRTC avec les participants existants
        if (window.WebRTC && isInMeeting) {
          console.log(`🚀 Démarrage WebRTC avec participant existant ${participant.username} (${participant.userId})`);
          window.WebRTC.startCall(participant.userId);
        }
      } else {
        console.log(`🚫 Participant ignoré (soi-même): ${participant.username} (${participant.userId})`);
      }
    });
  });

  // Événements d'enregistrement
  socket.on('recording-started', (data) => {
    console.log('🎬 Enregistrement démarré:', data);
    isRecording = true;
    recordingStartTime = new Date();
    updateRecordingButtons(true);
    showRecordingIndicator(true);
    startRecordingTimer();
    showNotification(`Enregistrement démarré par ${data.startedBy}`, 'success');
  });

  socket.on('recording-stopped', (data) => {
    console.log('🛑 Enregistrement arrêté:', data);
    isRecording = false;
    recordingStartTime = null;
    updateRecordingButtons(false);
    showRecordingIndicator(false);
    stopRecordingTimer();
    showNotification(`Enregistrement arrêté par ${data.stoppedBy}`, 'info');
  });

  socket.on('recording-error', (data) => {
    console.error('❌ Erreur d\'enregistrement:', data);
    showNotification(`Erreur d'enregistrement: ${data.message}`, 'error');
  });

  // Gestion des événements de partage d'écran
  socket.on('screen-share-started', (data) => {
    console.log('🖥️ Partage d\'écran démarré par:', data.username);
    showNotification(`${data.username} a commencé à partager son écran`, 'info');
    
    // Basculer vers le layout de partage d'écran
    switchToScreenShareLayout(data.username, data.userId);
    
    // Ajouter un indicateur de partage d'écran distant
    if (window.addRemoteScreenShareIndicator) {
      window.addRemoteScreenShareIndicator(data.username);
    }
    
    // Confirmer la réception du partage d'écran
    if (socket && currentMeeting) {
      socket.emit('screen-share-confirmation', {
        meetingId: currentMeeting,
        fromUserId: data.userId,
        confirmed: true,
        username: currentUser ? currentUser.username : 'Utilisateur'
      });
    }
  });

  socket.on('screen-share-stopped', (data) => {
    console.log('🖥️ Partage d\'écran arrêté par:', data.username);
    showNotification(`${data.username} a arrêté le partage d\'écran`, 'info');
    
    // Revenir au layout normal
    switchToNormalLayout();
    
    // Supprimer l'indicateur de partage d'écran distant
    if (window.removeRemoteScreenShareIndicator) {
      window.removeRemoteScreenShareIndicator(data.username);
    }
  });

  socket.on('screen-share-paused', (data) => {
    console.log('⏸️ Partage d\'écran en pause par:', data.username);
    showNotification(`${data.username} a mis en pause le partage d\'écran`, 'info');
  });

  socket.on('screen-share-resumed', (data) => {
    console.log('▶️ Partage d\'écran repris par:', data.username);
    showNotification(`${data.username} a repris le partage d\'écran`, 'info');
  });

  // Confirmation de réception du partage d'écran
  socket.on('screen-share-confirmation', (data) => {
    console.log(`✅ ${data.username} confirme voir votre partage d'écran`);
    showNotification(`✅ ${data.username} voit votre écran partagé`, 'success');
    
    // Mettre à jour l'indicateur de partage d'écran
    if (isScreenSharing) {
      const confirmationsDiv = document.getElementById('screen-share-confirmations');
      if (confirmationsDiv) {
        const currentText = confirmationsDiv.innerHTML;
        if (currentText.includes('En attente')) {
          confirmationsDiv.innerHTML = `✅ ${data.username} voit votre écran`;
        } else {
          confirmationsDiv.innerHTML = currentText + `, ${data.username}`;
        }
      }
    }
  });

  socket.on('error', (data) => {
    console.error('❌ Erreur Socket.IO:', data);
    showNotification(data.message || 'Erreur de connexion', 'error');
  });
}

// API helpers Zoom-like
async function scheduleMeetingFromForm() {
  const title = document.getElementById('sch-title')?.value?.trim();
  const date = document.getElementById('sch-date')?.value;
  const duration = parseInt(document.getElementById('sch-duration')?.value || '60', 10);
  const password = document.getElementById('sch-password')?.value?.trim() || null;
  if (!title || !date) return alert('Titre et date requis');
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/meetings/schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, scheduledFor: date, durationMin: duration, password })
  });
  const data = await res.json();
  if (!res.ok) return alert(data?.error || 'Erreur planification');
  alert('Réunion planifiée');
}

async function loadMyMeetings(scope) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`/api/meetings/mine?scope=${scope}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) return;
  const container = document.getElementById('my-meetings-list');
  if (!container) return;
  container.innerHTML = '';
  data.meetings.forEach(m => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `<div><strong>${m.title}</strong><br><small>${new Date(m.scheduledFor).toLocaleString()} • ${m.durationMin} min</small></div><div><button class="btn btn-secondary" data-id="${m.id}" data-act="edit">Éditer</button> <button class="btn btn-danger" data-id="${m.id}" data-act="cancel">Annuler</button></div>`;
    container.appendChild(div);
  });

  // Délégation d'événements pour actions Éditer/Annuler
  if (!container._actionsBound) {
    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const act = btn.getAttribute('data-act');
      const id = btn.getAttribute('data-id');
      if (act === 'cancel') {
        if (!confirm('Annuler cette réunion ?')) return;
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) loadMyMeetings(document.querySelector('#view-my-meetings .tab-btn.active')?.getAttribute('data-scope') || 'upcoming');
      } else if (act === 'edit') {
        const meeting = data.meetings.find(x => x.id === id);
        if (!meeting) return;
        document.getElementById('edit-id').value = meeting.id;
        document.getElementById('edit-title').value = meeting.title;
        document.getElementById('edit-date').value = (typeof meeting.scheduledFor === 'string' ? meeting.scheduledFor : new Date(meeting.scheduledFor).toISOString()).substring(0,16);
        document.getElementById('edit-duration').value = meeting.durationMin;
        document.getElementById('edit-password').value = meeting.password || '';
        switchView('edit');
      }
    });
    container._actionsBound = true;
  }
}

async function loadMyRecordings() {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/recordings/mine', { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) return;
  const container = document.getElementById('my-recordings-list');
  if (!container) return;
  container.innerHTML = '';
  data.recordings.forEach(r => {
    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `<div><strong>Enregistrement</strong><br><small>${new Date(r.startedAt).toLocaleString()} → ${new Date(r.endedAt).toLocaleString()}</small></div><div><a class="btn btn-primary" href="${r.filePath}" download>Télécharger</a></div>`;
    container.appendChild(div);
  });
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const base = new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const startDay = first.getDay() || 7; // Monday=1 .. Sunday=7
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startDay - 1 + daysInMonth) / 7) * 7;
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - (startDay - 2);
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    if (dayNum >= 1 && dayNum <= daysInMonth) {
      const d = document.createElement('div');
      d.className = 'day';
      d.textContent = String(dayNum);
      cell.appendChild(d);
    }
    grid.appendChild(cell);
  }
  // Charger puis placer les événements rapides (optionnel v1)
  // On peut ultérieurement requêter /api/meetings/mine?from=&to= pour remplir.
}

async function submitEditForm() {
  const id = document.getElementById('edit-id').value;
  const title = document.getElementById('edit-title').value.trim();
  const scheduledFor = document.getElementById('edit-date').value;
  const durationMin = parseInt(document.getElementById('edit-duration').value || '60', 10);
  const password = document.getElementById('edit-password').value.trim() || null;
  if (!title || !scheduledFor) return alert('Champs requis manquants');
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`/api/meetings/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title, scheduledFor, durationMin, password }) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return alert(data?.error || 'Erreur de mise à jour');
  }
  switchView('my-meetings');
  const currentScope = document.querySelector('#view-my-meetings .tab-btn.active')?.getAttribute('data-scope') || 'upcoming';
  loadMyMeetings(currentScope);
}

// Fonctions pour les réunions
function startMeetingFromCreate() {
  console.log('🚀 Démarrage d\'une réunion depuis l\'accueil');
  
  // Générer un ID de réunion unique
  const meetingId = generateMeetingId();
  currentMeeting = meetingId;
  window.currentMeetingId = meetingId;
  
  // Démarrer la réunion
  initializeMeeting(meetingId);
  showMeeting();
  
  showNotification(`Réunion "${meetingId}" créée et démarrée`, 'success');
}

function generateMeetingId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function initializeMeeting(meetingId) {
  console.log('🎯 Initialisation de la réunion:', meetingId);
  
  // Mettre à jour le titre de la réunion
  const meetingTitleElement = document.querySelector('.meeting-title');
  if (meetingTitleElement) {
    meetingTitleElement.textContent = 'Réunion instantanée';
  }
  
  // Démarrer le timer
  startMeetingTimer();
  
  // Démarrer le stream local
  startLocalStream();
  
  // Initialiser la connexion WebRTC
  initializeWebRTC();
  
  // Mettre à jour l'interface
  updateMeetingInterface();
}

function startMeetingTimer() {
  meetingStartTime = new Date();
  meetingTimer = setInterval(() => {
    const now = new Date();
    const elapsed = Math.floor((now - meetingStartTime) / 1000);
    
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    
    const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const timerElement = document.querySelector('.meeting-timer');
    if (timerElement) {
      timerElement.textContent = timeString;
    }
  }, 1000);
}

async function startLocalStream() {
  try {
    console.log('📹 Démarrage du stream local...');
    
    const constraints = {
      video: { width: 640, height: 480 },
      audio: true
    };
    
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Afficher la vidéo locale
    const localVideo = document.getElementById('localVideo');
    const localVideoPlaceholder = document.getElementById('localVideoPlaceholder');
    if (localVideo && localVideoPlaceholder) {
      localVideo.srcObject = localStream;
      localVideo.style.display = 'block';
      localVideoPlaceholder.style.display = 'none';
    }
    
    // Initialiser les boutons de contrôle
    initializeControlButtons();
    
    console.log('✅ Stream local démarré');
    return localStream;
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du stream local:', error);
    showNotification('Erreur lors de l\'accès à la caméra/microphone', 'error');
    throw error;
  }
}

function initializeWebRTC() {
  console.log('🔗 Initialisation WebRTC...');
  
  // Configuration des serveurs STUN/TURN
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };
  
  // Initialiser la connexion peer
  const peerConnection = new RTCPeerConnection(configuration);
  
  // Ajouter le stream local
  if (localStream) {
    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });
  }
  
  console.log('✅ WebRTC initialisé');
}

// Initialiser le stream local
async function initializeLocalStream(retryCount = 0) {
  try {
    console.log(`🎥 Initialisation du stream local... (tentative ${retryCount + 1})`);
    
    if (localStream) {
      console.log('✅ Stream local déjà initialisé');
      return localStream;
    }
    
    // Vérifier les permissions d'abord
    try {
      const permissions = await navigator.permissions.query({ name: 'camera' });
      if (permissions.state === 'denied') {
        throw new Error('Permission caméra refusée');
      }
    } catch (permError) {
      console.log('⚠️ Impossible de vérifier les permissions, continuation...');
    }
    
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true
      }
    };
    
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Exposer le stream local globalement pour WebRTC
    window.localStream = localStream;
    
    // Afficher la vidéo locale
    const localVideo = document.getElementById('localVideo');
    if (localVideo) {
      localVideo.srcObject = localStream;
      localVideo.style.display = 'block';
    }
    
    // Mettre à jour les indicateurs de statut
    updateLocalVideoStatus();
    
    console.log('✅ Stream local initialisé avec succès');
    return localStream;
    
  } catch (error) {
    console.error(`❌ Erreur lors de l'initialisation du stream local (tentative ${retryCount + 1}):`, error);
    
    // Système de retry pour les erreurs temporaires
    if (retryCount < 3 && (error.name === 'NotReadableError' || error.name === 'NotAllowedError')) {
      console.log(`🔄 Retry dans 2 secondes... (${retryCount + 1}/3)`);
      showNotification(`Tentative ${retryCount + 1}/3 - Réessai dans 2 secondes...`, 'warning');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      return initializeLocalStream(retryCount + 1);
    }
    
    // Gestion des erreurs spécifiques
    let errorMessage = 'Erreur lors de l\'accès à la caméra/microphone';
    
    if (error.name === 'NotReadableError') {
      errorMessage = 'Caméra déjà utilisée par une autre application. Fermez Zoom, Teams, ou autres applications vidéo.';
    } else if (error.name === 'NotAllowedError') {
      errorMessage = 'Permission caméra/microphone refusée. Autorisez l\'accès dans les paramètres du navigateur.';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'Aucune caméra trouvée. Vérifiez que votre caméra est connectée.';
    } else if (error.name === 'OverconstrainedError') {
      errorMessage = 'Paramètres caméra non supportés. Essayez avec des paramètres plus basiques.';
    }
    
    showNotification(errorMessage, 'error');
    throw error;
  }
}

// Mettre à jour les indicateurs de statut local
function updateLocalVideoStatus() {
  if (!localStream) return;
  
  const videoTracks = localStream.getVideoTracks();
  const audioTracks = localStream.getAudioTracks();
  
  isMicEnabled = audioTracks[0]?.enabled || false;
  isCamEnabled = videoTracks.length > 0 && videoTracks[0].enabled;
  
  // Mettre à jour les boutons
  updateMicButton();
  updateCameraButton();
}

// Mettre à jour le bouton microphone
function updateMicButton() {
  const micBtn = document.getElementById('btnToggleMic');
  const micStatus = document.getElementById('localMicStatus');
  
  if (micBtn) {
    micBtn.classList.toggle('muted', !isMicEnabled);
  }
  
  if (micStatus) {
    micStatus.classList.toggle('muted', !isMicEnabled);
    micStatus.classList.toggle('active', isMicEnabled);
  }
}

// Mettre à jour le bouton caméra
function updateCameraButton() {
  const camBtn = document.getElementById('btnToggleCam');
  const camStatus = document.getElementById('localCameraStatus');
  
  if (camBtn) {
    camBtn.classList.toggle('muted', !isCamEnabled);
  }
  
  if (camStatus) {
    camStatus.classList.toggle('muted', !isCamEnabled);
    camStatus.classList.toggle('active', isCamEnabled);
  }
}


// Fonctions de gestion des vidéos des participants
function showRemoteVideo(userId, username) {
  const remoteVideoContainer = document.getElementById('remoteVideoContainer');
  const remoteVideoPlaceholder = document.getElementById('remoteVideoPlaceholder');
  const remoteVideoLabel = document.getElementById('remoteVideoLabel');
  const remoteVideoStatus = document.getElementById('remoteVideoStatus');
  
  if (remoteVideoContainer && remoteVideoPlaceholder) {
    remoteVideoPlaceholder.innerHTML = `
      <i class="fas fa-user"></i>
      <span>${username}</span>
    `;
    remoteVideoPlaceholder.style.display = 'flex';
    
    if (remoteVideoLabel) {
      remoteVideoLabel.textContent = username;
      remoteVideoLabel.style.display = 'block';
    }
    
    if (remoteVideoStatus) {
      remoteVideoStatus.style.display = 'flex';
    }
  }
}

function hideRemoteVideo() {
  const remoteVideoContainer = document.getElementById('remoteVideoContainer');
  const remoteVideoPlaceholder = document.getElementById('remoteVideoPlaceholder');
  const remoteVideoLabel = document.getElementById('remoteVideoLabel');
  const remoteVideoStatus = document.getElementById('remoteVideoStatus');
  
  if (remoteVideoContainer && remoteVideoPlaceholder) {
    remoteVideoPlaceholder.innerHTML = `
      <i class="fas fa-user"></i>
      <span>En attente de participants...</span>
    `;
    
    if (remoteVideoLabel) {
      remoteVideoLabel.style.display = 'none';
    }
    
    if (remoteVideoStatus) {
      remoteVideoStatus.style.display = 'none';
    }
  }
}

function updateVideoStatus(userId, isLocal, micMuted, cameraOff) {
  const micStatus = document.getElementById(isLocal ? 'localMicStatus' : 'remoteVideoStatus');
  const cameraStatus = document.getElementById(isLocal ? 'localCameraStatus' : 'remoteVideoStatus');
  
  if (micStatus) {
    const micIcon = micStatus.querySelector('.mic');
    if (micIcon) {
      micIcon.classList.toggle('active', !micMuted);
      const icon = micIcon.querySelector('i');
      if (icon) {
        icon.className = micMuted ? 'fas fa-microphone-slash' : 'fas fa-microphone';
      }
    }
  }
  
  if (cameraStatus) {
    const cameraIcon = cameraStatus.querySelector('.camera');
    if (cameraIcon) {
      cameraIcon.classList.toggle('active', !cameraOff);
      const icon = cameraIcon.querySelector('i');
      if (icon) {
        icon.className = cameraOff ? 'fas fa-video-slash' : 'fas fa-video';
      }
    }
  }
}

function toggleMicrophone() {
  console.log('🎤 toggleMicrophone appelé');
  console.log('🔍 isInMeeting:', isInMeeting);
  console.log('🔍 currentMeeting:', currentMeeting);
  console.log('🔍 localStream:', !!localStream);
  console.log('🔍 window.localStream:', !!window.localStream);
  
  // Utiliser WebRTC si disponible
  if (window.WebRTC && window.WebRTC.toggleMic) {
    console.log('🎤 Utilisation de WebRTC.toggleMic');
    window.WebRTC.toggleMic();
    return;
  }
  
  // Fallback vers l'ancienne méthode
  if (!localStream) {
    console.warn('⚠️ Aucun stream local disponible');
    console.log('🔍 Tentative d\'initialisation du stream local...');
    
    // Essayer d'initialiser le stream local si on est dans une réunion
    if (isInMeeting) {
      initializeLocalStream();
      return;
    }
    
    showNotification('Veuillez d\'abord démarrer une réunion', 'warning');
    return;
  }
  
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    const audioTrack = audioTracks[0];
    audioTrack.enabled = !audioTrack.enabled;
    isMicEnabled = audioTrack.enabled;
    
    // Mettre à jour l'indicateur de statut vidéo
    updateVideoStatus('local', true, !audioTrack.enabled, false);
    
    // Synchroniser tous les boutons microphone
    syncMicrophoneButtons(isMicEnabled);
    
    console.log('🎤 Microphone:', isMicEnabled ? 'activé' : 'désactivé');
    showNotification(`Microphone ${isMicEnabled ? 'activé' : 'désactivé'}`, isMicEnabled ? 'success' : 'error');
  }
}

function toggleCamera() {
  console.log('📹 toggleCamera appelé');
  console.log('🔍 isInMeeting:', isInMeeting);
  console.log('🔍 currentMeeting:', currentMeeting);
  console.log('🔍 localStream:', !!localStream);
  console.log('🔍 window.localStream:', !!window.localStream);
  
  // Utiliser WebRTC si disponible
  if (window.WebRTC && window.WebRTC.toggleCam) {
    console.log('📹 Utilisation de WebRTC.toggleCam');
    window.WebRTC.toggleCam();
    return;
  }
  
  // Fallback vers l'ancienne méthode
  if (!localStream) {
    console.warn('⚠️ Aucun stream local disponible');
    console.log('🔍 Tentative d\'initialisation du stream local...');
    
    // Essayer d'initialiser le stream local si on est dans une réunion
    if (isInMeeting) {
      initializeLocalStream();
      return;
    }
    
    showNotification('Veuillez d\'abord démarrer une réunion', 'warning');
    return;
  }
  
  const videoTracks = localStream.getVideoTracks();
  if (videoTracks.length > 0) {
    const videoTrack = videoTracks[0];
    videoTrack.enabled = !videoTrack.enabled;
    isCamEnabled = videoTrack.enabled;
    
    // Synchroniser tous les boutons caméra
    syncCameraButtons(isCamEnabled);
    
    console.log('📹 Caméra:', isCamEnabled ? 'activée' : 'désactivée');
    showNotification(`Caméra ${isCamEnabled ? 'activée' : 'désactivée'}`, isCamEnabled ? 'success' : 'error');
  }
}

function toggleScreenShare() {
  console.log('🖥️ Toggle Screen Share appelé');
  console.log('🔍 État actuel isScreenSharing:', isScreenSharing);
  
  if (isScreenSharing) {
    console.log('🛑 Arrêt du partage d\'écran...');
    stopScreenShare();
  } else {
    console.log('▶️ Démarrage du partage d\'écran...');
    startScreenShare();
  }
}

// Fonction pour mettre à jour le bouton de partage d'écran
function updateScreenShareButton(isSharing) {
  // Bouton dans la barre de contrôle du bas
  const shareBtn = document.getElementById('btnShareScreen');
  if (shareBtn) {
    if (isSharing) {
      shareBtn.classList.add('active');
      shareBtn.innerHTML = '<i class="fas fa-stop"></i>';
    } else {
      shareBtn.classList.remove('active');
      shareBtn.innerHTML = '<i class="fas fa-desktop"></i>';
    }
  }

  // Bouton dans le header
  const headerShareBtn = document.getElementById('share-btn');
  if (headerShareBtn) {
    if (isSharing) {
      headerShareBtn.classList.add('active');
      headerShareBtn.innerHTML = '<i class="fas fa-stop"></i>Arrêter le partage';
    } else {
      headerShareBtn.classList.remove('active');
      headerShareBtn.innerHTML = '<i class="fas fa-desktop"></i>Partager';
    }
  }
}

// Fonction pour forcer la mise à jour de l'interface de partage d'écran
function updateScreenShareInterface() {
  console.log('🔄 Mise à jour de l\'interface de partage d\'écran...');
  
  // Masquer l'interface de partage d'écran si elle est visible
  const screenShareLayout = document.getElementById('screenShareLayout');
  if (screenShareLayout) {
    screenShareLayout.style.display = 'none';
    console.log('✅ Interface de partage d\'écran masquée');
  }
  
  // Désactiver la zone principale d'écran partagé
  const screenShareMain = document.getElementById('screenShareMain');
  if (screenShareMain) {
    screenShareMain.classList.remove('active');
    console.log('✅ Zone principale d\'écran partagé désactivée');
  }
  
  // Supprimer la classe screen-sharing du container
  const meetingContainer = document.getElementById('meeting-container');
  if (meetingContainer) {
    meetingContainer.classList.remove('screen-sharing');
    console.log('✅ Classe screen-sharing supprimée');
  }
  
  // Afficher la grille vidéo normale
  const videoGrid = document.getElementById('videoGrid');
  if (videoGrid) {
    videoGrid.style.display = 'flex';
    videoGrid.style.flexDirection = 'column';
    videoGrid.style.alignItems = 'center';
    videoGrid.style.justifyContent = 'center';
    videoGrid.style.gap = '20px';
    videoGrid.style.height = '100%';
    console.log('✅ Grille vidéo normale affichée');
  }
  
  // Forcer le reflow pour s'assurer que les changements sont appliqués
  if (videoGrid) {
    videoGrid.offsetHeight;
  }
  
  console.log('✅ Interface de partage d\'écran mise à jour');
}

async function startScreenShare() {
  try {
    console.log('🖥️ Démarrage du partage d\'écran...');
    
    // Vérifier si un partage d'écran est déjà en cours
    if (isScreenSharing) {
      console.log('⚠️ Un partage d\'écran est déjà en cours');
      showNotification('Un partage d\'écran est déjà en cours', 'warning');
      return;
    }
    
    // Vérifier si le partage d'écran est bloqué
    if (screenShareBlocked) {
      console.log('🚫 Partage d\'écran bloqué temporairement');
      showNotification('Veuillez attendre avant de redémarrer le partage d\'écran', 'warning');
      return;
    }
    
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });
    
    currentScreenStream = stream;
    isScreenSharing = true;
    
    // Mettre à jour le bouton
    updateScreenShareButton(true);
    
    // Remplacer la vidéo locale par le partage d'écran
    const localVideo = document.getElementById('localVideo');
    if (localVideo) {
      localVideo.srcObject = stream;
    }
    
    // Mettre à jour le stream WebRTC pour envoyer le partage d'écran
    if (window.WebRTC && window.WebRTC.updateLocalStream) {
      window.WebRTC.updateLocalStream(stream);
    }
    
    // Basculer vers le layout de partage d'écran
    const username = currentUser ? currentUser.username : 'Vous';
    switchToScreenShareLayout(username, currentUser ? currentUser.id : 'unknown');
    
    // Notifier les autres participants du partage d'écran
    if (socket && currentMeeting) {
      socket.emit('screen-share-started', {
        meetingId: currentMeeting,
        userId: currentUser ? currentUser.id : 'unknown',
        username: currentUser ? currentUser.username : 'Utilisateur'
      });
    }
    
    // Ajouter un indicateur visuel de partage d'écran
    addScreenShareIndicator();
    
    console.log('✅ Partage d\'écran démarré');
    showNotification('Partage d\'écran activé - En attente des confirmations...', 'success');
    
    // Désactiver complètement l'événement onended pour éviter le redémarrage automatique
    stream.getVideoTracks()[0].onended = null;
    console.log('🚫 Événement onended désactivé pour éviter le redémarrage automatique');
    
    // Ajouter une protection supplémentaire contre le redémarrage automatique
    stream.getVideoTracks()[0].addEventListener('ended', (event) => {
      event.preventDefault();
      event.stopPropagation();
      console.log('🚫 Événement ended bloqué pour éviter le redémarrage automatique');
    }, { once: true });
    
  } catch (error) {
    console.error('❌ Erreur lors du partage d\'écran:', error);
    
    // Gérer différents types d'erreurs
    if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
      console.log('🚫 Partage d\'écran annulé par l\'utilisateur');
      showNotification('Partage d\'écran annulé', 'info');
    } else if (error.name === 'NotFoundError') {
      showNotification('Aucun écran disponible pour le partage', 'error');
    } else if (error.name === 'NotSupportedError') {
      showNotification('Partage d\'écran non supporté par ce navigateur', 'error');
    } else {
      showNotification('Erreur lors du partage d\'écran: ' + error.message, 'error');
    }
    
    // S'assurer que l'état est cohérent
    isScreenSharing = false;
    currentScreenStream = null;
    updateScreenShareButton(false);
  }
}

function stopScreenShare() {
  console.log('🛑 Arrêt du partage d\'écran...');
  
  // Vérifier si un partage d'écran est en cours
  if (!isScreenSharing) {
    console.log('⚠️ Aucun partage d\'écran en cours');
    return;
  }
  
  // Activer le blocage temporaire pour empêcher le redémarrage automatique
  screenShareBlocked = true;
  console.log('🚫 Blocage temporaire du partage d\'écran activé');
  
  // Désactiver complètement l'événement onended sur tous les tracks
  if (currentScreenStream) {
    currentScreenStream.getTracks().forEach(track => {
      track.onended = null;
      console.log('🚫 Événement onended désactivé sur track:', track.kind);
    });
  }
  
  if (currentScreenStream) {
    currentScreenStream.getTracks().forEach(track => {
      track.stop();
      console.log('🛑 Track arrêté:', track.kind);
    });
    currentScreenStream = null;
  }
  
  isScreenSharing = false;
  
  // Mettre à jour le bouton immédiatement
  updateScreenShareButton(false);
  
  // Forcer la mise à jour de l'interface avec un petit délai
  setTimeout(() => {
    updateScreenShareInterface();
    switchToNormalLayout();
    showNotification('Partage d\'écran arrêté', 'info');
  }, 100);
  
  // Restaurer la vidéo locale
  const localVideo = document.getElementById('localVideo');
  if (localVideo && localStream) {
    localVideo.srcObject = localStream;
    localVideo.style.display = 'block';
    const localVideoPlaceholder = document.getElementById('localVideoPlaceholder');
    if (localVideoPlaceholder) {
      localVideoPlaceholder.style.display = 'none';
    }
  }
  
  // Mettre à jour le stream WebRTC pour restaurer la vidéo normale
  if (window.WebRTC && window.WebRTC.updateLocalStream) {
    window.WebRTC.updateLocalStream(localStream);
  }
  
  // Notifier les autres participants de l'arrêt du partage d'écran
  if (socket && currentMeeting) {
    socket.emit('screen-share-stopped', {
      meetingId: currentMeeting,
      userId: currentUser ? currentUser.id : 'unknown',
      username: currentUser ? currentUser.username : 'Utilisateur'
    });
  }
  
  // Supprimer l'indicateur visuel
  removeScreenShareIndicator();
  
  console.log('✅ Partage d\'écran arrêté');
  showNotification('Partage d\'écran arrêté', 'info');
  
  // Désactiver le blocage après 3 secondes
  setTimeout(() => {
    screenShareBlocked = false;
    console.log('✅ Blocage du partage d\'écran désactivé');
  }, 3000);
}

// Ajouter un indicateur visuel de partage d'écran
function addScreenShareIndicator() {
  // Supprimer l'ancien indicateur s'il existe
  removeScreenShareIndicator();
  
  const indicator = document.createElement('div');
  indicator.id = 'screen-share-indicator';
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 20px;
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
        <span>Vous partagez votre écran</span>
      </div>
      <div id="screen-share-confirmations" style="margin-top: 8px; font-size: 12px; color: #ccc;">
        En attente des confirmations...
      </div>
    </div>
  `;
  
  document.body.appendChild(indicator);
}

// Supprimer l'indicateur visuel de partage d'écran
function removeScreenShareIndicator() {
  const indicator = document.getElementById('screen-share-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// Mettre à jour les confirmations de partage d'écran
function updateScreenShareConfirmations(confirmations) {
  const confirmationsDiv = document.getElementById('screen-share-confirmations');
  if (confirmationsDiv) {
    if (confirmations.length === 0) {
      confirmationsDiv.innerHTML = 'En attente des confirmations...';
    } else {
      confirmationsDiv.innerHTML = `✅ ${confirmations.join(', ')} voient votre écran`;
    }
  }
}

// Basculer vers le layout de partage d'écran (style Zoom)
function switchToScreenShareLayout(username, userId) {
  console.log(`🔄 Basculement vers le layout de partage d'écran pour ${username}`);
  
  // Masquer le layout normal
  const videoGrid = document.getElementById('videoGrid');
  if (videoGrid) {
    videoGrid.style.display = 'none';
  }
  
  // Afficher le layout de partage d'écran
  const screenShareLayout = document.getElementById('screenShareLayout');
  if (screenShareLayout) {
    screenShareLayout.style.display = 'flex';
  }
  
  // Activer la zone principale d'écran partagé
  const screenShareMain = document.getElementById('screenShareMain');
  if (screenShareMain) {
    screenShareMain.classList.add('active');
  }
  
  // Mettre à jour l'info de partage d'écran
  const screenShareUser = document.getElementById('screenShareUser');
  if (screenShareUser) {
    screenShareUser.textContent = `${username} partage son écran`;
  }
  
  // Ajouter la classe screen-sharing au container
  const meetingContainer = document.getElementById('meeting-container');
  if (meetingContainer) {
    meetingContainer.classList.add('screen-sharing');
  }
  
  // Créer les vignettes des participants
  createParticipantThumbnails();
  
  // Attacher les événements des contrôles de partage d'écran
  attachScreenShareControlListeners();
}

// Revenir au layout normal
function switchToNormalLayout() {
  console.log('🔄 Retour au layout normal');
  
  // Masquer le layout de partage d'écran
  const screenShareLayout = document.getElementById('screenShareLayout');
  if (screenShareLayout) {
    screenShareLayout.style.display = 'none';
  }
  
  // Désactiver la zone principale d'écran partagé
  const screenShareMain = document.getElementById('screenShareMain');
  if (screenShareMain) {
    screenShareMain.classList.remove('active');
  }
  
  // Supprimer la classe screen-sharing du container
  const meetingContainer = document.getElementById('meeting-container');
  if (meetingContainer) {
    meetingContainer.classList.remove('screen-sharing');
  }
  
  // Nettoyer les vignettes des participants
  clearParticipantThumbnails();
  
  // Afficher le layout normal avec la vignette principale en pleine largeur
  const videoGrid = document.getElementById('videoGrid');
  if (videoGrid) {
    videoGrid.style.display = 'flex';
    videoGrid.style.flexDirection = 'column';
    videoGrid.style.alignItems = 'center';
    videoGrid.style.justifyContent = 'center';
    videoGrid.style.gap = '20px';
    videoGrid.style.height = '100%';
  }
  
  // Restaurer l'affichage des streams dans le layout normal
  restoreNormalVideoDisplay();
  
  console.log('✅ Layout normal restauré exactement comme avant le partage');
}

// Restaurer l'affichage des vidéos dans le layout normal
function restoreNormalVideoDisplay() {
  console.log('🔄 Restauration de l\'affichage vidéo normal...');
  
  // Restaurer le layout normal avec vignette principale en pleine largeur
  const videoGrid = document.getElementById('videoGrid');
  if (videoGrid) {
    videoGrid.style.display = 'flex';
    videoGrid.style.flexDirection = 'column';
    videoGrid.style.alignItems = 'center';
    videoGrid.style.justifyContent = 'center';
    videoGrid.style.gap = '20px';
    videoGrid.style.height = '100%';
  }
  
  // Restaurer la vidéo locale (petite vignette en bas à droite)
  const localVideoContainer = document.getElementById('localVideoContainer');
  const localVideo = document.getElementById('localVideo');
  const localVideoPlaceholder = document.getElementById('localVideoPlaceholder');
  
  if (localVideoContainer && localVideo && localVideoPlaceholder) {
    // Classe pour la petite vignette locale en position absolue
    localVideoContainer.className = 'video-item local-video';
    localVideoContainer.style.position = 'absolute';
    localVideoContainer.style.bottom = '20px';
    localVideoContainer.style.right = '20px';
    localVideoContainer.style.width = '180px';
    localVideoContainer.style.height = '135px';
    localVideoContainer.style.minHeight = 'auto';
    
    if (localVideo.srcObject) {
      localVideo.style.display = 'block';
      localVideoPlaceholder.style.display = 'none';
    } else {
      localVideo.style.display = 'none';
      localVideoPlaceholder.style.display = 'flex';
    }
  }
  
  // Restaurer la vidéo distante (grande vignette principale)
  const remoteVideoContainer = document.getElementById('remoteVideoContainer');
  const remoteVideo = document.getElementById('remoteVideo');
  const remoteVideoPlaceholder = document.getElementById('remoteVideoPlaceholder');
  const remoteVideoLabel = document.getElementById('remoteVideoLabel');
  
  if (remoteVideoContainer && remoteVideo && remoteVideoPlaceholder) {
    // Classe pour la grande vignette principale
    remoteVideoContainer.className = 'video-item main-video';
    remoteVideoContainer.style.position = 'relative';
    remoteVideoContainer.style.width = '100%';
    remoteVideoContainer.style.height = '100%';
    remoteVideoContainer.style.minHeight = '400px';
    remoteVideoContainer.style.flex = '1';
    
    if (remoteVideo.srcObject) {
      remoteVideo.style.display = 'block';
      remoteVideoPlaceholder.style.display = 'none';
      if (remoteVideoLabel) {
        remoteVideoLabel.style.display = 'block';
      }
    } else {
      remoteVideo.style.display = 'none';
      remoteVideoPlaceholder.style.display = 'flex';
      if (remoteVideoLabel) {
        remoteVideoLabel.style.display = 'none';
      }
    }
  }
  
  console.log('✅ Affichage vidéo normal restauré avec layout 2x1 comme dans l\'image');
}

// Créer les vignettes des participants
function createParticipantThumbnails() {
  const thumbnailsContainer = document.getElementById('participantsThumbnails');
  if (!thumbnailsContainer) return;
  
  // Nettoyer les vignettes existantes
  thumbnailsContainer.innerHTML = '';
  
  // Ajouter la vignette locale (copie du stream, pas l'élément original)
  const localVideo = document.getElementById('localVideo');
  if (localVideo && localVideo.srcObject) {
    const localThumbnail = createParticipantThumbnail('Vous', localVideo.srcObject, true);
    thumbnailsContainer.appendChild(localThumbnail);
  }
  
  // Ajouter les vignettes des participants distants (copie du stream, pas l'élément original)
  const remoteVideo = document.getElementById('remoteVideo');
  if (remoteVideo && remoteVideo.srcObject) {
    const remoteThumbnail = createParticipantThumbnail('Participant', remoteVideo.srcObject, false);
    thumbnailsContainer.appendChild(remoteThumbnail);
  }
  
  console.log('✅ Vignettes des participants créées pour le layout de partage d\'écran');
}

// Nettoyer les vignettes des participants
function clearParticipantThumbnails() {
  const thumbnailsContainer = document.getElementById('participantsThumbnails');
  if (thumbnailsContainer) {
    thumbnailsContainer.innerHTML = '';
    console.log('✅ Vignettes des participants nettoyées');
  }
}

// Créer une vignette de participant
function createParticipantThumbnail(name, stream, isLocal) {
  const thumbnail = document.createElement('div');
  thumbnail.className = 'participant-thumbnail';
  
  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = isLocal;
  video.srcObject = stream;
  
  const info = document.createElement('div');
  info.className = 'participant-info';
  info.textContent = name;
  
  const status = document.createElement('div');
  status.className = 'participant-status';
  
  thumbnail.appendChild(video);
  thumbnail.appendChild(info);
  thumbnail.appendChild(status);
  
  return thumbnail;
}

// Nettoyer les vignettes des participants
function clearParticipantThumbnails() {
  const thumbnailsContainer = document.getElementById('participantsThumbnails');
  if (thumbnailsContainer) {
    thumbnailsContainer.innerHTML = '';
  }
}

// Attacher les événements des contrôles de partage d'écran
function attachScreenShareControlListeners() {
  console.log('🔧 Attachement des événements de partage d\'écran...');
  
  // Bouton d'arrêt du partage d'écran
  const stopScreenShareBtn = document.getElementById('stopScreenShare');
  if (stopScreenShareBtn) {
    console.log('✅ Bouton "Arrêter le partage" trouvé et configuré');
    stopScreenShareBtn.onclick = () => {
      console.log('🛑 Bouton "Arrêter le partage" cliqué');
      if (isScreenSharing) {
        stopScreenShare();
      } else {
        showNotification('Aucun partage d\'écran en cours', 'warning');
      }
    };
  } else {
    console.error('❌ Bouton "Arrêter le partage" non trouvé');
  }
  
  // Bouton de pause du partage d'écran
  const pauseScreenShareBtn = document.getElementById('pauseScreenShare');
  if (pauseScreenShareBtn) {
    console.log('✅ Bouton "Pause" trouvé et configuré');
    pauseScreenShareBtn.onclick = () => {
      console.log('⏸️ Bouton "Pause" cliqué');
      // TODO: Implémenter la pause du partage d'écran
      showNotification('Pause du partage d\'écran', 'info');
    };
  } else {
    console.error('❌ Bouton "Pause" non trouvé');
  }
  
  // Bouton de reprise du partage d'écran
  const resumeScreenShareBtn = document.getElementById('resumeScreenShare');
  if (resumeScreenShareBtn) {
    console.log('✅ Bouton "Reprendre" trouvé et configuré');
    resumeScreenShareBtn.onclick = () => {
      console.log('▶️ Bouton "Reprendre" cliqué');
      // TODO: Implémenter la reprise du partage d'écran
      showNotification('Reprise du partage d\'écran', 'info');
    };
  } else {
    console.error('❌ Bouton "Reprendre" non trouvé');
  }
}

function leaveMeeting() {
  console.log('🚪 Quitter la réunion...');
  
  // Notification immédiate de confirmation
  showNotification('Quittement de la réunion en cours...', 'info');
  
  // Notifier les participants avant de quitter
  if (socket && currentMeeting && currentUser) {
    socket.emit('user-left-meeting', {
      meetingId: currentMeeting,
      userId: currentUser.id,
      username: currentUser.username,
      message: `${currentUser.username} a quitté la réunion`
    });
    console.log('📢 Notification envoyée aux participants');
  }
  
  // Afficher une notification de confirmation pour l'utilisateur
  const username = currentUser ? currentUser.username : 'Vous';
  console.log(`📢 Notification de départ: ${username} a quitté la réunion`);
  showNotification(`${username} a quitté la réunion`, 'info');
  
  // Arrêter le timer
  if (meetingTimer) {
    clearInterval(meetingTimer);
    meetingTimer = null;
  }
  
  // Arrêter tous les streams
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  if (currentScreenStream) {
    currentScreenStream.getTracks().forEach(track => track.stop());
    currentScreenStream = null;
  }
  
  // Nettoyer WebRTC
  if (window.WebRTC && window.WebRTC.cleanup) {
    console.log('🧹 Nettoyage WebRTC...');
    window.WebRTC.cleanup();
  }
  
  // Réinitialiser les variables
  currentMeeting = null;
  isScreenSharing = false;
  isMicEnabled = true;
  isCamEnabled = true;
  
  // Retourner à l'accueil
  showMain();
  
  console.log('✅ Réunion quittée');
  
  // Notification finale pour l'utilisateur
  setTimeout(() => {
    console.log('📢 Notification finale: Vous avez quitté la réunion avec succès');
    showNotification('Vous avez quitté la réunion avec succès', 'success');
  }, 1000);
}

function minimizeMeeting() {
  console.log('📱 Minimisation de la réunion...');
  
  // Vérifier si l'API de minimisation est disponible
  if (navigator.windowControlsOverlay) {
    // API de minimisation moderne
    navigator.windowControlsOverlay.setVisible(false);
    showNotification('Réunion minimisée', 'info');
  } else if (window.screen && window.screen.minimize) {
    // API de minimisation standard
    window.screen.minimize();
    showNotification('Réunion minimisée', 'info');
  } else {
    // Fallback : masquer l'interface de réunion et afficher un indicateur
    const meetingContainer = document.querySelector('.meeting-container');
    const mainContainer = document.querySelector('.main-container');
    
    if (meetingContainer && mainContainer) {
      meetingContainer.style.display = 'none';
      mainContainer.style.display = 'block';
      
      // Ajouter un indicateur de réunion minimisée
      const minimizedIndicator = document.createElement('div');
      minimizedIndicator.id = 'minimized-meeting-indicator';
      minimizedIndicator.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; padding: 12px 20px; border-radius: 25px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; z-index: 10000;">
          <i class="fas fa-video" style="margin-right: 8px;"></i>
          Réunion en cours - Cliquez pour rouvrir
        </div>
      `;
      
      document.body.appendChild(minimizedIndicator);
      
      // Ajouter un clic pour rouvrir
      minimizedIndicator.addEventListener('click', () => {
        meetingContainer.style.display = 'block';
        mainContainer.style.display = 'none';
        minimizedIndicator.remove();
      });
      
      showNotification('Réunion minimisée - Cliquez sur l\'indicateur pour rouvrir', 'info');
    } else {
      showNotification('Minimisation non supportée par ce navigateur', 'warning');
    }
  }
}

function showMeeting() {
  console.log('👁️ Affichage de l\'interface de réunion');
  if (mainContainer) mainContainer.style.display = 'none';
  if (meetingContainer) meetingContainer.classList.remove('hidden');
  
  // Afficher l'ID de réunion
  displayMeetingId();
  
  // Démarrer l'animation de la barre de progression
  startConnectionProgress();
  
  // Réattacher les event listeners pour les boutons de contrôle
  attachMeetingControlListeners();
}

// Attacher les event listeners pour les contrôles de réunion
function attachMeetingControlListeners() {
  console.log('🔗 Attachement des event listeners de réunion...');
  
  // Fonction helper pour ajouter un écouteur d'événement en toute sécurité
  const safeAddEventListener = (id, event, handler) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener(event, handler);
      console.log(`✅ Écouteur ${event} attaché à ${id}`);
      return true;
    } else {
      console.warn(`⚠️ Élément ${id} non trouvé, écouteur non attaché`);
      return false;
    }
  };
  
  // Microphone
  safeAddEventListener('btnToggleMic', 'click', () => {
    console.log('🎯 Bouton "Toggle Micro" cliqué');
    console.log('🔍 LocalStream disponible:', !!localStream);
    toggleMicrophone();
  });

  // Caméra
  safeAddEventListener('btnToggleCam', 'click', () => {
    console.log('🎯 Bouton "Toggle Caméra" cliqué');
    console.log('🔍 LocalStream disponible:', !!localStream);
    toggleCamera();
  });

  // Quitter la réunion
  safeAddEventListener('btnLeave', 'click', () => {
    console.log('🎯 Bouton "Quitter" cliqué');
    leaveMeeting();
  });

  // Partage d'écran
  safeAddEventListener('btnShareScreen', 'click', () => {
    console.log('🎯 Bouton "Partage d\'écran" (bas) cliqué');
    console.log('🔍 ScreenSharing actuel:', isScreenSharing);
    console.log('🔍 LocalStream disponible:', !!localStream);
    toggleScreenShare();
  });

  // Enregistrement
  safeAddEventListener('record-control-btn', 'click', () => {
    console.log('🎯 Bouton "Enregistrer" cliqué');
    toggleRecording();
  });

  // Lever la main
  safeAddEventListener('hand-btn', 'click', () => {
    console.log('🎯 Bouton "Lever la main" cliqué');
    toggleRaiseHand();
  });

  // Participants
  safeAddEventListener('participants-control-btn', 'click', () => {
    console.log('🎯 Bouton "Participants" cliqué');
    toggleSidePanel();
    setTimeout(() => switchToTab('participants'), 100);
  });

  // Chat
  safeAddEventListener('chat-control-btn', 'click', () => {
    console.log('🎯 Bouton "Chat" cliqué');
    toggleSidePanel();
    setTimeout(() => switchToTab('chat'), 100);
  });

  // Petits boutons dans le coin supérieur droit
  safeAddEventListener('localMicStatus', 'click', () => {
    console.log('🎯 Petit bouton microphone cliqué');
    toggleMicrophone();
  });

  safeAddEventListener('localCameraStatus', 'click', () => {
    console.log('🎯 Petit bouton caméra cliqué');
    toggleCamera();
  });

  // Option partage de fichiers dans le menu Plus d'options
  safeAddEventListener('btnShareFile', 'click', () => {
    console.log('🎯 Option "Partager fichier" cliquée');
    hideMoreOptionsMenu();
    showNotification('Fonctionnalité de partage de fichiers à venir', 'info');
  });

  console.log('✅ Event listeners de réunion attachés');
}

// Fonction pour afficher l'ID de réunion
function displayMeetingId() {
  const meetingIdDisplay = document.getElementById('meeting-id-display');
  if (meetingIdDisplay && currentMeeting) {
    meetingIdDisplay.textContent = currentMeeting;
    console.log('📋 ID de réunion affiché:', currentMeeting);
  }
}

// Fonction pour copier l'ID de réunion
function copyMeetingId() {
  if (currentMeeting) {
    navigator.clipboard.writeText(currentMeeting).then(() => {
      showNotification('ID de réunion copié !', 'success');
      console.log('📋 ID de réunion copié:', currentMeeting);
    }).catch(err => {
      console.error('Erreur lors de la copie:', err);
      showNotification('Erreur lors de la copie', 'error');
    });
  }
}

// Fonctions pour la barre de progression
function startConnectionProgress() {
  console.log('🔄 Démarrage de la barre de progression de connexion');
  
  // Réinitialiser la progression
  updateConnectionProgress(0, 'Connexion en cours...');
  
  // Simuler les étapes de connexion
  setTimeout(() => {
    updateConnectionProgress(20, 'Initialisation...');
  }, 500);
  
  setTimeout(() => {
    updateConnectionProgress(40, 'Connexion au serveur...');
  }, 1000);
  
  setTimeout(() => {
    updateConnectionProgress(60, 'Configuration WebRTC...');
  }, 1500);
  
  setTimeout(() => {
    updateConnectionProgress(80, 'Finalisation...');
  }, 2000);
  
  setTimeout(() => {
    updateConnectionProgress(100, 'Connecté');
    hideConnectionProgress();
  }, 2500);
}

function updateConnectionProgress(progress, status) {
  connectionProgress = progress;
  connectionStatus = status;
  
  const progressBar = document.getElementById('connection-progress');
  const statusLabel = document.getElementById('connection-status');
  
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
  
  if (statusLabel) {
    statusLabel.textContent = status;
  }
  
  console.log(`📊 Progression: ${progress}% - ${status}`);
}

function hideConnectionProgress() {
  setTimeout(() => {
    const progressContainer = document.querySelector('.connection-progress-bar');
    if (progressContainer) {
      progressContainer.style.opacity = '0';
      progressContainer.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        progressContainer.style.display = 'none';
      }, 300);
    }
  }, 1000);
}

function updateMeetingInterface() {
  console.log('🔄 Mise à jour de l\'interface de réunion...');
  
  // Mettre à jour le compteur de participants
  const participantCount = document.querySelector('.participant-count span');
  if (participantCount) {
    participantCount.textContent = '1'; // Seulement l'utilisateur local pour l'instant
  }
  
  // Mettre à jour les boutons de contrôle
  const micBtn = document.getElementById('btnToggleMic');
  if (micBtn) {
    micBtn.classList.toggle('active', isMicEnabled);
  }
  
  const camBtn = document.getElementById('btnToggleCam');
  if (camBtn) {
    camBtn.classList.toggle('active', isCamEnabled);
  }
}

// Fonctions pour les modales
function showMoreOptionsModal() {
  console.log('📋 Affichage du modal Plus d\'options');
  const modal = document.getElementById('more-options-modal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function hideMoreOptionsModal() {
  console.log('❌ Fermeture du modal Plus d\'options');
  const modal = document.getElementById('more-options-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Variables pour l'aperçu de la caméra
let previewStream = null;
let isPreviewCameraOn = false;
let isPreviewMicOn = false;

// Variables pour l'aperçu de la caméra de création
let createPreviewStream = null;
let isCreatePreviewCameraOn = false;
let isCreatePreviewMicOn = false;

function showJoinMeetingModal() {
  console.log('🔗 Affichage du modal de rejoindre une réunion');
  const modal = document.getElementById('join-meeting-modal');
  if (modal) {
    modal.classList.remove('hidden');
    
    // Initialiser l'aperçu de la caméra
    initializeCameraPreview();
    
    // Fermer le modal en cliquant en dehors
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideJoinMeetingModal();
      }
    });
    
    // Fermer avec Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        hideJoinMeetingModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }
}

// Fonction déjà définie plus haut, supprimée pour éviter la duplication

// Fonctions pour l'aperçu de la caméra
function initializeCameraPreview() {
  console.log('📹 Initialisation de l\'aperçu de la caméra');
  
  // Mettre à jour les boutons
  updateCameraPreviewButtons();
  
  // Démarrer la caméra par défaut
  startCameraPreview();
}

function startCameraPreview() {
  console.log('📹 Démarrage de l\'aperçu de la caméra');
  
  navigator.mediaDevices.getUserMedia({ 
    video: true, 
    audio: true 
  })
  .then(stream => {
    previewStream = stream;
    isPreviewCameraOn = true;
    isPreviewMicOn = true;
    
    const video = document.getElementById('camera-preview-video');
    const placeholder = document.querySelector('.camera-preview-placeholder');
    
    if (video && placeholder) {
      video.srcObject = stream;
      video.style.display = 'block';
      placeholder.style.display = 'none';
    }
    
    updateCameraPreviewButtons();
    showNotification('Caméra et micro activés', 'success');
  })
  .catch(error => {
    console.error('Erreur lors de l\'accès à la caméra:', error);
    showNotification('Impossible d\'accéder à la caméra', 'error');
    updateCameraPreviewButtons();
  });
}

function stopCameraPreview() {
  console.log('📹 Arrêt de l\'aperçu de la caméra');
  
  if (previewStream) {
    previewStream.getTracks().forEach(track => track.stop());
    previewStream = null;
  }
  
  isPreviewCameraOn = false;
  isPreviewMicOn = false;
  
  const video = document.getElementById('camera-preview-video');
  const placeholder = document.querySelector('.camera-preview-placeholder');
  
  if (video && placeholder) {
    video.style.display = 'none';
    placeholder.style.display = 'flex';
  }
  
  updateCameraPreviewButtons();
}

function toggleCameraPreview() {
  console.log('📹 Toggle caméra preview');
  
  if (isPreviewCameraOn) {
    // Désactiver la caméra
    if (previewStream) {
      const videoTracks = previewStream.getVideoTracks();
      videoTracks.forEach(track => track.stop());
    }
    isPreviewCameraOn = false;
    
    const video = document.getElementById('camera-preview-video');
    const placeholder = document.querySelector('.camera-preview-placeholder');
    
    if (video && placeholder) {
      video.style.display = 'none';
      placeholder.style.display = 'flex';
    }
    
    showNotification('Caméra désactivée', 'info');
  } else {
    // Activer la caméra
    if (previewStream) {
      // Réactiver les pistes vidéo
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          const videoTracks = stream.getVideoTracks();
          videoTracks.forEach(track => {
            previewStream.addTrack(track);
          });
          
          const video = document.getElementById('camera-preview-video');
          const placeholder = document.querySelector('.camera-preview-placeholder');
          
          if (video && placeholder) {
            video.srcObject = previewStream;
            video.style.display = 'block';
            placeholder.style.display = 'none';
          }
          
          isPreviewCameraOn = true;
          updateCameraPreviewButtons();
          showNotification('Caméra activée', 'success');
        })
        .catch(error => {
          console.error('Erreur lors de l\'activation de la caméra:', error);
          showNotification('Impossible d\'activer la caméra', 'error');
        });
    } else {
      // Démarrer complètement
      startCameraPreview();
    }
  }
  
  updateCameraPreviewButtons();
}

function toggleMicPreview() {
  console.log('🎤 Toggle micro preview');
  
  if (previewStream) {
    const audioTracks = previewStream.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = !track.enabled;
    });
    
    isPreviewMicOn = audioTracks[0]?.enabled || false;
    updateCameraPreviewButtons();
    
    showNotification(isPreviewMicOn ? 'Micro activé' : 'Micro désactivé', 'info');
  }
}

function updateCameraPreviewButtons() {
  const cameraBtn = document.getElementById('toggle-camera-preview');
  const micBtn = document.getElementById('toggle-mic-preview');
  
  if (cameraBtn) {
    cameraBtn.classList.toggle('active', isPreviewCameraOn);
    cameraBtn.classList.toggle('muted', !isPreviewCameraOn);
    cameraBtn.innerHTML = isPreviewCameraOn ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
  }
  
  if (micBtn) {
    micBtn.classList.toggle('active', isPreviewMicOn);
    micBtn.classList.toggle('muted', !isPreviewMicOn);
    micBtn.innerHTML = isPreviewMicOn ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
  }
}

// Fonctions pour le modal de création de réunion
function showCreateMeetingModal() {
  console.log('🔗 Affichage du modal de création de réunion');
  const modal = document.getElementById('create-meeting-modal');
  if (modal) {
    modal.classList.remove('hidden');
    
    // Initialiser l'aperçu de la caméra
    initializeCreateCameraPreview();
    
    // Fermer le modal en cliquant en dehors
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideCreateMeetingModal();
      }
    });
    
    // Fermer avec Escape
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        hideCreateMeetingModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }
}

function hideCreateMeetingModal() {
  console.log('❌ Fermeture du modal de création de réunion');
  const modal = document.getElementById('create-meeting-modal');
  if (modal) {
    modal.classList.add('hidden');
    
    // Arrêter l'aperçu de la caméra
    stopCreateCameraPreview();
  }
}

function initializeCreateCameraPreview() {
  console.log('📹 Initialisation de l\'aperçu de la caméra pour création');
  
  // Mettre à jour les boutons
  updateCreateCameraPreviewButtons();
  
  // Démarrer la caméra par défaut
  startCreateCameraPreview();
}

function startCreateCameraPreview() {
  console.log('📹 Démarrage de l\'aperçu de la caméra pour création');
  
  navigator.mediaDevices.getUserMedia({ 
    video: true, 
    audio: true 
  })
  .then(stream => {
    createPreviewStream = stream;
    isCreatePreviewCameraOn = true;
    isCreatePreviewMicOn = true;
    
    const video = document.getElementById('create-camera-preview-video');
    const placeholder = document.querySelector('#create-meeting-modal .camera-preview-placeholder');
    
    if (video && placeholder) {
      video.srcObject = stream;
      video.style.display = 'block';
      placeholder.style.display = 'none';
    }
    
    updateCreateCameraPreviewButtons();
    showNotification('Caméra et micro activés', 'success');
  })
  .catch(error => {
    console.error('Erreur lors de l\'accès à la caméra:', error);
    showNotification('Impossible d\'accéder à la caméra', 'error');
    updateCreateCameraPreviewButtons();
  });
}

function stopCreateCameraPreview() {
  console.log('📹 Arrêt de l\'aperçu de la caméra pour création');
  
  if (createPreviewStream) {
    createPreviewStream.getTracks().forEach(track => track.stop());
    createPreviewStream = null;
  }
  
  isCreatePreviewCameraOn = false;
  isCreatePreviewMicOn = false;
  
  const video = document.getElementById('create-camera-preview-video');
  const placeholder = document.querySelector('#create-meeting-modal .camera-preview-placeholder');
  
  if (video && placeholder) {
    video.style.display = 'none';
    placeholder.style.display = 'flex';
  }
  
  updateCreateCameraPreviewButtons();
}

function toggleCreateCameraPreview() {
  console.log('📹 Toggle caméra preview création');
  
  if (isCreatePreviewCameraOn) {
    // Désactiver la caméra
    if (createPreviewStream) {
      const videoTracks = createPreviewStream.getVideoTracks();
      videoTracks.forEach(track => track.stop());
    }
    isCreatePreviewCameraOn = false;
    
    const video = document.getElementById('create-camera-preview-video');
    const placeholder = document.querySelector('#create-meeting-modal .camera-preview-placeholder');
    
    if (video && placeholder) {
      video.style.display = 'none';
      placeholder.style.display = 'flex';
    }
    
    showNotification('Caméra désactivée', 'info');
  } else {
    // Activer la caméra
    if (createPreviewStream) {
      // Réactiver les pistes vidéo
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          const videoTracks = stream.getVideoTracks();
          videoTracks.forEach(track => {
            createPreviewStream.addTrack(track);
          });
          
          const video = document.getElementById('create-camera-preview-video');
          const placeholder = document.querySelector('#create-meeting-modal .camera-preview-placeholder');
          
          if (video && placeholder) {
            video.srcObject = createPreviewStream;
            video.style.display = 'block';
            placeholder.style.display = 'none';
          }
          
          isCreatePreviewCameraOn = true;
          updateCreateCameraPreviewButtons();
          showNotification('Caméra activée', 'success');
        })
        .catch(error => {
          console.error('Erreur lors de l\'activation de la caméra:', error);
          showNotification('Impossible d\'activer la caméra', 'error');
        });
    } else {
      // Démarrer complètement
      startCreateCameraPreview();
    }
  }
  
  updateCreateCameraPreviewButtons();
}

function toggleCreateMicPreview() {
  console.log('🎤 Toggle micro preview création');
  
  if (createPreviewStream) {
    const audioTracks = createPreviewStream.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = !track.enabled;
    });
    
    isCreatePreviewMicOn = audioTracks[0]?.enabled || false;
    updateCreateCameraPreviewButtons();
    
    showNotification(isCreatePreviewMicOn ? 'Micro activé' : 'Micro désactivé', 'info');
  }
}

function updateCreateCameraPreviewButtons() {
  const cameraBtn = document.getElementById('toggle-create-camera-preview');
  const micBtn = document.getElementById('toggle-create-mic-preview');
  
  if (cameraBtn) {
    cameraBtn.classList.toggle('active', isCreatePreviewCameraOn);
    cameraBtn.classList.toggle('muted', !isCreatePreviewCameraOn);
    cameraBtn.innerHTML = isCreatePreviewCameraOn ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
  }
  
  if (micBtn) {
    micBtn.classList.toggle('active', isCreatePreviewMicOn);
    micBtn.classList.toggle('muted', !isCreatePreviewMicOn);
    micBtn.innerHTML = isCreatePreviewMicOn ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
  }
}

function createMeetingConfirm() {
  const meetingTitle = document.getElementById('create-meeting-title').value;
  const userName = document.getElementById('create-meeting-name').value;
  const password = document.getElementById('create-meeting-password').value;
  
  if (!meetingTitle || !userName || !password) {
    showNotification('Veuillez remplir tous les champs obligatoires', 'error');
    return;
  }
  
  // Récupérer les options
  const muteParticipants = document.getElementById('mute-participants').checked;
  const disableVideoParticipants = document.getElementById('disable-video-participants').checked;
  const enableWaitingRoom = document.getElementById('enable-waiting-room').checked;
  
  // Transférer les paramètres de la caméra de l'aperçu vers la réunion
  if (createPreviewStream) {
    const videoTracks = createPreviewStream.getVideoTracks();
    const audioTracks = createPreviewStream.getAudioTracks();
    
    // Mettre à jour les états globaux
    isMicEnabled = audioTracks[0]?.enabled || false;
    isCamEnabled = videoTracks.length > 0 && videoTracks[0].enabled;
    
    // Arrêter l'aperçu
    stopCreateCameraPreview();
  }
  
  // Générer un ID de réunion unique
  const meetingId = generateMeetingId();
  currentMeeting = meetingId;
  
  // Sauvegarder les paramètres de la réunion
  const meetingSettings = {
    title: meetingTitle,
    password: password,
    muteParticipants,
    disableVideoParticipants,
    enableWaitingRoom
  };
  
  localStorage.setItem('meetingSettings', JSON.stringify(meetingSettings));
  
  hideCreateMeetingModal();
  
  // Créer la réunion via Socket.IO
  if (socket && socket.connected) {
    console.log(`🎯 Création de la réunion ${meetingId} via Socket.IO`);
    socket.emit('create-meeting', { 
      title: meetingTitle,
      meetingId: meetingId,
      username: userName 
    });
  } else {
    console.warn('⚠️ Socket.IO non connecté, création en mode local');
    initializeMeeting(meetingId);
    showMeeting();
  }
  
  showNotification(`Réunion "${meetingTitle}" créée avec succès`, 'success');
}

function hideJoinMeetingModal() {
  console.log('❌ Fermeture du modal de rejoindre une réunion');
  const modal = document.getElementById('join-meeting-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function quickJoinMeeting() {
  console.log('⚡ Rejoindre rapidement une réunion');
  const meetingId = document.getElementById('quick-join-input')?.value?.trim();
  if (!meetingId) {
    showNotification('Veuillez entrer un ID de réunion', 'error');
    return;
  }
  
  currentMeeting = meetingId;
  initializeMeeting(meetingId);
  showMeeting();
  showNotification(`Rejoindre la réunion ${meetingId}`, 'success');
}

function joinMeetingConfirm() {
  const meetingId = document.getElementById('join-meeting-id').value;
  const userName = document.getElementById('join-name').value;
  const password = document.getElementById('join-password').value;
  
  // Vérifier les options de connexion
  const joinWithVideo = document.getElementById('join-with-video').checked;
  const joinWithAudio = document.getElementById('join-with-audio').checked;
  
  if (!meetingId || !userName) {
    showNotification('Veuillez remplir tous les champs obligatoires', 'error');
    return;
  }
  
  // Transférer les paramètres de la caméra de l'aperçu vers la réunion
  if (previewStream) {
    // Arrêter l'aperçu et transférer le stream
    const videoTracks = previewStream.getVideoTracks();
    const audioTracks = previewStream.getAudioTracks();
    
    // Mettre à jour les états globaux selon les options choisies
    isMicEnabled = joinWithAudio && (audioTracks[0]?.enabled || false);
    isCamEnabled = joinWithVideo && (videoTracks.length > 0 && videoTracks[0].enabled);
    
    // Arrêter l'aperçu
    stopCameraPreview();
  } else {
    // Si pas d'aperçu, utiliser les options choisies
    isMicEnabled = joinWithAudio;
    isCamEnabled = joinWithVideo;
  }
  
  currentMeeting = meetingId;
  window.currentMeetingId = meetingId;
  hideJoinMeetingModal();
  
  // Rejoindre la réunion via Socket.IO
  if (socket && socket.connected) {
    console.log(`🔗 Rejoindre la réunion ${meetingId} via Socket.IO`);
    socket.emit('join-meeting', { 
      meetingId: meetingId,
      username: userName 
    });
  } else {
    console.warn('⚠️ Socket.IO non connecté, rejoindre en mode local');
    initializeMeeting(meetingId);
    showMeeting();
  }
  
  showNotification(`Rejoindre la réunion ${meetingId}`, 'success');
}

// Fonctions des options Plus

function showMeetingSettings() {
  console.log('⚙️ Paramètres de réunion');
  showNotification('Fonctionnalité de paramètres en développement', 'info');
  hideMoreOptionsModal();
}

function shareOnSocial() {
  console.log('📱 Partager sur les réseaux sociaux');
  showNotification('Fonctionnalité de partage en développement', 'info');
  hideMoreOptionsModal();
}

function downloadRecording() {
  console.log('📥 Télécharger l\'enregistrement');
  showNotification('Fonctionnalité de téléchargement en développement', 'info');
  hideMoreOptionsModal();
}

// Fonctions du panneau latéral
function toggleSidePanel() {
  console.log('📱 Toggle panneau latéral');
  const panel = document.getElementById('sidePanel');
  if (panel) {
    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    console.log(`📱 Panneau latéral ${isHidden ? 'ouvert' : 'fermé'}`);
  } else {
    console.error('❌ Panneau latéral non trouvé');
  }
}

function switchToChatTab() {
  console.log('💬 Basculer vers l\'onglet chat');
  // Logique pour basculer vers l'onglet chat
}

function loadMeetings() {
  console.log('📋 Chargement des réunions...');
  
  // Simuler le chargement des réunions
  const meetings = [
    { id: 'DEMO123', title: 'Réunion de démonstration', time: '14:00', participants: 3 },
    { id: 'TEAM456', title: 'Réunion d\'équipe', time: '15:30', participants: 5 },
    { id: 'PROJ789', title: 'Présentation projet', time: '16:45', participants: 8 }
  ];
  
  displayMeetings(meetings);
}

function displayMeetings(meetings) {
  console.log('📋 Affichage des réunions:', meetings);
  
  if (!meetingsList) {
    console.error('❌ Élément meetingsList non trouvé');
    return;
  }
  
  meetingsList.innerHTML = '';
  
  meetings.forEach(meeting => {
    const meetingElement = document.createElement('div');
    meetingElement.className = 'meeting-item';
    meetingElement.innerHTML = `
      <div class="meeting-info">
        <h3>${meeting.title}</h3>
        <p>ID: ${meeting.id}</p>
        <p>Heure: ${meeting.time}</p>
        <p>Participants: ${meeting.participants}</p>
      </div>
      <button class="btn btn-primary" onclick="joinMeetingById('${meeting.id}')">
        Rejoindre
      </button>
    `;
    meetingsList.appendChild(meetingElement);
  });
}

function joinMeetingById(meetingId) {
  console.log('🔗 Rejoindre la réunion:', meetingId);
  
  currentMeeting = meetingId;
  initializeMeeting(meetingId);
  showMeeting();
  showNotification(`Rejoindre la réunion ${meetingId}`, 'success');
}

function showNotification(message, type = 'info') {
  console.log(`📢 Notification [${type}]:`, message);
  
  // Créer l'élément de notification
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    </div>
  `;
  
  // Styles pour rendre la notification plus visible
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
    color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
    border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-weight: 500;
    min-width: 250px;
    animation: slideInRight 0.3s ease-out;
  `;
  
  // Ajouter au body directement pour s'assurer qu'elle soit visible
  document.body.appendChild(notification);
  
  // Supprimer après 4 secondes
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 4000);
}


// Fonction pour synchroniser les boutons microphone
function syncMicrophoneButtons(isEnabled) {
  const micBtn = document.getElementById('btnToggleMic');
  const localMicStatus = document.getElementById('localMicStatus');
  
  // Bouton principal
  if (micBtn) {
    if (isEnabled) {
      micBtn.classList.remove('muted');
      micBtn.classList.add('active');
      micBtn.style.backgroundColor = '#28a745';
      micBtn.style.color = 'white';
      micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    } else {
      micBtn.classList.remove('active');
      micBtn.classList.add('muted');
      micBtn.style.backgroundColor = '#dc3545';
      micBtn.style.color = 'white';
      micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    }
  }
  
  // Petit bouton
  if (localMicStatus) {
    if (isEnabled) {
      localMicStatus.classList.remove('muted');
      localMicStatus.style.backgroundColor = '#28a745';
      localMicStatus.style.color = 'white';
      localMicStatus.innerHTML = '<i class="fas fa-microphone"></i>';
    } else {
      localMicStatus.classList.add('muted');
      localMicStatus.style.backgroundColor = '#dc3545';
      localMicStatus.style.color = 'white';
      localMicStatus.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    }
  }
}

// Fonction pour synchroniser les boutons caméra
function syncCameraButtons(isEnabled) {
  const camBtn = document.getElementById('btnToggleCam');
  const localCameraStatus = document.getElementById('localCameraStatus');
  
  // Bouton principal
  if (camBtn) {
    if (isEnabled) {
      camBtn.classList.remove('muted');
      camBtn.classList.add('active');
      camBtn.style.backgroundColor = '#28a745';
      camBtn.style.color = 'white';
      camBtn.innerHTML = '<i class="fas fa-video"></i>';
    } else {
      camBtn.classList.remove('active');
      camBtn.classList.add('muted');
      camBtn.style.backgroundColor = '#dc3545';
      camBtn.style.color = 'white';
      camBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
    }
  }
  
  // Petit bouton
  if (localCameraStatus) {
    if (isEnabled) {
      localCameraStatus.classList.remove('muted');
      localCameraStatus.style.backgroundColor = '#28a745';
      localCameraStatus.style.color = 'white';
      localCameraStatus.innerHTML = '<i class="fas fa-video"></i>';
    } else {
      localCameraStatus.classList.add('muted');
      localCameraStatus.style.backgroundColor = '#dc3545';
      localCameraStatus.style.color = 'white';
      localCameraStatus.innerHTML = '<i class="fas fa-video-slash"></i>';
    }
  }
}

// Exposer les fonctions globalement pour webrtc-functions.js
window.syncMicrophoneButtons = syncMicrophoneButtons;
window.syncCameraButtons = syncCameraButtons;
window.showNotification = showNotification;


// Fonctions globales pour les boutons
window.createMeetingFromHome = function() {
  console.log('🎯 Créer une réunion depuis l\'accueil');
  startMeetingFromCreate();
};

window.joinMeetingFromHome = function() {
  console.log('🎯 Rejoindre une réunion depuis l\'accueil');
  showJoinMeetingModal();
};

window.quickJoinMeeting = function() {
  console.log('🎯 Rejoindre rapidement une réunion');
  quickJoinMeeting();
};

// Fonctions exposées globalement sans récursion
window.toggleMicrophone = function() {
  console.log('🎯 Toggle microphone');
  console.log('🎤 toggleMicrophone appelé, localStream:', !!localStream);
  
  // Utiliser WebRTC si disponible
  if (window.WebRTC && window.WebRTC.toggleMic) {
    window.WebRTC.toggleMic();
    return;
  }
  
  if (!localStream) {
    console.warn('⚠️ Aucun stream local disponible');
    showNotification('Veuillez d\'abord démarrer une réunion', 'warning');
    return;
  }
  
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    const audioTrack = audioTracks[0];
    audioTrack.enabled = !audioTrack.enabled;
    isMicEnabled = audioTrack.enabled;
    updateMicButton();
    
    // Mettre à jour l'indicateur de statut vidéo
    updateVideoStatus('local', true, !audioTrack.enabled, false);
    
    // Synchroniser tous les boutons microphone
    syncMicrophoneButtons(isMicEnabled);
    
    console.log('🎤 Microphone:', isMicEnabled ? 'activé' : 'désactivé');
    showNotification(`Microphone ${isMicEnabled ? 'activé' : 'désactivé'}`, isMicEnabled ? 'success' : 'error');
  }
};

window.toggleCamera = function() {
  console.log('🎯 Toggle caméra');
  console.log('📹 toggleCamera appelé, localStream:', !!localStream);
  
  // Utiliser WebRTC si disponible
  if (window.WebRTC && window.WebRTC.toggleCamera) {
    window.WebRTC.toggleCamera();
    return;
  }
  
  if (!localStream) {
    console.warn('⚠️ Aucun stream local disponible');
    showNotification('Veuillez d\'abord démarrer une réunion', 'warning');
    return;
  }
  
  const videoTracks = localStream.getVideoTracks();
  if (videoTracks.length > 0) {
    const videoTrack = videoTracks[0];
    videoTrack.enabled = !videoTrack.enabled;
    isCamEnabled = videoTrack.enabled;
    
    // Synchroniser tous les boutons caméra
    syncCameraButtons(isCamEnabled);
    
    console.log('📹 Caméra:', isCamEnabled ? 'activée' : 'désactivée');
    showNotification(`Caméra ${isCamEnabled ? 'activée' : 'désactivée'}`, isCamEnabled ? 'success' : 'error');
  }
};

// Fonction de partage d'écran exposée globalement
window.toggleScreenShare = function() {
  console.log('🎯 Toggle partage d\'écran');
  if (isScreenSharing) {
    stopScreenShare();
  } else {
    startScreenShare();
  }
};

window.leaveMeeting = function() {
  console.log('🎯 Quitter la réunion');
  console.log('🚪 Quitter la réunion...');
  
  // Arrêter le timer
  if (meetingTimer) {
    clearInterval(meetingTimer);
    meetingTimer = null;
  }
  
  // Arrêter tous les streams
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }
  
  if (currentScreenStream) {
    currentScreenStream.getTracks().forEach(track => track.stop());
    currentScreenStream = null;
  }
  
  // Fermer les connexions peer
  if (window.WebRTC && window.WebRTC.cleanup) {
    window.WebRTC.cleanup();
  }
  
  // Réinitialiser les variables
  currentMeeting = null;
  isScreenSharing = false;
  isMicEnabled = true;
  isCamEnabled = true;
  
  // Retourner à l'accueil
  showMain();
  
  console.log('✅ Réunion quittée');
};

window.joinMeetingById = function(meetingId) {
  console.log('🎯 Rejoindre la réunion par ID');
  joinMeetingById(meetingId);
};

// Fonctions exposées globalement sans récursion

// Fonction de test pour vérifier les boutons
window.testButtons = function() {
  console.log('🔍 Test des boutons de contrôle...');
  
  const micBtn = document.getElementById('btnToggleMic');
  const camBtn = document.getElementById('btnToggleCam');
  const shareBtn = document.getElementById('btnShareScreen');
  const headerShareBtn = document.getElementById('share-btn');
  const leaveBtn = document.getElementById('btnLeave');
  
  console.log('Microphone button:', micBtn);
  console.log('Camera button:', camBtn);
  console.log('Share button (bas):', shareBtn);
  console.log('Share button (header):', headerShareBtn);
  console.log('Leave button:', leaveBtn);
};

// Fonction de test spécifique pour le bouton de partage du header
window.testHeaderShareButton = function() {
  console.log('🧪 Test du bouton de partage du header');
  const headerShareBtn = document.getElementById('share-btn');
  if (headerShareBtn) {
    console.log('✅ Bouton header trouvé:', headerShareBtn);
    console.log('🔍 Classes:', headerShareBtn.className);
    console.log('🔍 HTML:', headerShareBtn.innerHTML);
    console.log('🔍 isScreenSharing:', isScreenSharing);
    console.log('🔍 localStream:', !!localStream);
    
    // Simuler un clic
    headerShareBtn.click();
  } else {
    console.error('❌ Bouton de partage du header non trouvé');
  }
  
  console.log('LocalStream:', localStream);
  console.log('isScreenSharing:', isScreenSharing);
  
  // Test des clics
  if (micBtn) {
    console.log('Test clic microphone...');
    micBtn.click();
  }
};

// Toggle raise hand
function toggleRaiseHand() {
  const handBtn = document.getElementById('hand-btn');
  const isRaised = handBtn.classList.contains('active');
  
  if (isRaised) {
    handBtn.classList.remove('active');
    handBtn.style.background = '#2d2d2d';
    showNotification('Main abaissée', 'info');
  } else {
    handBtn.classList.add('active');
    handBtn.style.background = '#ffc107';
    showNotification('Main levée', 'success');
  }
}

// Toggle recording
function toggleRecording() {
  console.log('🎥 Toggle enregistrement appelé');
  console.log('🔍 État actuel isRecording:', isRecording);
  
  if (isRecording) {
    console.log('🛑 Arrêt de l\'enregistrement...');
    stopRecording();
  } else {
    console.log('▶️ Démarrage de l\'enregistrement...');
    startRecording();
  }
}

// Fonction pour mettre à jour les boutons d'enregistrement
function updateRecordingButtons(isRecording) {
  // Bouton dans la barre de contrôle du bas
  const recordBtn = document.getElementById('record-control-btn');
  if (recordBtn) {
    if (isRecording) {
      recordBtn.classList.add('active');
      recordBtn.innerHTML = '<i class="fas fa-stop"></i>';
    } else {
      recordBtn.classList.remove('active');
      recordBtn.innerHTML = '<i class="fas fa-circle"></i>';
    }
  }

  // Bouton dans le header
  const headerRecordBtn = document.getElementById('record-btn');
  if (headerRecordBtn) {
    if (isRecording) {
      headerRecordBtn.classList.add('active');
      headerRecordBtn.innerHTML = '<i class="fas fa-stop"></i>Arrêter l\'enregistrement';
    } else {
      headerRecordBtn.classList.remove('active');
      headerRecordBtn.innerHTML = '<i class="fas fa-circle"></i>Enregistrer';
    }
  }
}

// Démarrer l'enregistrement
function startRecording() {
  if (!currentMeeting) {
    showNotification('Aucune réunion active pour l\'enregistrement', 'error');
    return;
  }
  
  try {
    // Démarrer l'enregistrement côté serveur
    if (socket && socket.connected) {
      console.log('🎬 Démarrage de l\'enregistrement côté serveur...');
      socket.emit('start-recording', { 
        meetingId: currentMeeting, 
        type: 'both' 
      });
    } else {
      console.warn('⚠️ Socket non connecté, enregistrement local uniquement');
      startLocalRecording();
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du démarrage de l\'enregistrement:', error);
    showNotification('Erreur lors du démarrage de l\'enregistrement', 'error');
  }
}

// Enregistrement local (fallback)
function startLocalRecording() {
  if (!localStream) {
    showNotification('Aucun stream disponible pour l\'enregistrement', 'error');
    return;
  }
  
  try {
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(localStream, {
      mimeType: 'video/webm;codecs=vp8'
    });
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      console.log('✅ Enregistrement local arrêté');
      saveLocalRecording();
    };
    
    mediaRecorder.start();
    isRecording = true;
    recordingStartTime = new Date();
    
    // Mettre à jour les boutons d'enregistrement
    updateRecordingButtons(true);
    showRecordingIndicator(true);
    startRecordingTimer();
    
    showNotification('Enregistrement local démarré', 'success');
    console.log('🎥 Enregistrement local démarré');
    
  } catch (error) {
    console.error('❌ Erreur lors du démarrage de l\'enregistrement local:', error);
    showNotification('Erreur lors du démarrage de l\'enregistrement', 'error');
  }
}

// Arrêter l'enregistrement
function stopRecording() {
  if (!currentMeeting) {
    showNotification('Aucune réunion active', 'error');
    return;
  }
  
  try {
    // Arrêter l'enregistrement côté serveur
    if (socket && socket.connected) {
      console.log('🛑 Arrêt de l\'enregistrement côté serveur...');
      socket.emit('stop-recording', { 
        meetingId: currentMeeting 
      });
    } else {
      console.warn('⚠️ Socket non connecté, arrêt de l\'enregistrement local uniquement');
      stopLocalRecording();
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'arrêt de l\'enregistrement:', error);
    showNotification('Erreur lors de l\'arrêt de l\'enregistrement', 'error');
  }
}

// Arrêter l'enregistrement local (fallback)
function stopLocalRecording() {
  if (!isRecording || !mediaRecorder) {
    showNotification('Aucun enregistrement en cours', 'warning');
    return;
  }
  
  try {
    mediaRecorder.stop();
    isRecording = false;
    recordingStartTime = null;
    
    // Mettre à jour les boutons d'enregistrement
    updateRecordingButtons(false);
    showRecordingIndicator(false);
    stopRecordingTimer();
    
    showNotification('Enregistrement local arrêté', 'info');
    console.log('🛑 Enregistrement local arrêté');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'arrêt de l\'enregistrement local:', error);
    showNotification('Erreur lors de l\'arrêt de l\'enregistrement', 'error');
  }
}

// Sauvegarder l'enregistrement local
function saveLocalRecording() {
  if (recordedChunks.length === 0) {
    console.warn('⚠️ Aucun chunk d\'enregistrement à sauvegarder');
    return;
  }
  
  try {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    
    // Calculer la durée de l'enregistrement
    const duration = recordingStartTime ? 
      formatDuration(new Date() - recordingStartTime) : '00:00:00';
    
    // Calculer la taille du fichier
    const sizeInMB = (blob.size / (1024 * 1024)).toFixed(1);
    
    // Créer le nom de fichier
    const filename = `enregistrement-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
    
    // Sauvegarder dans la liste des enregistrements
    const recordingData = {
      title: 'Réunion du ' + new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      duration: duration,
      date: new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      size: sizeInMB + ' MB',
      type: 'video',
      filename: filename,
      blob: blob
    };
    
    saveNewRecording(recordingData);
    
    // Créer un lien de téléchargement automatique
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Nettoyer
    URL.revokeObjectURL(url);
    recordedChunks = [];
    
    console.log('💾 Enregistrement local sauvegardé et ajouté à la liste');
    showNotification('Enregistrement sauvegardé et ajouté à la liste', 'success');
    
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde de l\'enregistrement local:', error);
    showNotification('Erreur lors de la sauvegarde de l\'enregistrement', 'error');
  }
}

// Afficher/masquer l'indicateur d'enregistrement
function showRecordingIndicator(show) {
  const indicator = document.getElementById('recording-indicator');
  if (indicator) {
    if (show) {
      indicator.classList.remove('hidden');
    } else {
      indicator.classList.add('hidden');
    }
    console.log(show ? '🎬 Indicateur d\'enregistrement affiché' : '🛑 Indicateur d\'enregistrement masqué');
  }
}

// Démarrer le timer d'enregistrement
function startRecordingTimer() {
  if (recordingTimer) {
    clearInterval(recordingTimer);
  }
  
  recordingStartTime = new Date();
  
  recordingTimer = setInterval(() => {
    if (!isRecording || !recordingStartTime) {
      stopRecordingTimer();
      return;
    }
    
    const elapsed = new Date() - recordingStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    const timerElement = document.getElementById('recording-timer');
    if (timerElement) {
      timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }, 1000);
  
  console.log('⏱️ Timer d\'enregistrement démarré');
}

// Arrêter le timer d'enregistrement
function stopRecordingTimer() {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
  
  const timerElement = document.getElementById('recording-timer');
  if (timerElement) {
    timerElement.textContent = '00:00';
  }
  
  console.log('⏹️ Timer d\'enregistrement arrêté');
}

// Afficher le modal des enregistrements
function showRecordingsModal() {
  const modal = document.getElementById('recordings-modal');
  if (modal) {
    modal.classList.remove('hidden');
    loadRecordings();
    console.log('📹 Modal des enregistrements affiché');
  }
}

// Masquer le modal des enregistrements
function hideRecordingsModal() {
  const modal = document.getElementById('recordings-modal');
  if (modal) {
    modal.classList.add('hidden');
    console.log('📹 Modal des enregistrements masqué');
  }
}

// Charger la liste des enregistrements
function loadRecordings() {
  const recordingsList = document.getElementById('recordingsList');
  if (!recordingsList) return;

  // Récupérer les enregistrements depuis localStorage
  let recordings = JSON.parse(localStorage.getItem('recordings') || '[]');
  
  // Si aucun enregistrement, ajouter des exemples pour la démo
  if (recordings.length === 0) {
    const currentDate = new Date();
    const yesterday = new Date(currentDate);
    yesterday.setDate(currentDate.getDate() - 1);
    const threeDaysAgo = new Date(currentDate);
    threeDaysAgo.setDate(currentDate.getDate() - 3);
    
    recordings = [
      {
        id: 'demo1',
        title: 'Réunion du ' + yesterday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        duration: '00:15:30',
        date: yesterday.toLocaleDateString('fr-FR') + ' 14:30',
        size: '45.2 MB',
        type: 'video',
        filename: 'meeting_' + yesterday.getTime() + '.webm'
      },
      {
        id: 'demo2', 
        title: 'Réunion du ' + threeDaysAgo.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        duration: '00:08:45',
        date: threeDaysAgo.toLocaleDateString('fr-FR') + ' 10:15',
        size: '23.1 MB',
        type: 'audio',
        filename: 'meeting_' + threeDaysAgo.getTime() + '.webm'
      }
    ];
    
    // Sauvegarder les exemples
    localStorage.setItem('recordings', JSON.stringify(recordings));
  }

  if (recordings.length === 0) {
    recordingsList.innerHTML = `
      <div class="no-recordings">
        <i class="fas fa-video-slash"></i>
        <p>Aucun enregistrement disponible</p>
      </div>
    `;
    return;
  }

  recordingsList.innerHTML = recordings.map(recording => `
    <div class="recording-item">
      <div class="recording-icon">
        <i class="fas fa-${recording.type === 'video' ? 'video' : 'microphone'}"></i>
      </div>
      <div class="recording-info">
        <div class="recording-title">${recording.title}</div>
        <div class="recording-details">
          <div class="recording-detail">
            <i class="fas fa-clock"></i>
            <span>${recording.duration}</span>
          </div>
          <div class="recording-detail">
            <i class="fas fa-calendar"></i>
            <span>${recording.date}</span>
          </div>
          <div class="recording-detail">
            <i class="fas fa-file"></i>
            <span>${recording.size}</span>
          </div>
        </div>
      </div>
      <div class="recording-actions">
        <button class="recording-btn play" data-recording-id="${recording.id}" data-action="play">
          <i class="fas fa-play"></i> Lire
        </button>
        <button class="recording-btn download" data-recording-id="${recording.id}" data-action="download">
          <i class="fas fa-download"></i> Télécharger
        </button>
        <button class="recording-btn delete" data-recording-id="${recording.id}" data-action="delete">
          <i class="fas fa-trash"></i> Supprimer
        </button>
      </div>
    </div>
  `).join('');

  // Attacher les event listeners aux boutons générés
  attachRecordingButtonListeners();

  console.log(`📹 ${recordings.length} enregistrements chargés`);
}

// Attacher les event listeners aux boutons d'enregistrement
function attachRecordingButtonListeners() {
  const recordingButtons = document.querySelectorAll('.recording-btn[data-recording-id]');
  
  recordingButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const recordingId = button.getAttribute('data-recording-id');
      const action = button.getAttribute('data-action');
      
      console.log(`🎯 Bouton ${action} cliqué pour l'enregistrement ${recordingId}`);
      
      switch(action) {
        case 'play':
          window.playRecording(recordingId);
          break;
        case 'download':
          window.downloadRecording(recordingId);
          break;
        case 'delete':
          window.deleteRecording(recordingId);
          break;
        default:
          console.warn(`Action inconnue: ${action}`);
      }
    });
  });
  
  console.log(`✅ ${recordingButtons.length} boutons d'enregistrement configurés`);
}

// Formater la durée en HH:MM:SS
function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Sauvegarder un nouvel enregistrement
function saveNewRecording(recordingData) {
  const recordings = JSON.parse(localStorage.getItem('recordings') || '[]');
  
  const newRecording = {
    id: 'rec_' + Date.now(),
    title: recordingData.title || 'Réunion du ' + new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    duration: recordingData.duration || '00:00:00',
    date: recordingData.date || new Date().toLocaleDateString('fr-FR') + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    size: recordingData.size || '0 MB',
    type: recordingData.type || 'video',
    filename: recordingData.filename || 'meeting_' + Date.now() + '.webm',
    blob: recordingData.blob || null
  };
  
  recordings.unshift(newRecording); // Ajouter au début de la liste
  localStorage.setItem('recordings', JSON.stringify(recordings));
  
  console.log('💾 Nouvel enregistrement sauvegardé:', newRecording.title);
  return newRecording;
}

// Exposer les fonctions globalement pour les onclick
window.playRecording = function(recordingId) {
  console.log(`▶️ Lecture de l'enregistrement ${recordingId}`);
  
  const recordings = JSON.parse(localStorage.getItem('recordings') || '[]');
  const recording = recordings.find(r => r.id === recordingId);
  
  if (!recording) {
    showNotification('Enregistrement introuvable', 'error');
    return;
  }
  
  if (recording.blob) {
    // Créer un URL pour le blob et ouvrir dans un nouvel onglet
    const url = URL.createObjectURL(recording.blob);
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.style.width = '100%';
    video.style.maxWidth = '800px';
    
    // Créer un modal pour la lecture
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="zoom-join-modal" style="max-width: 900px;">
        <div class="zoom-join-header">
          <h2>${recording.title}</h2>
          <button class="zoom-close-btn" id="close-video-modal">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div style="padding: 20px;">
          <div id="video-player"></div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('video-player').appendChild(video);
    
    // Attacher l'event listener pour fermer le modal
    const closeBtn = document.getElementById('close-video-modal');
    closeBtn.addEventListener('click', () => {
      modal.remove();
      URL.revokeObjectURL(url);
    });
  } else {
    showNotification('Fichier d\'enregistrement non disponible', 'warning');
  }
}

window.downloadRecording = function(recordingId) {
  console.log(`⬇️ Téléchargement de l'enregistrement ${recordingId}`);
  
  const recordings = JSON.parse(localStorage.getItem('recordings') || '[]');
  const recording = recordings.find(r => r.id === recordingId);
  
  if (!recording) {
    showNotification('Enregistrement introuvable', 'error');
    return;
  }
  
  if (recording.blob) {
    // Créer un lien de téléchargement
    const url = URL.createObjectURL(recording.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = recording.filename || `${recording.title}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Téléchargement démarré', 'success');
  } else {
    showNotification('Fichier d\'enregistrement non disponible', 'warning');
  }
}

window.deleteRecording = function(recordingId) {
  console.log(`🗑️ Suppression de l'enregistrement ${recordingId}`);
  
  const recordings = JSON.parse(localStorage.getItem('recordings') || '[]');
  const recording = recordings.find(r => r.id === recordingId);
  
  if (!recording) {
    showNotification('Enregistrement introuvable', 'error');
    return;
  }
  
  if (confirm(`Êtes-vous sûr de vouloir supprimer "${recording.title}" ?`)) {
    // Supprimer l'enregistrement de la liste
    const updatedRecordings = recordings.filter(r => r.id !== recordingId);
    localStorage.setItem('recordings', JSON.stringify(updatedRecordings));
    
    showNotification('Enregistrement supprimé', 'success');
    loadRecordings(); // Recharger la liste
  }
}

// Initialiser les boutons de contrôle
function initializeControlButtons() {
  // Bouton microphone - commencer en état muted
  const micBtn = document.getElementById('btnToggleMic');
  if (micBtn) {
    micBtn.classList.add('muted');
    micBtn.classList.remove('active');
    micBtn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
  }
  
  // Bouton caméra - commencer en état muted
  const camBtn = document.getElementById('btnToggleCam');
  if (camBtn) {
    camBtn.classList.add('muted');
    camBtn.classList.remove('active');
    camBtn.innerHTML = '<i class="fas fa-video-slash"></i>';
  }
  
  // Bouton partage d'écran - état normal
  const shareBtn = document.getElementById('btnShareScreen');
  if (shareBtn) {
    shareBtn.classList.remove('active');
    shareBtn.classList.remove('muted');
    shareBtn.innerHTML = '<i class="fas fa-desktop"></i>';
    console.log('✅ Bouton partage d\'écran (bas) initialisé');
  } else {
    console.error('❌ Bouton partage d\'écran (bas) non trouvé');
  }

  // Bouton partage dans le header - état normal
  const headerShareBtn = document.getElementById('share-btn');
  if (headerShareBtn) {
    headerShareBtn.classList.remove('active');
    headerShareBtn.classList.remove('muted');
    headerShareBtn.innerHTML = '<i class="fas fa-desktop"></i>Partager';
    console.log('✅ Bouton partage d\'écran (header) initialisé');
  } else {
    console.error('❌ Bouton partage d\'écran (header) non trouvé');
  }
  
  // Bouton enregistrement - état normal
  const recordBtn = document.getElementById('record-control-btn');
  if (recordBtn) {
    recordBtn.classList.remove('active');
    recordBtn.innerHTML = '<i class="fas fa-circle"></i>';
    console.log('✅ Bouton enregistrement (bas) initialisé');
  } else {
    console.error('❌ Bouton enregistrement (bas) non trouvé');
  }

  // Bouton enregistrement dans le header - état normal
  const headerRecordBtn = document.getElementById('record-btn');
  if (headerRecordBtn) {
    headerRecordBtn.classList.remove('active');
    headerRecordBtn.innerHTML = '<i class="fas fa-circle"></i>Enregistrer';
    console.log('✅ Bouton enregistrement (header) initialisé');
  } else {
    console.error('❌ Bouton enregistrement (header) non trouvé');
  }
  
  console.log('✅ Boutons de contrôle initialisés');
}


// Fonction pour afficher les paramètres de réunion
function showMeetingSettings() {
  console.log('⚙️ Paramètres de réunion...');
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Paramètres de réunion</h3>
        <button class="close-btn" id="close-settings-modal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="setting-group">
          <h4>Audio et Vidéo</h4>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="mute-on-join" checked>
              Couper le micro à l'entrée
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="cam-off-join" checked>
              Couper la caméra à l'entrée
            </label>
          </div>
        </div>
        
        <div class="setting-group">
          <h4>Sécurité</h4>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="waiting-room" checked>
              Salle d'attente
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="participant-video" checked>
              Les participants peuvent activer leur vidéo
            </label>
          </div>
        </div>
        
        <div class="setting-group">
          <h4>Enregistrement</h4>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="auto-record">
              Enregistrement automatique
            </label>
          </div>
        </div>
        
        <div class="modal-actions">
          <button id="save-meeting-settings" class="btn btn-primary">
            <i class="fas fa-save"></i> Sauvegarder
          </button>
          <button id="cancel-settings" class="btn btn-secondary">
            Annuler
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Ajouter les écouteurs d'événements
  document.getElementById('close-settings-modal').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('cancel-settings').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('save-meeting-settings').addEventListener('click', () => {
    const settings = {
      muteOnJoin: document.getElementById('mute-on-join').checked,
      camOffJoin: document.getElementById('cam-off-join').checked,
      waitingRoom: document.getElementById('waiting-room').checked,
      participantVideo: document.getElementById('participant-video').checked,
      autoRecord: document.getElementById('auto-record').checked
    };
    
    localStorage.setItem('meetingSettings', JSON.stringify(settings));
    showNotification('Paramètres sauvegardés', 'success');
    modal.remove();
  });
  
  showNotification('Paramètres de réunion ouverts', 'success');
}

// Fonction pour partager sur les réseaux sociaux
function shareOnSocial() {
  console.log('📱 Partage sur les réseaux sociaux...');
  
  if (!currentMeeting) {
    showNotification('Aucune réunion active', 'error');
    return;
  }
  
  const meetingUrl = `${window.location.origin}?meeting=${currentMeeting.id}`;
  const meetingTitle = `Rejoignez ma réunion: ${currentMeeting.title || 'Réunion WebRTC'}`;
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Partager sur les réseaux sociaux</h3>
        <button class="close-btn" id="close-social-modal">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="social-share-options">
          <button id="share-facebook" class="social-btn facebook">
            <i class="fab fa-facebook-f"></i>
            Facebook
          </button>
          
          <button id="share-twitter" class="social-btn twitter">
            <i class="fab fa-twitter"></i>
            Twitter
          </button>
          
          <button id="share-linkedin" class="social-btn linkedin">
            <i class="fab fa-linkedin-in"></i>
            LinkedIn
          </button>
          
          <button id="share-whatsapp" class="social-btn whatsapp">
            <i class="fab fa-whatsapp"></i>
            WhatsApp
          </button>
          
          <button id="copy-link" class="social-btn copy">
            <i class="fas fa-copy"></i>
            Copier le lien
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Ajouter les écouteurs d'événements
  document.getElementById('close-social-modal').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('share-facebook').addEventListener('click', () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(meetingUrl)}&quote=${encodeURIComponent(meetingTitle)}`, '_blank');
  });
  
  document.getElementById('share-twitter').addEventListener('click', () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(meetingUrl)}&text=${encodeURIComponent(meetingTitle)}`, '_blank');
  });
  
  document.getElementById('share-linkedin').addEventListener('click', () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(meetingUrl)}`, '_blank');
  });
  
  document.getElementById('share-whatsapp').addEventListener('click', () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(meetingTitle + ' ' + meetingUrl)}`, '_blank');
  });
  
  document.getElementById('copy-link').addEventListener('click', () => {
    navigator.clipboard.writeText(meetingUrl).then(() => {
      showNotification('Lien copié dans le presse-papiers', 'success');
    });
  });
  
  showNotification('Options de partage ouvertes', 'success');
}

// Fonction pour télécharger l'enregistrement
function downloadRecording() {
  console.log('📥 Téléchargement de l\'enregistrement...');
  
  if (!isRecording && (!recordedChunks || recordedChunks.length === 0)) {
    showNotification('Aucun enregistrement disponible. Démarrez d\'abord un enregistrement.', 'warning');
    return;
  }
  
  if (!recordedChunks || recordedChunks.length === 0) {
    showNotification('Aucune donnée d\'enregistrement disponible', 'warning');
    return;
  }
  
  // Créer le blob et télécharger
  const blob = new Blob(recordedChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `reunion-${currentMeeting?.id || 'enregistrement'}-${new Date().toISOString().split('T')[0]}.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showNotification('Enregistrement téléchargé', 'success');
}

// Fonction pour basculer entre les onglets
function switchToTab(tabName) {
  console.log(`🔄 Basculement vers l'onglet: ${tabName}`);
  
  // Désactiver tous les onglets
  const allTabs = document.querySelectorAll('.tab-content');
  console.log(`📋 Nombre d'onglets trouvés: ${allTabs.length}`);
  allTabs.forEach(tab => {
    tab.classList.remove('active');
    console.log(`❌ Onglet désactivé: ${tab.id}`);
  });
  
  // Activer l'onglet sélectionné
  const targetTab = document.getElementById(`${tabName}-tab`);
  console.log(`🔍 Recherche de l'onglet: ${tabName}-tab`);
  console.log(`🔍 Onglet trouvé:`, targetTab);
  
  if (targetTab) {
    targetTab.classList.add('active');
    console.log(`✅ Onglet activé: ${targetTab.id}`);
  } else {
    console.error(`❌ Onglet non trouvé: ${tabName}-tab`);
    console.log(`🔍 Onglets disponibles:`, Array.from(allTabs).map(t => t.id));
  }

  // État d'onglet courant + badge non-lu
  currentSideTab = tabName;
  if (tabName === 'chat') {
    unreadChatCount = 0;
    const chatBtn = document.querySelector('.panel-tabs .tab-btn[data-tab="chat"]');
    if (chatBtn) {
      chatBtn.removeAttribute('data-badge');
    }
    // Focus auto sur le champ de saisie
    setTimeout(() => document.getElementById('chat-input')?.focus(), 50);
  } else {
    // Retirer le badge non-lu si on bascule vers participants
    const chatBtn = document.querySelector('.panel-tabs .tab-btn[data-tab="chat"]');
    if (chatBtn) {
      chatBtn.removeAttribute('data-badge');
    }
  }
  
  // Mettre à jour les boutons de contrôle
  const allControlBtns = document.querySelectorAll('.control-btn');
  console.log(`🎛️ Nombre de boutons de contrôle: ${allControlBtns.length}`);
  allControlBtns.forEach(btn => {
    btn.classList.remove('active');
    console.log(`❌ Bouton désactivé: ${btn.id}`);
  });
  
  const targetBtn = document.getElementById(`${tabName}-control-btn`);
  if (targetBtn) {
    targetBtn.classList.add('active');
    console.log(`✅ Bouton activé: ${targetBtn.id}`);
  } else {
    console.error(`❌ Bouton non trouvé: ${tabName}-control-btn`);
  }
  
  // Mettre à jour les boutons d'onglet dans le panneau latéral
  const allTabBtns = document.querySelectorAll('.tab-btn');
  allTabBtns.forEach(btn => {
    btn.classList.remove('active');
  });
  
  const targetTabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  if (targetTabBtn) {
    targetTabBtn.classList.add('active');
    console.log(`✅ Bouton d'onglet activé: ${tabName}`);
  }
  
  console.log(`✅ Basculement vers ${tabName} terminé`);
}

// Fonctions des participants améliorés
function inviteParticipants() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Inviter des participants</h3>
        <button class="close-btn" id="close-invite-participants">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="invite-section">
          <h4>Lien de la réunion</h4>
          <div class="invite-link-container">
            <input type="text" id="meeting-link-copy" value="${window.location.href}" readonly>
            <button id="copy-meeting-link-btn" class="btn btn-secondary">
              <i class="fas fa-copy"></i> Copier
            </button>
          </div>
        </div>
        
        <div class="invite-section">
          <h4>Invitation par email</h4>
          <div class="email-invite">
            <input type="email" id="invite-email" placeholder="Adresse email du participant">
            <button id="send-email-invite-btn" class="btn btn-primary">
              <i class="fas fa-envelope"></i> Envoyer
            </button>
          </div>
        </div>
        
        <div class="modal-actions">
          <button id="close-invite-modal" class="btn btn-secondary">
            Fermer
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Ajouter les écouteurs d'événements
  document.getElementById('close-invite-participants').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('close-invite-modal').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('copy-meeting-link-btn').addEventListener('click', () => {
    const linkInput = document.getElementById('meeting-link-copy');
    linkInput.select();
    document.execCommand('copy');
    showNotification('Lien copié dans le presse-papiers', 'success');
  });
  
  document.getElementById('send-email-invite-btn').addEventListener('click', () => {
    const email = document.getElementById('invite-email').value;
    if (email) {
      const subject = 'Invitation à une réunion';
      const body = `Vous êtes invité à rejoindre une réunion.\n\nLien: ${window.location.href}`;
      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink);
      showNotification(`Invitation envoyée à ${email}`, 'success');
    } else {
      showNotification('Veuillez entrer une adresse email', 'error');
    }
  });
  
  showNotification('Modal d\'invitation ouvert', 'success');
}

function showParticipantsSettings() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Paramètres des participants</h3>
        <button class="close-btn" id="close-participants-settings">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="setting-group">
          <h4>Permissions</h4>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="allow-screen-share" checked>
              Autoriser le partage d'écran pour tous
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="allow-chat" checked>
              Autoriser le chat pour tous
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="allow-camera" checked>
              Autoriser la caméra pour tous
            </label>
          </div>
        </div>
        
        <div class="setting-group">
          <h4>Modération</h4>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="mute-all-on-join">
              Couper le micro de tous les nouveaux participants
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="disable-video-on-join">
              Désactiver la vidéo des nouveaux participants
            </label>
          </div>
        </div>
        
        <div class="modal-actions">
          <button id="save-participants-settings" class="btn btn-primary">
            <i class="fas fa-save"></i> Sauvegarder
          </button>
          <button id="cancel-participants-settings" class="btn btn-secondary">
            Annuler
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Ajouter les écouteurs d'événements
  document.getElementById('close-participants-settings').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('cancel-participants-settings').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('save-participants-settings').addEventListener('click', () => {
    const settings = {
      allowScreenShare: document.getElementById('allow-screen-share').checked,
      allowChat: document.getElementById('allow-chat').checked,
      allowCamera: document.getElementById('allow-camera').checked,
      muteAllOnJoin: document.getElementById('mute-all-on-join').checked,
      disableVideoOnJoin: document.getElementById('disable-video-on-join').checked
    };
    
    localStorage.setItem('participantsSettings', JSON.stringify(settings));
    showNotification('Paramètres des participants sauvegardés', 'success');
    modal.remove();
  });
  
  showNotification('Paramètres des participants ouverts', 'success');
}

function searchParticipants(query) {
  const participants = document.querySelectorAll('.participant-item');
  const searchTerm = query.toLowerCase();
  
  participants.forEach(participant => {
    const name = participant.querySelector('.participant-name').textContent.toLowerCase();
    const status = participant.querySelector('.status-text').textContent.toLowerCase();
    
    if (name.includes(searchTerm) || status.includes(searchTerm)) {
      participant.style.display = 'flex';
    } else {
      participant.style.display = 'none';
    }
  });
}

function addParticipant(name, status = 'online') {
  console.log(`👤 Ajout du participant: ${name} (${status})`);
  
  const participantsList = document.getElementById('participants-list');
  if (!participantsList) {
    console.error('❌ participants-list non trouvé');
    return;
  }
  
  const participantDiv = document.createElement('div');
  participantDiv.className = 'participant-item';
  
  const avatar = name.charAt(0).toUpperCase();
  
  participantDiv.innerHTML = `
    <div class="participant-avatar">
      <i class="fas fa-user"></i>
    </div>
    <div class="participant-info">
      <div class="participant-name">${name}</div>
      <div class="participant-status">
        <span class="status-indicator ${status}"></span>
        <span class="status-text">${getStatusText(status)}</span>
      </div>
    </div>
    <div class="participant-actions">
      <button class="participant-action-btn" title="Plus d'options">
        <i class="fas fa-ellipsis-v"></i>
      </button>
    </div>
  `;
  
  participantsList.appendChild(participantDiv);
  updateParticipantsCount();
  
  console.log(`✅ Participant ${name} ajouté avec succès`);
}

// Délégation d'actions participants (mute/eject)
const participantsListRoot = document.getElementById('participants-list');
if (participantsListRoot) {
  participantsListRoot.addEventListener('click', (e) => {
    const btn = e.target.closest('.participant-action-btn');
    if (!btn) return;
    const act = btn.getAttribute('data-act');
    const row = btn.closest('.participant-item');
    const userId = row?.getAttribute('data-user-id');
    if (!userId) return;
    if (act === 'mute') {
      const currentMeeting = window.currentMeetingId || null;
      if (!currentMeeting) return alert('Aucune réunion active');
      if (!socket || !socket.connected) return alert('Socket non connecté');
      socket.emit('mute-participant', { meetingId: currentMeeting, participantId: userId });
      showNotification(`Micro de ${userId} coupé`, 'info');
    } else if (act === 'eject') {
      const currentMeeting = window.currentMeetingId || null;
      if (!currentMeeting) return alert('Aucune réunion active');
      if (!socket || !socket.connected) return alert('Socket non connecté');
      socket.emit('eject-participant', { meetingId: currentMeeting, participantId: userId });
      showNotification(`${userId} retiré`, 'info');
    }
  });
}

// Version identifiée (id utilisateur)
function addParticipantItem(userId, name, status = 'online') {
  const participantsList = document.getElementById('participants-list');
  if (!participantsList) return;
  const existing = participantsList.querySelector(`[data-user-id="${userId}"]`);
  if (existing) return;
  const div = document.createElement('div');
  div.className = 'participant-item';
  div.setAttribute('data-user-id', userId);
  div.innerHTML = `
    <div class="participant-avatar"><i class="fas fa-user"></i></div>
    <div class="participant-info">
      <div class="participant-name">${name}</div>
      <div class="participant-status"><span class="status-indicator ${status}"></span><span class="status-text">${getStatusText(status)}</span></div>
    </div>
    <div class="participant-actions">
      <button class="participant-action-btn" data-act="mute" title="Couper le micro"><i class="fas fa-microphone-slash"></i></button>
      <button class="participant-action-btn" data-act="eject" title="Retirer"><i class="fas fa-user-slash"></i></button>
    </div>`;
  participantsList.appendChild(div);
  updateParticipantsCount();
}

function removeParticipantItem(userId) {
  const participantsList = document.getElementById('participants-list');
  if (!participantsList) return;
  const el = participantsList.querySelector(`[data-user-id="${userId}"]`);
  if (el) {
    el.remove();
    updateParticipantsCount();
  }
}

function getStatusText(status) {
  const statusMap = {
    'online': 'En ligne',
    'away': 'Absent',
    'busy': 'Occupé',
    'offline': 'Hors ligne'
  };
  return statusMap[status] || 'Inconnu';
}

function updateParticipantsCount() {
  const participantsList = document.getElementById('participants-list');
  const count = participantsList ? participantsList.children.length : 0;
  
  console.log(`📊 Nombre de participants: ${count}`);
  
  const titleElement = document.querySelector('.participants-title span');
  if (titleElement) {
    titleElement.textContent = `Participants (${count})`;
    console.log(`✅ Compteur mis à jour: ${count} participants`);
  } else {
    console.error('❌ participants-title span non trouvé');
  }
}

// Fonctions du chat amélioré
function clearChat() {
  const chatMessages = document.getElementById('chat-messages');
  if (chatMessages) {
    chatMessages.innerHTML = `
      <div class="chat-welcome">
        <i class="fas fa-comment-dots"></i>
        <p>Chat effacé</p>
        <small>Nouveaux messages apparaîtront ici</small>
      </div>
    `;
    showNotification('Chat effacé', 'info');
  }
}

function showChatSettings() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>Paramètres du chat</h3>
        <button class="close-btn" id="close-chat-settings">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="setting-group">
          <h4>Notifications</h4>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="chat-notifications" checked>
              Notifications sonores pour les nouveaux messages
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="chat-mentions" checked>
              Notifications pour les mentions
            </label>
          </div>
        </div>
        
        <div class="setting-group">
          <h4>Affichage</h4>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="show-timestamps" checked>
              Afficher les horodatages
            </label>
          </div>
          <div class="setting-item">
            <label>
              <input type="checkbox" id="compact-mode">
              Mode compact
            </label>
          </div>
        </div>
        
        <div class="modal-actions">
          <button id="save-chat-settings" class="btn btn-primary">
            <i class="fas fa-save"></i> Sauvegarder
          </button>
          <button id="cancel-chat-settings" class="btn btn-secondary">
            Annuler
          </button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Ajouter les écouteurs d'événements
  document.getElementById('close-chat-settings').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('cancel-chat-settings').addEventListener('click', () => {
    modal.remove();
  });
  
  document.getElementById('save-chat-settings').addEventListener('click', () => {
    const settings = {
      notifications: document.getElementById('chat-notifications').checked,
      mentions: document.getElementById('chat-mentions').checked,
      timestamps: document.getElementById('show-timestamps').checked,
      compactMode: document.getElementById('compact-mode').checked
    };
    
    localStorage.setItem('chatSettings', JSON.stringify(settings));
    showNotification('Paramètres du chat sauvegardés', 'success');
    modal.remove();
  });
  
  showNotification('Paramètres du chat ouverts', 'success');
}

function showEmojiPicker() {
  const emojis = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 400px;">
      <div class="modal-header">
        <h3>Choisir un emoji</h3>
        <button class="close-btn" id="close-emoji-picker">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="emoji-grid">
          ${emojis.map(emoji => `<span class="emoji-item" data-emoji="${emoji}">${emoji}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Ajouter les écouteurs d'événements
  document.getElementById('close-emoji-picker').addEventListener('click', () => {
    modal.remove();
  });
  
  // Ajouter les emojis au clic
  modal.querySelectorAll('.emoji-item').forEach(item => {
    item.addEventListener('click', () => {
      const emoji = item.dataset.emoji;
      const chatInput = document.getElementById('chat-input');
      if (chatInput) {
        chatInput.value += emoji;
        chatInput.focus();
      }
      modal.remove();
    });
  });
  
  showNotification('Sélecteur d\'emoji ouvert', 'info');
}

function attachFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*,.pdf,.doc,.docx,.txt';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showNotification('Fichier trop volumineux (max 10MB)', 'error');
        return;
      }
      
      const fileName = file.name;
      const fileSize = (file.size / 1024 / 1024).toFixed(2) + 'MB';
      
      // Simuler l'envoi du fichier
      addChatMessage('Vous', `📎 Fichier joint: ${fileName} (${fileSize})`, true);
      showNotification(`Fichier "${fileName}" joint`, 'success');
    }
  };
  input.click();
}

// Fonction pour ajouter des messages au chat
function addChatMessage(author, message, isOwn = false, isSystem = false) {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;
  
  // Supprimer le message de bienvenue s'il existe
  const welcome = chatMessages.querySelector('.chat-welcome');
  if (welcome) {
    welcome.remove();
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${isOwn ? 'own-message' : ''} ${isSystem ? 'system' : ''}`;
  
  const time = new Date().toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const avatar = author.charAt(0).toUpperCase();
  
  messageDiv.innerHTML = `
    <div class="chat-avatar">${avatar}</div>
    <div class="chat-message-content">
      <div class="chat-message-header">
        <span class="chat-message-author">${author}</span>
        <span class="chat-message-time">${time}</span>
      </div>
      <div class="chat-message-text">${message}</div>
    </div>
  `;
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Badge non-lu si onglet chat non actif (sauf pour les messages système)
  if (currentSideTab !== 'chat' && !isSystem) {
    unreadChatCount += 1;
    const chatTabBtn = document.querySelector('.panel-tabs .tab-btn[data-tab="chat"]');
    if (chatTabBtn) chatTabBtn.setAttribute('data-badge', String(unreadChatCount));
  }
}


// Fonction pour envoyer un message
function sendChatMessage() {
  const chatInput = document.getElementById('chat-input');
  if (!chatInput) return;
  
  const message = chatInput.value.trim();
  if (!message) return;
  
  // Ajouter le message au chat
  addChatMessage('Vous', message, true);
  
  // Vider l'input
  chatInput.value = '';
  
  // Simuler une réponse (pour la démo)
  setTimeout(() => {
    const responses = [
      'Merci pour l\'information !',
      'Je suis d\'accord avec vous',
      'Très intéressant !',
      'Pouvez-vous expliquer davantage ?',
      'Exactement !'
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    addChatMessage('Participant', randomResponse, false);
  }, 1000 + Math.random() * 2000);
}


// Améliorer l'écouteur d'événements pour l'envoi de messages
const originalSendMessage = document.getElementById('send-message-btn');
if (originalSendMessage) {
  originalSendMessage.addEventListener('click', sendChatMessage);
}

// Ajouter la possibilité d'envoyer avec Enter
const chatInputElement = document.getElementById('chat-input');
if (chatInputElement) {
  chatInputElement.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
}

// Ajouter des participants de test immédiatement
addParticipant('Alice Martin', 'online');
addParticipant('Bob Dupont', 'away');
addParticipant('Claire Moreau', 'busy');
addParticipant('David Leroy', 'online');

// Initialiser l'onglet chat comme actif
setTimeout(() => {
  console.log('🔄 Initialisation de l\'onglet chat...');
  console.log('🔍 Éléments avant basculement:');
  console.log('- chat-tab:', document.getElementById('chat-tab'));
  console.log('- participants-tab:', document.getElementById('participants-tab'));
  console.log('- chat-control-btn:', document.getElementById('chat-control-btn'));
  console.log('- participants-control-btn:', document.getElementById('participants-control-btn'));
  
  switchToTab('chat');
  
  // Ajouter des messages de test au chat pour démonstration
  addChatMessage('Système', 'Bienvenue dans le chat de la réunion !', false, true);
}, 500);

console.log('✅ Application WebRTC chargée et prête');


// Gérer le menu Plus d'options
function toggleMoreOptionsMenu() {
  const menu = document.getElementById('more-options-menu');
  if (menu) {
    if (menu.classList.contains('hidden')) {
      showMoreOptionsMenu();
    } else {
      hideMoreOptionsMenu();
    }
  }
}

function showMoreOptionsMenu() {
  const menu = document.getElementById('more-options-menu');
  if (menu) {
    menu.classList.remove('hidden');
    console.log('✅ Menu Plus d\'options ouvert');
  }
}

function hideMoreOptionsMenu() {
  const menu = document.getElementById('more-options-menu');
  if (menu) {
    menu.classList.add('hidden');
    console.log('✅ Menu Plus d\'options fermé');
  }
}