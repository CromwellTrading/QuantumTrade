// =============================================
// CONFIGURACIÓN GLOBAL
// =============================================

const SUPABASE_URL = 'https://flodrkrvaqsmelbkfknv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsb2Rya3J2YXFzbWVsYmtma252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwODY0NjgsImV4cCI6MjA3OTY2MjQ2OH0.zVTaUbkiLCJ0dUFs808TZErgnIXCYsYQ2lw-CEmVCFI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const SERVER_URL = window.location.origin;
const ADMIN_ID = "5376388604";

let signalManager = null;

// =============================================
// FUNCIÓN DE DETECCIÓN DE USER ID
// =============================================

function getUserIdSuperRobust() {
    const urlParams = new URLSearchParams(window.location.search);
    const tgId = urlParams.get('tgid');
    if (tgId) {
        return tgId;
    }
    
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand();
        
        const user = tg.initDataUnsafe?.user;
        if (user && user.id) {
            return user.id.toString();
        }
    }
    
    try {
        const fragment = window.location.hash.substring(1);
        if (fragment) {
            const fragmentParams = new URLSearchParams(fragment);
            const tgWebAppData = fragmentParams.get('tgWebAppData');
            
            if (tgWebAppData) {
                const decodedWebAppData = decodeURIComponent(tgWebAppData);
                const webAppParams = new URLSearchParams(decodedWebAppData);
                const userString = webAppParams.get('user');
                
                if (userString) {
                    const userData = JSON.parse(decodeURIComponent(userString));
                    if (userData && userData.id) {
                        return userData.id.toString();
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ [TELEGRAM] Error parseando fragmento:', error);
    }
    
    const storedId = localStorage.getItem('tg_user_id');
    if (storedId) {
        return storedId;
    }
    
    const guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
    return guestId;
}

// =============================================
// SISTEMA DE PARTÍCULAS
// =============================================

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const left = Math.random() * 100;
        const delay = Math.random() * 15;
        const duration = 15 + Math.random() * 10;
        
        particle.style.left = `${left}%`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.animationDuration = `${duration}s`;
        
        const size = 2 + Math.random() * 3;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        const colors = ['#00ff9d', '#00e5ff', '#ff00e5'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.background = color;
        
        particlesContainer.appendChild(particle);
    }
}

// =============================================
// SISTEMA DE TÉRMINOS Y CONDICIONES
// =============================================

function initializeTermsAndConditions() {
    const termsModal = document.getElementById('termsModal');
    const acceptCheckbox = document.getElementById('acceptTerms');
    const confirmBtn = document.getElementById('confirmTerms');
    const declineBtn = document.getElementById('declineTerms');
    
    // Verificar si ya aceptó los términos
    const termsAccepted = localStorage.getItem('quantum_terms_accepted');
    
    if (!termsAccepted) {
        // Mostrar modal de términos
        setTimeout(() => {
            termsModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }, 1000);
    }
    
    // Habilitar/deshabilitar botón de aceptar
    if (acceptCheckbox && confirmBtn) {
        acceptCheckbox.addEventListener('change', function() {
            confirmBtn.disabled = !this.checked;
        });
    }
    
    // Manejar aceptación de términos
    if (confirmBtn) {
        confirmBtn.addEventListener('click', function() {
            if (!acceptCheckbox.checked) return;
            
            localStorage.setItem('quantum_terms_accepted', 'true');
            localStorage.setItem('quantum_terms_accepted_date', new Date().toISOString());
            
            termsModal.classList.remove('active');
            document.body.style.overflow = 'auto';
            
            // Habilitar funcionalidades
            if (signalManager) {
                signalManager.enableFunctionalityAfterTermsAccepted();
                signalManager.showNotification('Términos aceptados correctamente. ¡Bienvenido a Quantum Signal Trader!', 'success');
            }
        });
    }
    
    // Manejar rechazo de términos
    if (declineBtn) {
        declineBtn.addEventListener('click', function() {
            // Mostrar mensaje de despedida
            const declineMessage = document.createElement('div');
            declineMessage.className = 'terms-decline-message';
            declineMessage.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-door-open" style="font-size: 3rem; color: var(--warning); margin-bottom: 20px;"></i>
                    <h3 style="color: var(--warning); margin-bottom: 15px;">Términos Declinados</h3>
                    <p style="color: rgba(255,255,255,0.8); margin-bottom: 25px;">
                        Para utilizar Quantum Signal Trader es necesario aceptar los términos y condiciones.
                    </p>
                    <p style="color: rgba(255,255,255,0.6);">
                        Puede cerrar esta pestaña o volver más tarde si cambia de opinión.
                    </p>
                </div>
            `;
            
            termsModal.querySelector('.terms-body').innerHTML = '';
            termsModal.querySelector('.terms-body').appendChild(declineMessage);
            termsModal.querySelector('.terms-footer').style.display = 'none';
        });
    }
}

// Función para mostrar términos nuevamente (útil para admin)
function showTermsAndConditions() {
    const termsModal = document.getElementById('termsModal');
    if (termsModal) {
        termsModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// =============================================
// CLASE SIGNAL MANAGER - CORREGIDA Y MEJORADA
// =============================================

class SignalManager {
    constructor() {
        console.log('🚀 [APP] Inicializando SignalManager con User ID:', detectedUserId);
        
        this.signals = [];
        this.operations = [];
        this.sessions = [];
        this.currentSession = null;
        this.isAdmin = false;
        this.isVIP = false;
        this.hasReceivedFreeSignal = false;
        this.serverConnected = false;
        
        this.currentUserId = detectedUserId;
        this.userData = null;
        this.searchedUser = null;
        
        this.currentView = 'signals'; // Vista actual
        
        try {
            this.initializeDOMElements();
            this.initEventListeners();
            this.loadFromLocalStorage();
            this.updateStats();
            this.initChart();
            
            // Verificar términos antes de permitir cualquier acción
            this.checkTermsAcceptance();
            
            this.loadUserData();
            this.loadInitialSignals();
            this.setupRealtimeSubscription();
            this.checkServerConnection();
            
            setInterval(() => this.checkServerConnection(), 30000);
            
        } catch (error) {
            console.error('❌ [APP] Error durante la inicialización de SignalManager:', error);
        }
    }
    
    checkTermsAcceptance() {
        const termsAccepted = localStorage.getItem('quantum_terms_accepted');
        if (!termsAccepted) {
            this.disableFunctionalityUntilTermsAccepted();
        }
    }
    
    disableFunctionalityUntilTermsAccepted() {
        // Deshabilitar botones importantes
        const elementsToDisable = [
            this.sendSignalBtn,
            this.readyBtn,
            this.startSession,
            this.notifyClients
        ];
        
        elementsToDisable.forEach(element => {
            if (element) {
                element.style.opacity = '0.5';
                element.style.pointerEvents = 'none';
            }
        });
        
        // Mostrar tooltip explicativo
        this.showNotification('Debe aceptar los términos y condiciones para usar todas las funciones', 'warning');
    }
    
    enableFunctionalityAfterTermsAccepted() {
        const elementsToEnable = [
            this.sendSignalBtn,
            this.readyBtn,
            this.startSession,
            this.notifyClients
        ];
        
        elementsToEnable.forEach(element => {
            if (element) {
                element.style.opacity = '1';
                element.style.pointerEvents = 'auto';
            }
        });
    }
    
    async loadUserData() {
        if (!this.currentUserId || this.currentUserId.startsWith('guest_')) {
            console.log('❌ [APP] No hay User ID válido para cargar datos');
            this.updateUserStatus();
            return;
        }
        
        try {
            console.log('🔍 [APP] Cargando datos del usuario desde servidor:', this.currentUserId);
            
            const apiUrl = `${SERVER_URL}/api/user/${this.currentUserId}`;
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.userData = result.data;
                
                console.log('🔍 [APP] Datos completos del servidor:', result.data);
                
                this.isAdmin = Boolean(result.data.is_admin);
                this.isVIP = Boolean(result.data.is_vip);
                
                console.log('✅ [APP] Estados desde servidor - Admin:', this.isAdmin, 'VIP:', this.isVIP);
                
            } else {
                console.error('❌ [APP] Error en respuesta del servidor:', result);
            }
        } catch (error) {
            console.error('❌ [APP] Error cargando datos del usuario:', error);
        } finally {
            this.updateUI();
        }
    }

    async loadInitialSignals() {
        try {
            console.log('📡 [APP] Cargando señales iniciales desde Supabase');
            
            const { data, error } = await supabase
                .from('signals')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                this.signals = data.map(signal => ({
                    id: signal.id,
                    asset: signal.asset,
                    timeframe: signal.timeframe,
                    direction: signal.direction,
                    timestamp: new Date(signal.created_at),
                    expires: new Date(signal.expires_at),
                    status: signal.status || 'pending',
                    isFree: signal.is_free || false
                }));
                
                // CORRECCIÓN: Cargar operaciones según tipo de usuario
                this.loadUserOperations();
                this.renderSignals();
                this.updateStats();
                
                console.log('✅ [APP] Señales iniciales cargadas:', this.signals.length);
            } else {
                console.log('ℹ️ [APP] No hay señales en la base de datos');
            }
        } catch (error) {
            console.error('❌ [APP] Error cargando señales iniciales:', error);
        }
    }
    
    // NUEVO MÉTODO: Cargar operaciones según tipo de usuario
    loadUserOperations() {
        if (this.isAdmin || this.isVIP) {
            // Admin y VIP ven todas las operaciones
            this.operations = [...this.signals];
        } else {
            // Usuarios regulares: solo señales free que han recibido
            this.operations = this.signals.filter(signal => 
                signal.isFree && this.hasReceivedFreeSignal
            );
        }
        console.log('📊 [APP] Operaciones cargadas:', this.operations.length, 'para usuario', this.isVIP ? 'VIP' : 'Regular');
    }
    
    updateUI() {
        console.log('🔄 [APP] Actualizando UI con UserID:', this.currentUserId, 'Admin:', this.isAdmin, 'VIP:', this.isVIP);
        
        const userIdDisplay = document.getElementById('userIdDisplay');
        if (userIdDisplay) {
            userIdDisplay.className = 'user-badge ';
            if (this.isAdmin) {
                userIdDisplay.classList.add('admin');
                userIdDisplay.innerHTML = `<i class="fas fa-user-shield"></i> ID: ${this.currentUserId} (Admin)`;
                
                if (this.adminPanel) {
                    this.adminPanel.style.display = 'block';
                    console.log('🎯 Panel de admin mostrado');
                }
            } else if (this.isVIP) {
                userIdDisplay.classList.add('vip');
                userIdDisplay.innerHTML = `<i class="fas fa-crown"></i> ID: ${this.currentUserId} (VIP)`;
            } else {
                userIdDisplay.classList.add('regular');
                userIdDisplay.innerHTML = `<i class="fas fa-user"></i> ID: ${this.currentUserId}`;
            }
        }

        this.updateUserStatus();
        
        if (this.isAdmin) {
            if (this.adminBtn) {
                this.adminBtn.style.display = 'block';
                this.adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Panel Admin';
                this.adminBtn.classList.add('active');
            }
            if (this.showUsers) {
                this.showUsers.style.display = 'block';
            }
            if (this.showUserManagement) {
                this.showUserManagement.style.display = 'block';
            }
            this.loadUsersFromSupabase();
        } else {
            if (this.adminBtn) {
                this.adminBtn.style.display = 'none';
            }
            if (this.showUsers) {
                this.showUsers.style.display = 'none';
            }
            if (this.showUserManagement) {
                this.showUserManagement.style.display = 'none';
            }
            if (this.adminPanel) {
                this.adminPanel.style.display = 'none';
            }
        }
        
        if (this.vipAccess) {
            if (this.isVIP) {
                this.vipAccess.innerHTML = '<i class="fas fa-crown"></i> VIP ACTIVO';
                this.vipAccess.classList.add('active');
            } else {
                this.vipAccess.innerHTML = '<i class="fas fa-crown"></i> VIP';
                this.vipAccess.classList.remove('active');
            }
        }
    }

    initializeDOMElements() {
        console.log('🏗️ [APP] Inicializando elementos DOM');
        
        this.sendSignalBtn = document.getElementById('sendSignal');
        this.signalsContainer = document.getElementById('signalsContainer');
        this.notification = document.getElementById('notification');
        this.signalAlert = document.getElementById('signalAlert');
        this.readyBtn = document.getElementById('readyBtn');
        this.closeAlert = document.getElementById('closeAlert');
        this.showSignals = document.getElementById('showSignals');
        this.showStats = document.getElementById('showStats');
        this.showUsers = document.getElementById('showUsers');
        this.showUserManagement = document.getElementById('showUserManagement');
        this.vipAccess = document.getElementById('vipAccess');
        this.adminBtn = document.getElementById('adminBtn');
        this.statsContainer = document.getElementById('statsContainer');
        this.usersContainer = document.getElementById('usersContainer');
        this.userManagementContainer = document.getElementById('userManagementContainer');
        this.sessionInfo = document.getElementById('sessionInfo');
        this.userStatus = document.getElementById('userStatus');
        this.startSession = document.getElementById('startSession');
        this.endSession = document.getElementById('endSession');
        this.notifyClients = document.getElementById('notifyClients');
        this.vipModal = document.getElementById('vipModal');
        this.closeVipModal = document.getElementById('closeVipModal');
        this.usersTableBody = document.getElementById('usersTableBody');
        this.refreshUsers = document.getElementById('refreshUsers');
        this.connectionStatus = document.getElementById('connectionStatus');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        
        this.adminPanel = document.getElementById('adminPanel');
        
        this.userSearchInput = document.getElementById('userSearchInput');
        this.searchUserBtn = document.getElementById('searchUserBtn');
        this.userSearchResult = document.getElementById('userSearchResult');
        this.makeVipBtn = document.getElementById('makeVipBtn');
        this.removeVipBtn = document.getElementById('removeVipBtn');
        this.userActions = document.getElementById('userActions');
        
        this.assetInput = document.getElementById('asset');
        this.timeframeSelect = document.getElementById('timeframe');
        this.directionSelect = document.getElementById('direction');
        
        this.isReady = false;
        
        this.winCount = document.getElementById('winCount');
        this.lossCount = document.getElementById('lossCount');
        this.totalCount = document.getElementById('totalCount');
        this.operationsTable = document.getElementById('operationsTable');
        this.performanceChart = null;

        console.log('✅ [APP] Elementos DOM inicializados correctamente');
    }

    async checkServerConnection() {
        try {
            const response = await fetch(`${SERVER_URL}/health`);
            if (response.ok) {
                this.serverConnected = true;
                this.updateConnectionStatus(true, 'Conectado al servidor');
            } else {
                throw new Error('Server not responding');
            }
        } catch (error) {
            this.serverConnected = false;
            this.updateConnectionStatus(false, 'Error de conexión con el servidor');
            console.error('Error checking server connection:', error);
        }
    }
    
    updateConnectionStatus(connected, message) {
        if (this.connectionStatus && this.statusDot && this.statusText) {
            if (connected) {
                this.statusDot.className = 'status-dot status-connected';
                this.statusText.textContent = message;
                this.connectionStatus.style.background = 'rgba(0, 255, 157, 0.1)';
            } else {
                this.statusDot.className = 'status-dot status-disconnected';
                this.statusText.textContent = message;
                this.connectionStatus.style.background = 'rgba(255, 0, 51, 0.1)';
            }
        }
    }
    
    // FUNCIÓN: Enviar notificaciones al bot de Telegram
    async sendTelegramNotification(message, type = 'session') {
        try {
            console.log('📤 [TELEGRAM] Enviando notificación al bot:', message);
            
            const response = await fetch(`${SERVER_URL}/api/telegram/notify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    type: type,
                    userId: this.currentUserId
                })
            });

            if (response.ok) {
                console.log('✅ [TELEGRAM] Notificación enviada correctamente');
            } else {
                console.error('❌ [TELEGRAM] Error enviando notificación:', response.status);
            }
        } catch (error) {
            console.error('❌ [TELEGRAM] Error enviando notificación al bot:', error);
        }
    }
    
    initEventListeners() {
        console.log('🔧 [APP] Inicializando event listeners');
        
        if (this.sendSignalBtn) {
            this.sendSignalBtn.addEventListener('click', () => {
                this.sendSignal();
            });
        }
        
        if (this.readyBtn) {
            this.readyBtn.addEventListener('click', () => {
                this.toggleReady();
            });
        }
        
        if (this.closeAlert) {
            this.closeAlert.addEventListener('click', () => {
                this.hideAlert();
            });
        }
        
        if (this.showSignals) {
            this.showSignals.addEventListener('click', () => {
                this.showView('signals');
            });
        }
        
        if (this.showStats) {
            this.showStats.addEventListener('click', () => {
                this.showView('stats');
            });
        }
        
        if (this.showUsers) {
            this.showUsers.addEventListener('click', () => {
                this.showView('users');
            });
        }
        
        if (this.showUserManagement) {
            this.showUserManagement.addEventListener('click', () => {
                this.showView('userManagement');
            });
        }
        
        if (this.vipAccess) {
            this.vipAccess.addEventListener('click', () => {
                this.showVipModal();
            });
        }
        
        if (this.adminBtn) {
            this.adminBtn.addEventListener('click', () => {
                if (this.isAdmin) {
                    this.showAdminPanel();
                }
            });
        }
        
        if (this.startSession) {
            this.startSession.addEventListener('click', () => {
                this.startTradingSession();
            });
        }
        
        if (this.endSession) {
            this.endSession.addEventListener('click', () => {
                this.endTradingSession();
            });
        }
        
        if (this.notifyClients) {
            this.notifyClients.addEventListener('click', () => {
                this.sendClientNotification();
            });
        }
        
        if (this.closeVipModal) {
            this.closeVipModal.addEventListener('click', () => {
                this.hideVipModal();
            });
        }
        
        if (this.refreshUsers) {
            this.refreshUsers.addEventListener('click', () => {
                this.loadUsersFromSupabase();
            });
        }

        if (this.searchUserBtn) {
            this.searchUserBtn.addEventListener('click', () => {
                this.searchUser();
            });
        }
        
        if (this.makeVipBtn) {
            this.makeVipBtn.addEventListener('click', () => {
                this.makeUserVip();
            });
        }
        
        if (this.removeVipBtn) {
            this.removeVipBtn.addEventListener('click', () => {
                this.removeUserVip();
            });
        }
        
        document.querySelectorAll('.time-filter').forEach(filter => {
            filter.addEventListener('click', () => {
                document.querySelectorAll('.time-filter').forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                this.updateStats(filter.dataset.period);
            });
        });

        console.log('✅ [APP] Event listeners inicializados correctamente');
    }

    // MÉTODO MEJORADO PARA CAMBIAR VISTAS - CORREGIDO
    showView(viewName) {
        console.log('👁️ [APP] Cambiando a vista:', viewName);
        
        // Ocultar todas las vistas y paneles
        const views = ['signals', 'stats', 'users', 'userManagement'];
        views.forEach(view => {
            const container = document.getElementById(`${view}Container`) || document.getElementById(`${view}Panel`);
            if (container) {
                container.classList.remove('active');
                container.style.display = 'none';
            }
        });
        
        // Ocultar paneles adicionales
        if (this.adminPanel) {
            this.adminPanel.style.display = 'none';
        }
        
        // Remover clase active de todos los botones
        const buttons = [this.showSignals, this.showStats, this.showUsers, this.showUserManagement];
        buttons.forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        
        // Mostrar vista seleccionada
        switch(viewName) {
            case 'signals':
                if (this.signalsContainer) {
                    const signalsPanel = document.getElementById('signalsPanel');
                    if (signalsPanel) {
                        signalsPanel.classList.add('active');
                        signalsPanel.style.display = 'block';
                    }
                }
                // Mostrar panel de admin si es admin
                if (this.isAdmin && this.adminPanel) {
                    this.adminPanel.style.display = 'block';
                }
                if (this.showSignals) this.showSignals.classList.add('active');
                break;
                
            case 'stats':
                if (this.statsContainer) {
                    this.statsContainer.classList.add('active');
                    this.statsContainer.style.display = 'block';
                }
                if (this.showStats) this.showStats.classList.add('active');
                break;
                
            case 'users':
                if (this.usersContainer) {
                    this.usersContainer.classList.add('active');
                    this.usersContainer.style.display = 'block';
                }
                if (this.showUsers) this.showUsers.classList.add('active');
                break;
                
            case 'userManagement':
                if (this.userManagementContainer) {
                    this.userManagementContainer.classList.add('active');
                    this.userManagementContainer.style.display = 'block';
                }
                if (this.showUserManagement) this.showUserManagement.classList.add('active');
                break;
        }
        
        this.currentView = viewName;
        
        // Actualizar estadísticas si se muestra la vista de stats
        if (viewName === 'stats') {
            this.updateStats();
        }
    }

    async searchUser() {
        const searchId = this.userSearchInput.value.trim();
        if (!searchId) {
            alert('Por favor, ingresa un ID de Telegram');
            return;
        }

        try {
            const response = await fetch(`${SERVER_URL}/api/users/search/${searchId}`);
            const result = await response.json();

            if (result.success) {
                this.searchedUser = result.data;
                this.displayUserSearchResult();
            } else {
                this.userSearchResult.innerHTML = '<p class="error">Error al buscar usuario</p>';
                this.userSearchResult.style.display = 'block';
            }
        } catch (error) {
            console.error('Error buscando usuario:', error);
            this.userSearchResult.innerHTML = '<p class="error">Error al buscar usuario</p>';
            this.userSearchResult.style.display = 'block';
        }
    }

    displayUserSearchResult() {
        if (!this.searchedUser) {
            this.userSearchResult.innerHTML = `
                <div class="user-not-found">
                    <i class="fas fa-user-times"></i>
                    <p>Usuario no encontrado</p>
                    <p>El ID ${this.userSearchInput.value} no está registrado en el sistema</p>
                </div>
            `;
        } else {
            const isVip = this.searchedUser.is_vip;
            const vipExpires = this.searchedUser.vip_expires_at ? new Date(this.searchedUser.vip_expires_at) : null;
            const now = new Date();
            const daysLeft = vipExpires ? Math.ceil((vipExpires - now) / (1000 * 60 * 60 * 24)) : 0;
            
            let vipStatus = 'No VIP';
            let daysLeftHtml = '';
            
            if (isVip && vipExpires && vipExpires > now) {
                vipStatus = 'Usuario VIP';
                daysLeftHtml = `<div class="vip-time-remaining">Tiempo restante: <span class="days-left">${daysLeft} días</span></div>`;
            } else if (isVip && vipExpires && vipExpires <= now) {
                vipStatus = 'VIP Expirado';
            }

            this.userSearchResult.innerHTML = `
                <div class="user-found">
                    <div class="user-header">
                        <i class="fas fa-user"></i>
                        <h4>Usuario Encontrado</h4>
                    </div>
                    <div class="user-details">
                        <p><strong>ID:</strong> ${this.searchedUser.telegram_id}</p>
                        <p><strong>Nombre:</strong> ${this.searchedUser.first_name || 'No especificado'}</p>
                        <p><strong>Usuario:</strong> @${this.searchedUser.username || 'No especificado'}</p>
                        <p><strong>Estado:</strong> <span class="user-status ${isVip && vipExpires > now ? 'vip' : 'regular'}">${vipStatus}</span></p>
                        ${daysLeftHtml}
                    </div>
                </div>
            `;

            this.userActions.style.display = 'flex';
            this.makeVipBtn.style.display = (!isVip || (vipExpires && vipExpires <= now)) ? 'block' : 'none';
            this.removeVipBtn.style.display = (isVip && vipExpires && vipExpires > now) ? 'block' : 'none';
        }

        this.userSearchResult.style.display = 'block';
    }

    async makeUserVip() {
        if (!this.searchedUser) return;

        const days = prompt('¿Por cuántos días quieres hacer VIP al usuario?', '30');
        if (!days || isNaN(days)) return;

        try {
            const response = await fetch(`${SERVER_URL}/api/users/vip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegramId: this.searchedUser.telegram_id,
                    userId: this.currentUserId,
                    days: parseInt(days)
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(result.message, 'success');
                await this.searchUser();
            } else {
                this.showNotification('Error al hacer VIP: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error haciendo usuario VIP:', error);
            this.showNotification('Error al hacer VIP al usuario', 'error');
        }
    }

    async removeUserVip() {
        if (!this.searchedUser) return;

        if (!confirm('¿Estás seguro de que quieres quitar el VIP a este usuario?')) return;

        try {
            const response = await fetch(`${SERVER_URL}/api/users/remove-vip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegramId: this.searchedUser.telegram_id,
                    userId: this.currentUserId
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(result.message, 'success');
                await this.searchUser();
            } else {
                this.showNotification('Error al quitar VIP: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error quitando VIP:', error);
            this.showNotification('Error al quitar VIP al usuario', 'error');
        }
    }

    async loadUsersFromSupabase() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            if (data) {
                this.renderUsers(data);
            }
        } catch (error) {
            console.error('Error loading users from Supabase:', error);
        }
    }
    
    renderUsers(users) {
        if (!this.usersTableBody) return;
        
        this.usersTableBody.innerHTML = users.map(user => {
            const isVip = user.is_vip;
            const vipExpires = user.vip_expires_at ? new Date(user.vip_expires_at) : null;
            const now = new Date();
            const expiresIn = vipExpires ? Math.ceil((vipExpires - now) / (1000 * 60 * 60 * 24)) : 0;
            
            let vipStatus = 'No VIP';
            let daysLeftClass = '';
            
            if (isVip && vipExpires && vipExpires > now) {
                vipStatus = `VIP - Expira en <span class="days-left ${expiresIn <= 5 ? 'danger' : (expiresIn <= 15 ? 'warning' : '')}">${expiresIn} días</span>`;
            } else if (isVip && vipExpires && vipExpires <= now) {
                vipStatus = 'VIP Expirado';
            }
            
            return `
                <tr>
                    <td>${user.telegram_id}</td>
                    <td>${user.username || user.first_name || 'N/A'}</td>
                    <td>${vipStatus}</td>
                    <td>${vipExpires ? vipExpires.toLocaleDateString() : 'N/A'}</td>
                    <td class="user-actions">
                        ${!isVip || (vipExpires && vipExpires <= now) ? 
                            `<button class="user-action-btn btn-profit" onclick="signalManager.makeVip('${user.telegram_id}')">Hacer VIP</button>` : 
                            `<button class="user-action-btn btn-loss" onclick="signalManager.removeVip('${user.telegram_id}')">Quitar VIP</button>`
                        }
                        ${isVip && vipExpires && vipExpires > now && expiresIn <= 5 ? 
                            `<button class="user-action-btn btn-notify" onclick="signalManager.notifyVipExpiring('${user.telegram_id}')">Notificar (5 días)</button>` : 
                            ''
                        }
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    async makeVip(telegramId) {
        const days = prompt('¿Por cuántos días quieres hacer VIP al usuario?', '30');
        if (!days || isNaN(days)) return;

        try {
            const response = await fetch(`${SERVER_URL}/api/users/vip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegramId: telegramId,
                    userId: this.currentUserId,
                    days: parseInt(days)
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(result.message, 'success');
                this.loadUsersFromSupabase();
            } else {
                this.showNotification('Error al hacer VIP: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error haciendo usuario VIP:', error);
            this.showNotification('Error al hacer VIP al usuario', 'error');
        }
    }
    
    async removeVip(telegramId) {
        if (!confirm('¿Estás seguro de que quieres quitar el VIP a este usuario?')) return;

        try {
            const response = await fetch(`${SERVER_URL}/api/users/remove-vip`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegramId: telegramId,
                    userId: this.currentUserId
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(result.message, 'success');
                this.loadUsersFromSupabase();
            } else {
                this.showNotification('Error al quitar VIP: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error quitando VIP:', error);
            this.showNotification('Error al quitar VIP al usuario', 'error');
        }
    }
    
    async notifyVipExpiring(telegramId) {
        this.showNotification(`Notificación enviada al usuario ${telegramId} sobre su VIP próximo a expirar.`, 'success');
    }
    
    setupRealtimeSubscription() {
        console.log('📡 [APP] Configurando suscripción en tiempo real MEJORADA');
        
        const subscription = supabase
            .channel('public:signals')
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'signals' 
                }, 
                (payload) => {
                    console.log('🆕 [REALTIME] Nueva señal detectada:', payload.new);
                    this.handleNewSignal(payload.new);
                }
            )
            .on('postgres_changes', 
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'signals' 
                }, 
                (payload) => {
                    console.log('🔄 [REALTIME] Señal actualizada:', payload.new);
                    this.handleUpdatedSignal(payload.new);
                }
            )
            .subscribe((status) => {
                console.log('📡 [REALTIME] Estado de suscripción:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ [REALTIME] Suscripción a señales ACTIVADA correctamente');
                    this.showNotification('Conexión en tiempo real activada', 'success');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ [REALTIME] Error en la suscripción');
                    this.showNotification('Error en conexión en tiempo real', 'error');
                } else if (status === 'TIMED_OUT') {
                    console.error('❌ [REALTIME] Suscripción timeout');
                    setTimeout(() => {
                        console.log('🔄 [REALTIME] Reintentando suscripción...');
                        this.setupRealtimeSubscription();
                    }, 5000);
                }
            });
            
        return subscription;
    }
    
    // CORRECCIÓN MEJORADA: Manejo de nuevas señales
    handleNewSignal(signalData) {
        console.log('📨 [APP] Procesando nueva señal en tiempo real:', signalData);
        
        const signal = {
            id: signalData.id,
            asset: signalData.asset,
            timeframe: signalData.timeframe,
            direction: signalData.direction,
            timestamp: new Date(signalData.created_at),
            expires: new Date(signalData.expires_at),
            status: signalData.status || 'pending',
            isFree: signalData.is_free || false
        };
        
        // CORRECCIÓN CRÍTICA: Verificar si el usuario puede recibir esta señal
        const canReceiveSignal = this.canUserReceiveSignal(signal);
        
        console.log('📨 [APP] Usuario puede recibir señal:', canReceiveSignal, 'VIP:', this.isVIP, 'Free:', signal.isFree, 'HasReceivedFree:', this.hasReceivedFreeSignal);
        
        if (canReceiveSignal) {
            const signalExists = this.signals.some(s => s.id === signal.id);
            
            if (!signalExists) {
                this.signals.unshift(signal);
                
                // CORRECCIÓN: Agregar a operaciones según tipo de usuario
                if (this.isAdmin || this.isVIP) {
                    // Admin y VIP: todas las señales
                    this.operations.unshift(signal);
                } else if (signal.isFree && !this.hasReceivedFreeSignal) {
                    // Usuario regular: solo primera señal free
                    this.operations.unshift(signal);
                }
                
                console.log('✅ [APP] Señal agregada a la lista:', signal.asset, signal.direction);
                
                this.renderSignals();
                
                this.showNotification(`Nueva señal: ${signal.asset} ${signal.direction === 'up' ? 'ALZA' : 'BAJA'}`, 'success');
                
                if (this.isReady) {
                    console.log('🔔 [APP] Mostrando alerta de señal');
                    this.showAlert(signal);
                }
                
                this.updateStats();
                
                // CORRECCIÓN: Marcar que ya recibió señal gratis si corresponde
                if (signal.isFree && !this.isVIP) {
                    this.hasReceivedFreeSignal = true;
                    this.saveToLocalStorage();
                    console.log('✅ [APP] Usuario regular marcado como que recibió señal free');
                }
                
                console.log('✅ [APP] Señal procesada y mostrada al usuario en tiempo real');
            } else {
                console.log('ℹ️ [APP] Señal ya existe, ignorando duplicado');
            }
        } else {
            console.log('ℹ️ [APP] Señal no disponible para este usuario');
            if (!signal.isFree && !this.isVIP) {
                this.showNotification('Señal VIP enviada (solo para usuarios VIP)', 'info');
            }
        }
    }
    
    // MÉTODO: Verificar si usuario puede recibir señal
    canUserReceiveSignal(signal) {
        if (this.isAdmin || this.isVIP) {
            return true; // Admin y VIP reciben todas las señales
        }
        
        // Usuarios regulares: solo primera señal gratis por sesión
        if (signal.isFree && !this.hasReceivedFreeSignal) {
            return true;
        }
        
        return false;
    }
    
    handleUpdatedSignal(signalData) {
        console.log('🔄 [APP] Actualizando señal existente en tiempo real:', signalData.id);
        
        const signalIndex = this.signals.findIndex(s => s.id === signalData.id);
        const operationIndex = this.operations.findIndex(o => o.id === signalData.id);
        
        if (signalIndex !== -1) {
            this.signals[signalIndex].status = signalData.status;
            console.log('✅ [APP] Señal actualizada en lista principal');
        }
        
        if (operationIndex !== -1) {
            this.operations[operationIndex].status = signalData.status;
            console.log('✅ [APP] Señal actualizada en operaciones');
        }
        
        this.renderSignals();
        this.updateStats();
        
        console.log('✅ [APP] Señal actualizada correctamente en tiempo real');
    }
    
    showVipModal() {
        if (this.vipModal) {
            this.vipModal.classList.add('active');
        }
    }
    
    hideVipModal() {
        if (this.vipModal) {
            this.vipModal.classList.remove('active');
        }
    }
    
    showAdminPanel() {
        const adminPanel = document.getElementById('adminPanel');
        if (adminPanel) {
            adminPanel.style.display = adminPanel.style.display === 'none' ? 'block' : 'none';
        }
    }
    
    updateUserStatus() {
        if (!this.userStatus) return;
        
        if (this.isVIP) {
            this.userStatus.innerHTML = `
                <div class="session-info" style="border-color: var(--vip);">
                    <i class="fas fa-crown"></i> Estado: <span class="vip-badge">USUARIO VIP</span> - Recibiendo todas las señales
                </div>
            `;
        } else if (this.isAdmin) {
            this.userStatus.innerHTML = `
                <div class="session-info" style="border-color: var(--primary);">
                    <i class="fas fa-user-shield"></i> Estado: <span style="color: var(--primary); font-weight: bold;">ADMINISTRADOR</span> - Acceso completo al sistema
                </div>
            `;
        } else {
            this.userStatus.innerHTML = `
                <div class="session-info">
                    <i class="fas fa-user"></i> Estado: Usuario Regular - Solo primera señal gratuita por sesión
                </div>
            `;
        }
    }
    
    async startTradingSession() {
        try {
            const response = await fetch(`${SERVER_URL}/api/sessions/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.currentUserId
                })
            });
            
            if (response.ok) {
                // CORRECCIÓN: Resetear estado de señal gratis al iniciar sesión
                this.hasReceivedFreeSignal = false;
                
                this.currentSession = {
                    id: Date.now(),
                    startTime: new Date(),
                    endTime: null,
                    signals: []
                };
                
                this.saveToLocalStorage();
                
                if (this.startSession) this.startSession.disabled = true;
                if (this.endSession) this.endSession.disabled = false;
                
                if (this.sessionInfo) {
                    this.sessionInfo.innerHTML = `
                        <i class="fas fa-play-circle"></i> Sesión activa - Iniciada: ${this.currentSession.startTime.toLocaleTimeString()}
                    `;
                    this.sessionInfo.classList.add('session-active');
                }
                
                this.showNotification('Sesión de trading iniciada', 'success');
                
                // ENVIAR INICIO DE SESIÓN AL BOT
                const startMessage = `🚀 *SESIÓN INICIADA* 🚀\n\n¡La sesión de trading ha comenzado! Prepárate para las señales. ⚡\n\n🎁 *Recuerda:* La primera señal es GRATIS`;
                await this.sendTelegramNotification(startMessage, 'session_start');
                
                this.showSessionAlert('Sesión Iniciada', 'La sesión de trading ha comenzado. ¡Buena suerte!');
                
            } else {
                throw new Error('Error iniciando sesión');
            }
        } catch (error) {
            console.error('Error iniciando sesión:', error);
            this.showNotification('Error al iniciar sesión', 'error');
        }
    }
    
    async endTradingSession() {
        if (!this.currentSession) return;
        
        try {
            const response = await fetch(`${SERVER_URL}/api/sessions/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.currentUserId
                })
            });
            
            if (response.ok) {
                this.currentSession.endTime = new Date();
                this.sessions.push(this.currentSession);
                
                if (this.startSession) this.startSession.disabled = false;
                if (this.endSession) this.endSession.disabled = true;
                
                if (this.sessionInfo) {
                    this.sessionInfo.innerHTML = `
                        <i class="fas fa-stop-circle"></i> Sesión finalizada - Duración: ${this.getSessionDuration(this.currentSession)}
                    `;
                    this.sessionInfo.classList.remove('session-active');
                }
                
                this.currentSession = null;
                
                this.saveToLocalStorage();
                this.updateStats();
                
                this.showNotification('Sesión de trading finalizada', 'info');
                
                // ENVIAR FIN DE SESIÓN AL BOT
                const endMessage = `🏁 *SESIÓN FINALIZADA* 🏁\n\nLa sesión de trading ha terminado. ¡Gracias por participar!\n\n📅 *Próxima Sesión:*\n🕙 10:00 AM | 10:00 PM`;
                await this.sendTelegramNotification(endMessage, 'session_end');
                
                this.showSessionAlert('Sesión Finalizada', 'La sesión de trading ha terminado. ¡Gracias por participar!');
                
            } else {
                throw new Error('Error finalizando sesión');
            }
        } catch (error) {
            console.error('Error finalizando sesión:', error);
            this.showNotification('Error al finalizar sesión', 'error');
        }
    }
    
    getSessionDuration(session) {
        const endTime = session.endTime || new Date();
        const duration = endTime - session.startTime;
        const minutes = Math.floor(duration / 60000);
        const seconds = ((duration % 60000) / 1000).toFixed(0);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    
    async sendClientNotification() {
        try {
            const response = await fetch(`${SERVER_URL}/api/notify`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.currentUserId
                })
            });
            
            if (response.ok) {
                this.showNotification('Notificación enviada a los clientes', 'success');
                
                // ENVIAR ALERTA DE 10 MINUTOS AL BOT
                const alertMessage = `⏰ *ALERTA DE SESIÓN* ⏰\n\nLa sesión de trading comenzará en 10 minutos. ¡Prepárate! 🚀\n\n📅 Próximas señales en: 10:00 AM\n🎁 Primera señal GRATIS`;
                await this.sendTelegramNotification(alertMessage, '10_minutes');
                
                this.showSessionAlert('Sesión en 10 Minutos', 'La sesión de trading comenzará en 10 minutos. ¡Prepárate!');
                
            } else {
                throw new Error('Error enviando notificación');
            }
        } catch (error) {
            console.error('Error enviando notificación:', error);
            this.showNotification('Error al enviar notificación', 'error');
        }
    }
    
    showSessionAlert(title, message) {
        const alert = document.createElement('div');
        alert.className = 'signal-alert session-alert';
        alert.innerHTML = `
            <div class="asset" style="color: var(--warning);">${title}</div>
            <div class="direction" style="background: rgba(255, 204, 0, 0.15); color: var(--warning); border: 1px solid var(--warning);">
                <i class="fas fa-exclamation-triangle"></i>
                <span>AVISO IMPORTANTE</span>
            </div>
            <div class="time-remaining" style="background: rgba(255, 204, 0, 0.1); color: var(--warning);">
                ${message}
            </div>
            <button onclick="this.parentElement.remove()" style="margin-top: 20px; background: var(--warning); color: var(--dark);">ENTENDIDO</button>
        `;
        
        document.body.appendChild(alert);
        setTimeout(() => alert.classList.add('show'), 10);
    }
    
    showClientAlert() {
        const alert = document.createElement('div');
        alert.className = 'signal-alert';
        alert.innerHTML = `
            <div class="asset" style="color: var(--warning);">ATENCIÓN</div>
            <div class="direction" style="background: rgba(255, 204, 0, 0.15); color: var(--warning); border: 1px solid var(--warning);">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Sesión en 10 minutos</span>
            </div>
            <div class="time-remaining" style="background: rgba(255, 204, 0, 0.1); color: var(--warning);">
                La sesión de trading comenzará en 10 minutos. Prepárate!
            </div>
            <button id="closeClientAlert" style="margin-top: 20px; background: var(--warning); color: var(--dark);">ENTENDIDO</button>
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.classList.add('show');
        }, 10);
        
        const closeBtn = alert.querySelector('#closeClientAlert');
        closeBtn.addEventListener('click', () => {
            alert.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(alert);
            }, 300);
        });
    }
    
    toggleReady() {
        this.isReady = !this.isReady;
        if (this.isReady) {
            if (this.readyBtn) {
                this.readyBtn.innerHTML = '<i class="fas fa-check"></i> LISTOS';
                this.readyBtn.classList.add('ready');
            }
            this.showNotification('Estado cambiado a LISTOS - Recibirás alertas de señales', 'success');
        } else {
            if (this.readyBtn) {
                this.readyBtn.innerHTML = '<i class="fas fa-bell"></i> PREPARADOS';
                this.readyBtn.classList.remove('ready');
            }
            this.showNotification('Estado cambiado a PREPARADOS', 'info');
        }
    }
    
    async sendSignal() {
        const asset = document.getElementById('asset');
        const timeframe = document.getElementById('timeframe');
        const direction = document.getElementById('direction');
        
        if (!asset || !timeframe || !direction) return;
        
        const assetValue = asset.value;
        const timeframeValue = timeframe.value;
        const directionValue = direction.value;
        
        if(!assetValue) {
            alert('Por favor, ingresa un activo');
            return;
        }
        
        try {
            console.log('📤 [APP] Enviando señal:', assetValue, directionValue, timeframeValue);
            
            const response = await fetch(`${SERVER_URL}/api/signals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    asset: assetValue.toUpperCase(),
                    timeframe: parseInt(timeframeValue),
                    direction: directionValue,
                    userId: this.currentUserId
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                asset.value = '';
                
                this.showNotification('Señal enviada correctamente', 'success');
                
                console.log('✅ [APP] Señal enviada correctamente:', result);
            } else {
                throw new Error('Error enviando señal');
            }
        } catch (error) {
            console.error('❌ [APP] Error enviando señal:', error);
            alert('Error al enviar la señal. Por favor, inténtalo de nuevo.');
        }
    }
    
    async updateOperationStatus(operationId, status) {
        try {
            console.log(`🔄 [APP] Actualizando operación ${operationId} a ${status}`);
            
            const response = await fetch(`${SERVER_URL}/api/signals/${operationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: status,
                    userId: this.currentUserId
                })
            });
            
            if (response.ok) {
                this.showNotification(`Operación marcada como: ${status.toUpperCase()}`, 'success');
                
                // Actualizar también en Supabase para sincronización en tiempo real
                const { data, error } = await supabase
                    .from('signals')
                    .update({ status: status })
                    .eq('id', operationId);
                
                if (error) {
                    console.error('❌ [APP] Error actualizando en Supabase:', error);
                }
                
                // Actualizar localmente
                const signalIndex = this.signals.findIndex(s => s.id == operationId);
                const operationIndex = this.operations.findIndex(o => o.id == operationId);
                
                if (signalIndex !== -1) {
                    this.signals[signalIndex].status = status;
                }
                
                if (operationIndex !== -1) {
                    this.operations[operationIndex].status = status;
                }
                
                this.renderSignals();
                this.updateStats();
                
                console.log(`✅ [APP] Operación ${operationId} actualizada a ${status}`);
            } else {
                throw new Error('Error actualizando estado');
            }
        } catch (error) {
            console.error('Error actualizando estado:', error);
            this.showNotification('Error al actualizar el estado', 'error');
        }
    }

    renderSignals() {
        if (!this.signalsContainer) return;
        
        // CORRECCIÓN: Filtrar señales para mostrar solo las que corresponden al usuario
        let signalsToShow = [];
        
        if (this.isAdmin || this.isVIP) {
            // Admin y VIP ven todas las señales
            signalsToShow = this.signals;
        } else {
            // Usuarios regulares: solo señales free
            signalsToShow = this.signals.filter(signal => signal.isFree);
            
            // Si ya recibió señal free, mostrar solo esa
            if (this.hasReceivedFreeSignal && signalsToShow.length > 0) {
                signalsToShow = [signalsToShow[0]]; // Solo la primera señal free
            }
        }
        
        if(signalsToShow.length === 0) {
            this.signalsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-satellite-dish"></i>
                    <p>Esperando señales de trading...</p>
                    <p>Las señales aparecerán aquí automáticamente</p>
                    ${!this.isVIP && this.hasReceivedFreeSignal ? '<p class="vip-prompt">💎 Actualiza a VIP para recibir todas las señales</p>' : ''}
                </div>
            `;
            return;
        }
        
        this.signalsContainer.innerHTML = signalsToShow.map(signal => {
            const expiresDate = new Date(signal.expires);
            const now = new Date();
            const timeRemaining = Math.max(0, Math.floor((expiresDate - now) / 1000));
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            const isExpired = timeRemaining <= 0;
            
            // ACTUALIZACIÓN CRÍTICA: Si la señal está expirada y sigue como pending, actualizar estado
            if (isExpired && signal.status === 'pending') {
                signal.status = 'expired';
                // Si es admin, actualizar también en el servidor
                if (this.isAdmin) {
                    this.updateSignalToExpired(signal.id);
                }
            }
            
            let statusClass = 'status-pending';
            let statusText = 'PENDIENTE';
            let statusIcon = '<i class="fas fa-clock"></i>';
            let resultBadge = '';
            
            if (signal.status === 'profit') {
                statusClass = 'status-profit';
                statusText = 'GANADA';
                statusIcon = '<i class="fas fa-check-circle"></i>';
                resultBadge = '<div class="operation-result result-profit">PROFIT</div>';
            } else if (signal.status === 'loss') {
                statusClass = 'status-loss';
                statusText = 'PERDIDA';
                statusIcon = '<i class="fas fa-times-circle"></i>';
                resultBadge = '<div class="operation-result result-loss">LOSS</div>';
            } else if (signal.status === 'expired') {
                statusClass = 'status-expired';
                statusText = 'EXPIRADA';
                statusIcon = '<i class="fas fa-hourglass-end"></i>';
            }
            
            // MOSTRAR BOTONES DE ADMIN SOLO PARA SEÑALES EXPIRADAS
            const showAdminButtons = this.isAdmin && signal.status === 'expired';
            
            return `
                <div class="signal-card" data-signal-id="${signal.id}">
                    ${resultBadge}
                    <div class="signal-header">
                        <div class="asset">${signal.asset} ${signal.isFree ? '<span class="free-badge">GRATIS</span>' : '<span class="vip-badge">VIP</span>'}</div>
                        <div class="direction ${signal.direction}">
                            <span class="arrow ${signal.direction}">${signal.direction === 'up' ? '↑' : '↓'}</span>
                            <span>${signal.direction === 'up' ? 'ALZA' : 'BAJA'}</span>
                        </div>
                    </div>
                    <div class="signal-details">
                        <div class="detail-item">
                            <span class="detail-label">Duración</span>
                            <span class="detail-value">${signal.timeframe} minuto${signal.timeframe > 1 ? 's' : ''}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Expira</span>
                            <span class="detail-value">${expiresDate.toLocaleTimeString()}</span>
                        </div>
                    </div>
                    ${!isExpired && signal.status === 'pending' ? `
                        <div class="time-remaining" id="time-${signal.id}">
                            <i class="fas fa-clock"></i> Tiempo restante: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}
                        </div>
                    ` : ''}
                    <div class="signal-status">
                        <div class="status-badge ${statusClass}">
                            ${statusIcon} ${statusText}
                        </div>
                        ${showAdminButtons ? `
                            <div class="admin-controls">
                                <button class="admin-btn btn-profit" onclick="signalManager.updateOperationStatus('${signal.id}', 'profit')">
                                    <i class="fas fa-check"></i> Ganada
                                </button>
                                <button class="admin-btn btn-loss" onclick="signalManager.updateOperationStatus('${signal.id}', 'loss')">
                                    <i class="fas fa-times"></i> Perdida
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        this.startTimeUpdates();
    }

    // Método para actualizar señales a expiradas
    async updateSignalToExpired(signalId) {
        try {
            console.log(`🔄 [APP] Actualizando señal ${signalId} a expirada en servidor`);
            
            const response = await fetch(`${SERVER_URL}/api/signals/${signalId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: 'expired',
                    userId: this.currentUserId
                })
            });
            
            if (response.ok) {
                console.log(`✅ [APP] Señal ${signalId} actualizada a expirada en servidor`);
                
                // Actualizar también en tiempo real para otros clientes
                const { data, error } = await supabase
                    .from('signals')
                    .update({ status: 'expired' })
                    .eq('id', signalId);
                    
                if (error) {
                    console.error('❌ [APP] Error actualizando en Supabase:', error);
                }
            } else {
                console.error('❌ [APP] Error en respuesta del servidor:', response.status);
            }
        } catch (error) {
            console.error('❌ [APP] Error actualizando señal a expirada:', error);
        }
    }
    
    startTimeUpdates() {
        setInterval(() => {
            this.signals.forEach(signal => {
                if (signal.status === 'pending') {
                    const expiresDate = new Date(signal.expires);
                    const now = new Date();
                    const timeRemaining = Math.max(0, Math.floor((expiresDate - now) / 1000));
                    const minutes = Math.floor(timeRemaining / 60);
                    const seconds = timeRemaining % 60;
                    
                    const timeElement = document.getElementById(`time-${signal.id}`);
                    if (timeElement) {
                        if (timeRemaining > 0) {
                            timeElement.innerHTML = `<i class="fas fa-clock"></i> Tiempo restante: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                        } else {
                            // Cuando expira, actualizar el estado
                            signal.status = 'expired';
                            if (this.isAdmin) {
                                this.updateSignalToExpired(signal.id);
                            }
                            this.renderSignals();
                        }
                    }
                }
            });
        }, 1000);
    }
    
    showNotification(message, type = 'info') {
        if (!this.notification) return;
        
        this.notification.textContent = message;
        
        if (type === 'success') {
            this.notification.style.background = 'var(--profit)';
        } else if (type === 'error') {
            this.notification.style.background = 'var(--loss)';
        } else if (type === 'vip') {
            this.notification.style.background = 'var(--vip)';
        } else {
            this.notification.style.background = 'var(--primary)';
        }
        
        this.notification.classList.add('show');
        setTimeout(() => {
            this.notification.classList.remove('show');
        }, 3000);
    }
    
    showAlert(signal) {
        if (!this.signalAlert) return;
        
        const alertAsset = document.getElementById('alertAsset');
        const alertDirection = document.getElementById('alertDirection');
        const alertTime = document.getElementById('alertTime');
        
        if (alertAsset) alertAsset.textContent = signal.asset;
        
        if (alertDirection) {
            alertDirection.className = `direction ${signal.direction}`;
            alertDirection.innerHTML = `
                <span class="arrow ${signal.direction}">${signal.direction === 'up' ? '↑' : '↓'}</span>
                <span>${signal.direction === 'up' ? 'ALZA (CALL)' : 'BAJA (PUT)'}</span>
            `;
        }
        
        if (alertTime) {
            const expiresDate = new Date(signal.expires);
            const timeRemaining = Math.max(0, Math.floor((expiresDate - new Date()) / 1000));
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            
            alertTime.innerHTML = `
                <div style="margin-bottom: 8px; font-size: 1.1rem;">
                    <i class="fas fa-clock"></i> Duración: ${signal.timeframe} minuto${signal.timeframe > 1 ? 's' : ''}
                </div>
                <div style="font-size: 1.3rem; font-weight: bold; color: var(--primary);">
                    Expira en: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}
                </div>
            `;
        }
        
        this.signalAlert.style.transition = 'transform 0.2s ease';
        this.signalAlert.classList.add('show');
        
        const alertInterval = setInterval(() => {
            if (this.signalAlert.classList.contains('show')) {
                const expiresDate = new Date(signal.expires);
                const timeRemaining = Math.max(0, Math.floor((expiresDate - new Date()) / 1000));
                const minutes = Math.floor(timeRemaining / 60);
                const seconds = timeRemaining % 60;
                
                if (alertTime) {
                    alertTime.innerHTML = `
                        <div style="margin-bottom: 8px; font-size: 1.1rem;">
                            <i class="fas fa-clock"></i> Duración: ${signal.timeframe} minuto${signal.timeframe > 1 ? 's' : ''}
                        </div>
                        <div style="font-size: 1.3rem; font-weight: bold; color: var(--primary);">
                            Expira en: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}
                        </div>
                    `;
                }
                
                if (timeRemaining <= 0) {
                    clearInterval(alertInterval);
                }
            } else {
                clearInterval(alertInterval);
            }
        }, 1000);
    }
    
    hideAlert() {
        if (this.signalAlert) {
            this.signalAlert.classList.remove('show');
        }
    }
    
    // MÉTODOS ACTUALIZADOS PARA CAMBIAR VISTAS
    showSignalsView() {
        this.showView('signals');
    }
    
    showStatsView() {
        this.showView('stats');
    }
    
    showUsersView() {
        this.showView('users');
    }
    
    showUserManagementView() {
        this.showView('userManagement');
    }
    
    // CORRECCIÓN MEJORADA: Función de estadísticas
    updateStats(period = 'day') {
        const now = new Date();
        let filteredOperations = [];
        
        if (period === 'day') {
            // Solo operaciones de hoy
            filteredOperations = this.operations.filter(op => {
                const opDate = new Date(op.timestamp);
                return opDate.toDateString() === now.toDateString();
            });
        } else if (period === 'week') {
            // Operaciones de los últimos 7 días
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - 7);
            startOfWeek.setHours(0, 0, 0, 0);
            
            filteredOperations = this.operations.filter(op => {
                const opDate = new Date(op.timestamp);
                return opDate >= startOfWeek;
            });
        } else if (period === 'month') {
            // Operaciones de los últimos 30 días
            const startOfMonth = new Date(now);
            startOfMonth.setDate(now.getDate() - 30);
            startOfMonth.setHours(0, 0, 0, 0);
            
            filteredOperations = this.operations.filter(op => {
                const opDate = new Date(op.timestamp);
                return opDate >= startOfMonth;
            });
        }
        
        console.log(`📊 [STATS] Periodo: ${period}, Operaciones filtradas: ${filteredOperations.length}`);
        
        const winOperations = filteredOperations.filter(op => op.status === 'profit');
        const lossOperations = filteredOperations.filter(op => op.status === 'loss');
        const totalOperations = filteredOperations.length;
        
        const winCount = winOperations.length;
        const lossCount = lossOperations.length;
        
        if (this.winCount) this.winCount.textContent = winCount;
        if (this.lossCount) this.lossCount.textContent = lossCount;
        if (this.totalCount) this.totalCount.textContent = totalOperations;
        
        if (this.operationsTable) {
            if (filteredOperations.length === 0) {
                this.operationsTable.innerHTML = `
                    <tr>
                        <td colspan="5" class="no-operations">
                            <i class="fas fa-inbox"></i>
                            <p>No hay operaciones en este período</p>
                        </td>
                    </tr>
                `;
            } else {
                this.operationsTable.innerHTML = filteredOperations.map(op => {
                    let statusClass = 'status-pending';
                    let statusText = 'PENDIENTE';
                    let statusIcon = '<i class="fas fa-clock"></i>';
                    
                    if (op.status === 'profit') {
                        statusClass = 'status-profit';
                        statusText = 'GANADA';
                        statusIcon = '<i class="fas fa-check-circle"></i>';
                    } else if (op.status === 'loss') {
                        statusClass = 'status-loss';
                        statusText = 'PERDIDA';
                        statusIcon = '<i class="fas fa-times-circle"></i>';
                    }
                    
                    return `
                        <tr>
                            <td>${op.asset}</td>
                            <td>
                                <span class="direction ${op.direction}">
                                    ${op.direction === 'up' ? 'ALZA' : 'BAJA'}
                                </span>
                            </td>
                            <td>${op.timeframe} min</td>
                            <td><span class="status-badge ${statusClass}">${statusIcon} ${statusText}</span></td>
                            <td>${new Date(op.timestamp).toLocaleString()}</td>
                        </tr>
                    `;
                }).join('');
            }
        }
        
        this.updateChart(winCount, lossCount, totalOperations);
    }
    
    initChart() {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;
        
        this.performanceChart = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Ganadas', 'Perdidas', 'Pendientes'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        'rgba(0, 255, 157, 0.8)',
                        'rgba(255, 0, 51, 0.8)',
                        'rgba(255, 204, 0, 0.8)'
                    ],
                    borderColor: [
                        'rgba(0, 255, 157, 1)',
                        'rgba(255, 0, 51, 1)',
                        'rgba(255, 204, 0, 1)'
                    ],
                    borderWidth: 2,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'white',
                            font: {
                                size: 12
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: 'Distribución de Operaciones',
                        color: 'white',
                        font: {
                            size: 16
                        }
                    }
                }
            }
        });
    }
    
    updateChart(winCount, lossCount, totalCount) {
        if (!this.performanceChart) return;
        
        const pendingCount = totalCount - winCount - lossCount;
        
        this.performanceChart.data.datasets[0].data = [winCount, lossCount, pendingCount];
        this.performanceChart.update();
    }
    
    saveToLocalStorage() {
        const data = {
            sessions: this.sessions,
            currentSession: this.currentSession,
            isVIP: this.isVIP,
            hasReceivedFreeSignal: this.hasReceivedFreeSignal,
            operations: this.operations // GUARDAR OPERACIONES DEL USUARIO
        };
        localStorage.setItem('quantumTraderData', JSON.stringify(data));
    }
    
    loadFromLocalStorage() {
        const data = JSON.parse(localStorage.getItem('quantumTraderData'));
        if (data) {
            this.sessions = data.sessions || [];
            this.currentSession = data.currentSession || null;
            this.isVIP = data.isVIP !== undefined ? data.isVIP : false;
            this.hasReceivedFreeSignal = data.hasReceivedFreeSignal || false;
            this.operations = data.operations || []; // CARGAR OPERACIONES DEL USUARIO
            
            if (this.currentSession) {
                this.currentSession.startTime = new Date(this.currentSession.startTime);
                if (this.currentSession.endTime) {
                    this.currentSession.endTime = new Date(this.currentSession.endTime);
                }
            }
            
            if (this.currentSession) {
                if (this.startSession) this.startSession.disabled = true;
                if (this.endSession) this.endSession.disabled = false;
                if (this.sessionInfo) {
                    this.sessionInfo.innerHTML = `
                        <i class="fas fa-play-circle"></i> Sesión activa - Iniciada: ${this.currentSession.startTime.toLocaleTimeString()}
                    `;
                    this.sessionInfo.classList.add('session-active');
                }
            }
            
            this.updateUserStatus();
        }
    }
}

