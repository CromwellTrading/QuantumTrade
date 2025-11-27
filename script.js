// =============================================
// CONFIGURACIÓN GLOBAL MEJORADA
// =============================================

const SUPABASE_URL = 'https://flodrkrvaqsmelbkfknv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsb2Rya3J2YXFzbWVsYmtma252Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwODY0NjgsImV4cCI6MjA3OTY2MjQ2OH0.zVTaUbkiLCJ0dUFs808TZErgnIXCYsYQ2lw-CEmVCFI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const SERVER_URL = window.location.origin;
const ADMIN_ID = "5376388604";

let signalManager = null;

// =============================================
// FUNCIÓN DE DETECCIÓN MEJORADA
// =============================================

function getUserIdSuperRobust() {
    console.log('🔍 [USER_ID] Iniciando detección de User ID');
    updateDebugInfo('🔍 Iniciando detección de User ID', 'info');
    
    // MÉTODO 1: Parámetro tgid en URL (PRIMERA PRIORIDAD)
    const urlParams = new URLSearchParams(window.location.search);
    const tgId = urlParams.get('tgid');
    if (tgId) {
        console.log('🎯 [USER_ID] ID obtenido desde tgid URL:', tgId);
        updateDebugInfo('✅ ID detectado desde URL: ' + tgId, 'success');
        return tgId;
    }
    
    // MÉTODO 2: Telegram WebApp SDK
    if (window.Telegram && window.Telegram.WebApp) {
        console.log('🔧 [TELEGRAM] Telegram Web App SDK detectado');
        updateDebugInfo('🔧 Telegram Web App SDK detectado', 'info');
        const tg = window.Telegram.WebApp;
        tg.expand();
        
        const user = tg.initDataUnsafe?.user;
        if (user && user.id) {
            console.log('🎯 [USER_ID] ID obtenido desde SDK:', user.id);
            updateDebugInfo('✅ ID detectado desde SDK: ' + user.id, 'success');
            return user.id.toString();
        }
    }
    
    // MÉTODO 3: Fragmento URL (tgWebAppData)
    try {
        const fragment = window.location.hash.substring(1);
        if (fragment) {
            updateDebugInfo('🔍 Fragmento de URL detectado', 'info');
            const fragmentParams = new URLSearchParams(fragment);
            const tgWebAppData = fragmentParams.get('tgWebAppData');
            
            if (tgWebAppData) {
                console.log('🔍 [TELEGRAM] Procesando tgWebAppData del fragmento');
                updateDebugInfo('🔍 Procesando tgWebAppData del fragmento', 'info');
                const decodedWebAppData = decodeURIComponent(tgWebAppData);
                const webAppParams = new URLSearchParams(decodedWebAppData);
                const userString = webAppParams.get('user');
                
                if (userString) {
                    const userData = JSON.parse(decodeURIComponent(userString));
                    if (userData && userData.id) {
                        console.log('🎯 [USER_ID] ID obtenido desde fragmento:', userData.id);
                        updateDebugInfo('✅ ID detectado desde fragmento: ' + userData.id, 'success');
                        return userData.id.toString();
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ [TELEGRAM] Error parseando fragmento:', error);
        updateDebugInfo('❌ Error parseando fragmento: ' + error.message, 'error');
    }
    
    // MÉTODO 4: localStorage
    const storedId = localStorage.getItem('tg_user_id');
    if (storedId) {
        console.log('🎯 [USER_ID] ID obtenido desde localStorage:', storedId);
        updateDebugInfo('✅ ID obtenido desde localStorage: ' + storedId, 'success');
        return storedId;
    }
    
    // MÉTODO 5: Guest ID (fallback)
    const guestId = 'guest_' + Math.random().toString(36).substr(2, 9);
    console.log('⚠️ [USER_ID] Generando ID de guest:', guestId);
    updateDebugInfo('⚠️ Generando ID de guest: ' + guestId, 'warning');
    return guestId;
}

// =============================================
// FUNCIÓN PARA ACTUALIZAR PANEL DEBUG
// =============================================

function updateDebugInfo(message, type = 'info') {
    const debugInfo = document.getElementById('debugInfo');
    
    if (!debugInfo) return;
    
    const timestamp = new Date().toLocaleTimeString();
    const colorClass = 'debug-' + type;
    
    const newEntry = document.createElement('div');
    newEntry.className = colorClass;
    newEntry.innerHTML = `[${timestamp}] ${message}`;
    
    debugInfo.appendChild(newEntry);
    debugInfo.scrollTop = debugInfo.scrollHeight;
}

// =============================================
// INICIALIZACIÓN INMEDIATA MEJORADA
// =============================================

console.log('🚀 [APP] Iniciando aplicación - Mejorada');

// Detectar User ID inmediatamente
const detectedUserId = getUserIdSuperRobust();
console.log('🚀 [APP] User ID detectado al inicio:', detectedUserId);

// Guardar en localStorage inmediatamente si es un ID real
if (detectedUserId && !detectedUserId.startsWith('guest_')) {
    localStorage.setItem('tg_user_id', detectedUserId);
    console.log('💾 [APP] User ID guardado en localStorage');
    updateDebugInfo('💾 User ID guardado en localStorage', 'success');
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
// CLASE SIGNAL MANAGER MEJORADA - COMPLETA
// =============================================

class SignalManager {
    constructor() {
        console.log('🚀 [APP] Inicializando SignalManager con User ID:', detectedUserId);
        updateDebugInfo('🚀 Inicializando SignalManager con User ID: ' + detectedUserId, 'success');
        
        this.signals = [];
        this.operations = [];
        this.sessions = [];
        this.currentSession = null;
        this.isAdmin = false;
        this.isVIP = false;
        this.hasReceivedFreeSignal = false;
        this.serverConnected = false;
        
        // Usar el User ID ya detectado globalmente
        this.currentUserId = detectedUserId;
        this.userData = null;
        this.searchedUser = null;
        
        try {
            // Inicialización inmediata
            this.initializeDOMElements();
            this.initEventListeners();
            this.loadFromLocalStorage();
            this.updateStats();
            this.initChart();
            
            // Cargar datos del usuario
            this.loadUserData();
            this.loadInitialSignals();
            this.setupRealtimeSubscription();
            this.checkServerConnection();
            
            setInterval(() => this.checkServerConnection(), 30000);
            
        } catch (error) {
            console.error('❌ [APP] Error durante la inicialización de SignalManager:', error);
            updateDebugInfo('❌ Error durante la inicialización: ' + error.message, 'error');
        }
    }
    
    async loadUserData() {
        if (!this.currentUserId || this.currentUserId.startsWith('guest_')) {
            console.log('❌ [APP] No hay User ID válido para cargar datos');
            updateDebugInfo('❌ No hay User ID válido para cargar datos', 'error');
            this.updateUserStatus();
            return;
        }
        
        try {
            console.log('🔍 [APP] Cargando datos del usuario desde servidor:', this.currentUserId);
            updateDebugInfo('🔍 Cargando datos del usuario desde servidor: ' + this.currentUserId, 'info');
            
            const apiUrl = `${SERVER_URL}/api/user/${this.currentUserId}`;
            
            const response = await fetch(apiUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.userData = result.data;
                
                console.log('🔍 [APP] Datos completos del servidor:', result.data);
                updateDebugInfo('✅ Datos recibidos del servidor', 'success');
                
                // USAR EXCLUSIVAMENTE LOS DATOS DEL SERVIDOR
                this.isAdmin = Boolean(result.data.is_admin);
                this.isVIP = Boolean(result.data.is_vip);
                
                console.log('✅ [APP] Estados desde servidor - Admin:', this.isAdmin, 'VIP:', this.isVIP);
                updateDebugInfo('✅ Estados desde servidor - Admin: ' + this.isAdmin + ', VIP: ' + this.isVIP, 'success');
                
            } else {
                console.error('❌ [APP] Error en respuesta del servidor:', result);
                updateDebugInfo('❌ Error en respuesta del servidor', 'error');
            }
        } catch (error) {
            console.error('❌ [APP] Error cargando datos del usuario:', error);
            updateDebugInfo('❌ Error cargando datos del usuario: ' + error.message, 'error');
        } finally {
            this.updateUI();
        }
    }

    async loadInitialSignals() {
        try {
            console.log('📡 [APP] Cargando señales iniciales desde Supabase');
            updateDebugInfo('📡 Cargando señales iniciales desde Supabase', 'info');
            
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
                
                this.operations = [...this.signals];
                this.renderSignals();
                this.updateStats();
                
                console.log('✅ [APP] Señales iniciales cargadas:', this.signals.length);
                updateDebugInfo('✅ ' + this.signals.length + ' señales iniciales cargadas', 'success');
            } else {
                console.log('ℹ️ [APP] No hay señales en la base de datos');
                updateDebugInfo('ℹ️ No hay señales en la base de datos', 'info');
            }
        } catch (error) {
            console.error('❌ [APP] Error cargando señales iniciales:', error);
            updateDebugInfo('❌ Error cargando señales iniciales: ' + error.message, 'error');
        }
    }
    
    updateUI() {
        console.log('🔄 [APP] Actualizando UI con UserID:', this.currentUserId, 'Admin:', this.isAdmin, 'VIP:', this.isVIP);
        updateDebugInfo('🔄 Actualizando UI - Admin: ' + this.isAdmin + ', VIP: ' + this.isVIP, 'info');
        
        // Mostrar el ID del usuario inmediatamente
        const userIdDisplay = document.getElementById('userIdDisplay');
        if (userIdDisplay) {
            userIdDisplay.className = 'user-badge ';
            if (this.isAdmin) {
                userIdDisplay.classList.add('admin');
                userIdDisplay.innerHTML = `<i class="fas fa-user-shield"></i> ID: ${this.currentUserId} (Admin)`;
                updateDebugInfo('✅ Panel de administración ACTIVADO', 'success');
                
                // MOSTRAR PANEL DE ADMIN
                if (this.adminPanel) {
                    this.adminPanel.style.display = 'block';
                    console.log('🎯 Panel de admin mostrado');
                }
            } else if (this.isVIP) {
                userIdDisplay.classList.add('vip');
                userIdDisplay.innerHTML = `<i class="fas fa-crown"></i> ID: ${this.currentUserId} (VIP)`;
                updateDebugInfo('✅ Estado VIP ACTIVO', 'success');
            } else {
                userIdDisplay.classList.add('regular');
                userIdDisplay.innerHTML = `<i class="fas fa-user"></i> ID: ${this.currentUserId}`;
                updateDebugInfo('❌ Usuario Regular', 'info');
            }
        }

        // Actualizar estado del usuario
        this.updateUserStatus();
        
        // Mostrar/ocultar panel de admin
        if (this.isAdmin) {
            if (this.adminBtn) {
                this.adminBtn.style.display = 'block';
                this.adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> Panel Admin';
                this.adminBtn.classList.add('active');
            }
            if (this.showUsers) {
                this.showUsers.style.display = 'block';
            }
            this.loadUsersFromSupabase();
        } else {
            if (this.adminBtn) {
                this.adminBtn.style.display = 'none';
            }
            if (this.showUsers) {
                this.showUsers.style.display = 'none';
            }
            if (this.adminPanel) {
                this.adminPanel.style.display = 'none';
            }
        }
        
        // Actualizar estado VIP
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
        updateDebugInfo('🏗️ Inicializando elementos DOM', 'info');
        
        // Elementos principales
        this.sendSignalBtn = document.getElementById('sendSignal');
        this.signalsContainer = document.getElementById('signalsContainer');
        this.notification = document.getElementById('notification');
        this.signalAlert = document.getElementById('signalAlert');
        this.readyBtn = document.getElementById('readyBtn');
        this.closeAlert = document.getElementById('closeAlert');
        this.showSignals = document.getElementById('showSignals');
        this.showStats = document.getElementById('showStats');
        this.showUsers = document.getElementById('showUsers');
        this.vipAccess = document.getElementById('vipAccess');
        this.adminBtn = document.getElementById('adminBtn');
        this.statsContainer = document.getElementById('statsContainer');
        this.usersContainer = document.getElementById('usersContainer');
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
        
        // Panel de administración
        this.adminPanel = document.getElementById('adminPanel');
        
        // Elementos para gestión de usuarios
        this.userSearchInput = document.getElementById('userSearchInput');
        this.searchUserBtn = document.getElementById('searchUserBtn');
        this.userSearchResult = document.getElementById('userSearchResult');
        this.makeVipBtn = document.getElementById('makeVipBtn');
        this.removeVipBtn = document.getElementById('removeVipBtn');
        this.userActions = document.getElementById('userActions');
        
        // Elementos de formulario de señales
        this.assetInput = document.getElementById('asset');
        this.timeframeSelect = document.getElementById('timeframe');
        this.directionSelect = document.getElementById('direction');
        
        this.isReady = false;
        
        // Estadísticas
        this.winCount = document.getElementById('winCount');
        this.lossCount = document.getElementById('lossCount');
        this.totalCount = document.getElementById('totalCount');
        this.operationsTable = document.getElementById('operationsTable');
        this.performanceChart = null;

        console.log('✅ [APP] Elementos DOM inicializados correctamente');
        updateDebugInfo('✅ Elementos DOM inicializados correctamente', 'success');
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
    
    initEventListeners() {
        console.log('🔧 [APP] Inicializando event listeners');
        
        // Evento para enviar señales
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
                this.showSignalsView();
            });
        }
        
        if (this.showStats) {
            this.showStats.addEventListener('click', () => {
                this.showStatsView();
            });
        }
        
        if (this.showUsers) {
            this.showUsers.addEventListener('click', () => {
                this.showUsersView();
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

        // Event listeners para gestión de usuarios
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
        
        // Filtros de tiempo para estadísticas
        document.querySelectorAll('.time-filter').forEach(filter => {
            filter.addEventListener('click', () => {
                document.querySelectorAll('.time-filter').forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                this.updateStats(filter.dataset.period);
            });
        });

        console.log('✅ [APP] Event listeners inicializados correctamente');
    }

    // =============================================
    // MÉTODOS DE GESTIÓN DE USUARIOS
    // =============================================

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

            // Mostrar botones según el estado VIP
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
                // Recargar la información del usuario
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
                // Recargar la información del usuario
                await this.searchUser();
            } else {
                this.showNotification('Error al quitar VIP: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Error quitando VIP:', error);
            this.showNotification('Error al quitar VIP al usuario', 'error');
        }
    }

    // =============================================
    // MÉTODOS DE GESTIÓN DE SEÑALES
    // =============================================

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
        supabase
            .channel('signals-channel')
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'signals' 
                }, 
                (payload) => {
                    console.log('Nueva señal recibida:', payload);
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
                    console.log('Señal actualizada:', payload);
                    this.handleUpdatedSignal(payload.new);
                }
            )
            .subscribe();
    }
    
    handleNewSignal(signalData) {
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
        
        const canReceiveSignal = this.isVIP || signal.isFree;
        
        if (canReceiveSignal) {
            this.signals.unshift(signal);
            this.operations.unshift(signal);
            this.renderSignals();
            this.showNotification('Nueva señal recibida!', 'success');
            
            if (this.isReady) {
                this.showAlert(signal);
            }
        } else {
            this.showNotification('Señal VIP enviada (solo para usuarios VIP)', 'info');
        }
        
        this.updateStats();
    }
    
    handleUpdatedSignal(signalData) {
        const signalIndex = this.signals.findIndex(s => s.id === signalData.id);
        const operationIndex = this.operations.findIndex(o => o.id === signalData.id);
        
        if (signalIndex !== -1) {
            this.signals[signalIndex].status = signalData.status;
        }
        
        if (operationIndex !== -1) {
            this.operations[operationIndex].status = signalData.status;
        }
        
        this.renderSignals();
        this.updateStats();
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
                this.hasReceivedFreeSignal = false;
                
                this.currentSession = {
                    id: Date.now(),
                    startTime: new Date(),
                    endTime: null,
                    signals: []
                };
                
                if (this.startSession) this.startSession.disabled = true;
                if (this.endSession) this.endSession.disabled = false;
                
                if (this.sessionInfo) {
                    this.sessionInfo.innerHTML = `
                        <i class="fas fa-play-circle"></i> Sesión activa - Iniciada: ${this.currentSession.startTime.toLocaleTimeString()}
                    `;
                    this.sessionInfo.classList.add('session-active');
                }
                
                this.showNotification('Sesión de trading iniciada', 'success');
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
                
                if (this.isReady) {
                    this.showClientAlert();
                }
            } else {
                throw new Error('Error enviando notificación');
            }
        } catch (error) {
            console.error('Error enviando notificación:', error);
            this.showNotification('Error al enviar notificación', 'error');
        }
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
        }, 100);
        
        const closeBtn = alert.querySelector('#closeClientAlert');
        closeBtn.addEventListener('click', () => {
            alert.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(alert);
            }, 500);
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
                this.hasReceivedFreeSignal = true;
                asset.value = '';
                
                this.showNotification('Señal enviada correctamente', 'success');
                
                console.log('Señal enviada:', result);
            } else {
                throw new Error('Error enviando señal');
            }
        } catch (error) {
            console.error('Error enviando señal:', error);
            alert('Error al enviar la señal. Por favor, inténtalo de nuevo.');
        }
    }
    
    async updateOperationStatus(operationId, status) {
        try {
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
                this.showNotification(`Estado cambiado a: ${status}`, 'info');
            } else {
                throw new Error('Error actualizando estado');
            }
        } catch (error) {
            console.error('Error actualizando estado:', error);
            alert('Error al actualizar el estado. Por favor, inténtalo de nuevo.');
        }
    }
    
    renderSignals() {
        if (!this.signalsContainer) return;
        
        if(this.signals.length === 0) {
            this.signalsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-satellite-dish"></i>
                    <p>Esperando señales de trading...</p>
                    <p>Las señales aparecerán aquí automáticamente</p>
                </div>
            `;
            return;
        }
        
        this.signalsContainer.innerHTML = this.signals.map(signal => {
            const expiresDate = new Date(signal.expires);
            const timeRemaining = Math.max(0, Math.floor((expiresDate - new Date()) / 1000));
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            const isExpired = timeRemaining <= 0;
            
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
            } else if (isExpired) {
                statusClass = 'status-pending';
                statusText = 'EXPIRADA';
                statusIcon = '<i class="fas fa-hourglass-end"></i>';
            }
            
            return `
                <div class="signal-card ${isExpired ? '' : 'new'}">
                    ${resultBadge}
                    <div class="signal-header">
                        <div class="asset">${signal.asset} ${signal.isFree ? '<span class="vip-badge">GRATIS</span>' : ''}</div>
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
                    ${!isExpired ? `
                        <div class="time-remaining">
                            <i class="fas fa-clock"></i> Tiempo restante: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}
                        </div>
                    ` : ''}
                    <div class="signal-status">
                        <div class="status-badge ${statusClass}">
                            ${statusIcon} ${statusText}
                        </div>
                        ${this.isAdmin && isExpired && signal.status === 'pending' ? `
                            <div class="admin-controls">
                                <button class="admin-btn btn-profit" onclick="signalManager.updateOperationStatus(${signal.id}, 'profit')">
                                    <i class="fas fa-check"></i> Ganada
                                </button>
                                <button class="admin-btn btn-loss" onclick="signalManager.updateOperationStatus(${signal.id}, 'loss')">
                                    <i class="fas fa-times"></i> Perdida
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        setTimeout(() => {
            const newCards = document.querySelectorAll('.signal-card.new');
            newCards.forEach(card => {
                card.classList.remove('new');
            });
        }, 1500);
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
            alertTime.textContent = `Expira en: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }
        
        this.signalAlert.classList.add('show');
    }
    
    hideAlert() {
        if (this.signalAlert) {
            this.signalAlert.classList.remove('show');
        }
    }
    
    showSignalsView() {
        const signalsPanel = document.getElementById('signalsPanel');
        const statsContainer = document.getElementById('statsContainer');
        const usersContainer = document.getElementById('usersContainer');
        
        if (signalsPanel) signalsPanel.classList.add('active');
        if (statsContainer) statsContainer.classList.remove('active');
        if (usersContainer) usersContainer.classList.remove('active');
        
        if (this.showSignals) this.showSignals.classList.add('active');
        if (this.showStats) this.showStats.classList.remove('active');
        if (this.showUsers) this.showUsers.classList.remove('active');
    }
    
    showStatsView() {
        const signalsPanel = document.getElementById('signalsPanel');
        const statsContainer = document.getElementById('statsContainer');
        const usersContainer = document.getElementById('usersContainer');
        
        if (signalsPanel) signalsPanel.classList.remove('active');
        if (statsContainer) statsContainer.classList.add('active');
        if (usersContainer) usersContainer.classList.remove('active');
        
        if (this.showSignals) this.showSignals.classList.remove('active');
        if (this.showStats) this.showStats.classList.add('active');
        if (this.showUsers) this.showUsers.classList.remove('active');
        this.updateStats();
    }
    
    showUsersView() {
        const signalsPanel = document.getElementById('signalsPanel');
        const statsContainer = document.getElementById('statsContainer');
        const usersContainer = document.getElementById('usersContainer');
        
        if (signalsPanel) signalsPanel.classList.remove('active');
        if (statsContainer) statsContainer.classList.remove('active');
        if (usersContainer) usersContainer.classList.add('active');
        
        if (this.showSignals) this.showSignals.classList.remove('active');
        if (this.showStats) this.showStats.classList.remove('active');
        if (this.showUsers) this.showUsers.classList.add('active');
    }
    
    updateStats(period = 'day') {
        const now = new Date();
        let filteredOperations = [];
        
        if (period === 'day') {
            filteredOperations = this.operations.filter(op => {
                const opDate = new Date(op.timestamp);
                return opDate.toDateString() === now.toDateString();
            });
        } else if (period === 'week') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            
            filteredOperations = this.operations.filter(op => {
                const opDate = new Date(op.timestamp);
                return opDate >= startOfWeek;
            });
        } else if (period === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            filteredOperations = this.operations.filter(op => {
                const opDate = new Date(op.timestamp);
                return opDate >= startOfMonth;
            });
        }
        
        const winOperations = filteredOperations.filter(op => op.status === 'profit');
        const lossOperations = filteredOperations.filter(op => op.status === 'loss');
        const totalOperations = filteredOperations.length;
        
        const winCount = winOperations.length;
        const lossCount = lossOperations.length;
        
        if (this.winCount) this.winCount.textContent = winCount;
        if (this.lossCount) this.lossCount.textContent = lossCount;
        if (this.totalCount) this.totalCount.textContent = totalOperations;
        
        if (this.operationsTable) {
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
            hasReceivedFreeSignal: this.hasReceivedFreeSignal
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
    updateDebugInfo('🚀 DOM cargado - Iniciando aplicación', 'success');
    
    // Activar debug panel temporalmente
    const debugPanel = document.getElementById('debugInfo');
    if (debugPanel) {
        debugPanel.style.display = 'block';
    }
    
    // Actualizar UI inmediatamente con el ID detectado
    const userIdDisplay = document.getElementById('userIdDisplay');
    if (userIdDisplay) {
        userIdDisplay.innerHTML = `<i class="fas fa-user"></i> ID: ${detectedUserId}`;
    }
    
    createParticles();
    
    try {
        // Inicializar SignalManager con el User ID ya detectado
        signalManager = new SignalManager();
    } catch (error) {
        console.error('❌ [APP] Error inicializando SignalManager:', error);
        updateDebugInfo('❌ Error inicializando SignalManager: ' + error.message, 'error');
    }
    
    // Timer para actualizar señales
    setInterval(() => {
        if (signalManager) {
            signalManager.renderSignals();
            
            const alert = document.getElementById('signalAlert');
            if (alert && alert.classList.contains('show')) {
                const activeSignal = signalManager.signals[0];
                if (activeSignal) {
                    const expiresDate = new Date(activeSignal.expires);
                    const timeRemaining = Math.max(0, Math.floor((expiresDate - new Date()) / 1000));
                    const minutes = Math.floor(timeRemaining / 60);
                    const seconds = timeRemaining % 60;
                    const alertTime = document.getElementById('alertTime');
                    if (alertTime) {
                        alertTime.textContent = `Expira en: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                    }
                }
            }
        }
    }, 1000);
});

// =============================================
// VERIFICACIÓN INMEDIATA MEJORADA
// =============================================

console.log('=== 🔍 VERIFICACIÓN DE ADMIN INICIADA ===');
updateDebugInfo('=== 🔍 VERIFICACIÓN DE ADMIN INICIADA ===', 'info');
console.log('User ID detectado:', detectedUserId);
console.log('ADMIN_ID configurado:', ADMIN_ID);
console.log('¿Coinciden?:', String(detectedUserId).trim() === String(ADMIN_ID).trim());

updateDebugInfo('User ID detectado: ' + detectedUserId, 'info');
updateDebugInfo('ADMIN_ID configurado: ' + ADMIN_ID, 'info');
updateDebugInfo('¿Coinciden?: ' + (String(detectedUserId).trim() === String(ADMIN_ID).trim()), 
               String(detectedUserId).trim() === String(ADMIN_ID).trim() ? 'success' : 'error');