// =============================================
// INICIALIZACIÓN DE LA APLICACIÓN
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 [APP] DOM cargado - Iniciando aplicación');
    
    const userIdDisplay = document.getElementById('userIdDisplay');
    if (userIdDisplay) {
        userIdDisplay.innerHTML = `<i class="fas fa-user"></i> ID: ${detectedUserId}`;
    }
    
    createParticles();
    
    // Inicializar términos y condiciones
    initializeTermsAndConditions();
    
    try {
        signalManager = new SignalManager();
    } catch (error) {
        console.error('❌ [APP] Error inicializando SignalManager:', error);
    }
});

// =============================================
// DETECCIÓN INMEDIATA DE USER ID
// =============================================

const detectedUserId = getUserIdSuperRobust();
console.log('🚀 [APP] User ID detectado al inicio:', detectedUserId);

if (detectedUserId && !detectedUserId.startsWith('guest_')) {
    localStorage.setItem('tg_user_id', detectedUserId);
    console.log('💾 [APP] User ID guardado en localStorage');
}

console.log('=== 🔍 VERIFICACIÓN DE ADMIN INICIADA ===');
console.log('User ID detectado:', detectedUserId);
console.log('ADMIN_ID configurado:', ADMIN_ID);
console.log('¿Coinciden?:', String(detectedUserId).trim() === String(ADMIN_ID).trim());
