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
// DETECCIÓN INMEDIATA DE USER ID
// =============================================

function getUserIdSuperRobust() {
    const urlParams = new URLSearchParams(window.location.search);
    const tgId = urlParams.get('tgid');
    if (tgId) return tgId;
    
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.expand();
        const user = tg.initDataUnsafe?.user;
        if (user && user.id) return user.id.toString();
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
                    if (userData && userData.id) return userData.id.toString();
                }
            }
        }
    } catch (error) {
        console.error('❌ [TELEGRAM] Error parseando fragmento:', error);
    }
    
    const storedId = localStorage.getItem('tg_user_id');
    if (storedId) return storedId;
    
    return 'guest_' + Math.random().toString(36).substr(2, 9);
}

// =============================================
// SISTEMA DE PARTÍCULAS
// =============================================

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDelay = `${Math.random() * 15}s`;
        particle.style.animationDuration = `${15 + Math.random() * 10}s`;
        particle.style.width = `${2 + Math.random() * 3}px`;
        particle.style.height = particle.style.width;
        
        const colors = ['#00ff9d', '#00e5ff', '#ff00e5'];
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        particlesContainer.appendChild(particle);
    }
}

// =============================================
// CLASE SIGNAL MANAGER - VELOCIDAD MÁXIMA
// =============================================

class SignalManager {
    constructor() {
        console.log('🚀 [APP] Inicializando SignalManager ULTRA-RÁPIDO');
        
        this.signals = [];
        this.operations = [];
        this.isAdmin = String(detectedUserId).trim() === String(ADMIN_ID).trim();
        this.isVIP = this.isAdmin;
        this.isReady = false;
        
        this.currentUserId = detectedUserId;
        
        // Inicialización ULTRA-RÁPIDA
        this.initializeDOMElements();
        this.initEventListeners();
        this.loadUserData();
        this.setupRealtimeSubscription();
        
        console.log('✅ [APP] Sistema inicializado en milisegundos');
    }
    
    async loadUserData() {
        if (this.currentUserId.startsWith('guest_')) return;
        
        try {
            const apiUrl = `${SERVER_URL}/api/user/${this.currentUserId}`;
            const response = await fetch(apiUrl);
            
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.isAdmin = Boolean(result.data.is_admin) || this.isAdmin;
                    this.isVIP = Boolean(result.data.is_vip) || this.isVIP;
                }
            }
        } catch (error) {
            console.log('ℹ️ [APP] Usando verificación local');
        } finally {
            this.updateUI();
        }
    }
    
    initializeDOMElements() {
        // Cache de elementos DOM para acceso ultra-rápido
        this.elements = {
            sendSignalBtn: document.getElementById('sendSignal'),
            signalsContainer: document.getElementById('signalsContainer'),
            notification: document.getElementById('notification'),
            signalAlert: document.getElementById('signalAlert'),
            readyBtn: document.getElementById('readyBtn'),
            closeAlert: document.getElementById('closeAlert'),
            adminPanel: document.getElementById('adminPanel'),
            userIdDisplay: document.getElementById('userIdDisplay'),
            userStatus: document.getElementById('userStatus'),
            assetInput: document.getElementById('asset'),
            timeframeSelect: document.getElementById('timeframe'),
            directionSelect: document.getElementById('direction')
        };
    }
    
    setupRealtimeSubscription() {
        console.log('📡 [APP] Activando suscripción ULTRA-RÁPIDA');
        
        return supabase
            .channel('ultra-fast-signals')
            .on('postgres_changes', 
                { event: 'INSERT', schema: 'public', table: 'signals' }, 
                (payload) => this.handleNewSignalUltraFast(payload.new)
            )
            .on('postgres_changes', 
                { event: 'UPDATE', schema: 'public', table: 'signals' }, 
                (payload) => this.handleUpdatedSignal(payload.new)
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ [APP] Suscripción ACTIVADA - Señales en milisegundos');
                } else if (status === 'CHANNEL_ERROR') {
                    setTimeout(() => this.setupRealtimeSubscription(), 500);
                }
            });
    }
    
    handleNewSignalUltraFast(signalData) {
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
        
        if (canReceiveSignal && !this.signals.some(s => s.id === signal.id)) {
            // AGREGAR Y MOSTRAR EN MILISEGUNDOS
            this.signals.unshift(signal);
            this.renderSignals();
            
            this.showNotification(`🚨 ${signal.asset} ${signal.direction === 'up' ? 'ALZA' : 'BAJA'}`, 'success');
            
            // ALERTA ULTRA-RÁPIDA
            if (this.isReady) {
                this.showAlertUltraFast(signal);
            }
        }
    }
    
    showAlertUltraFast(signal) {
        if (!this.elements.signalAlert) return;
        
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
        
        // ANIMACIÓN MÁS RÁPIDA - ELIMINAR RETRASOS
        this.elements.signalAlert.style.transition = 'transform 0.1s ease';
        this.elements.signalAlert.classList.add('show');
        
        // Actualización continua del tiempo
        const updateTime = () => {
            if (!this.elements.signalAlert.classList.contains('show')) return;
            
            const expiresDate = new Date(signal.expires);
            const timeRemaining = Math.max(0, Math.floor((expiresDate - new Date()) / 1000));
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            
            if (alertTime) {
                alertTime.innerHTML = `
                    <div style="margin-bottom: 5px; font-size: 1rem;">
                        ⏱ ${signal.timeframe} min
                    </div>
                    <div style="font-size: 1.2rem; font-weight: bold; color: var(--primary);">
                        ⏰ ${minutes}:${seconds < 10 ? '0' : ''}${seconds}
                    </div>
                `;
            }
            
            if (timeRemaining > 0) {
                requestAnimationFrame(updateTime);
            }
        };
        
        requestAnimationFrame(updateTime);
    }
    
    renderSignals() {
        if (!this.elements.signalsContainer) return;
        
        if(this.signals.length === 0) {
            this.elements.signalsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-satellite-dish"></i>
                    <p>Esperando señales de trading...</p>
                </div>
            `;
            return;
        }
        
        this.elements.signalsContainer.innerHTML = this.signals.map(signal => {
            const expiresDate = new Date(signal.expires);
            const timeRemaining = Math.max(0, Math.floor((expiresDate - new Date()) / 1000));
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            const isExpired = timeRemaining <= 0;
            
            let statusClass = 'status-pending', statusText = 'PENDIENTE', statusIcon = '<i class="fas fa-clock"></i>';
            
            if (signal.status === 'profit') {
                statusClass = 'status-profit';
                statusText = 'GANADA';
                statusIcon = '<i class="fas fa-check-circle"></i>';
            } else if (signal.status === 'loss') {
                statusClass = 'status-loss';
                statusText = 'PERDIDA';
                statusIcon = '<i class="fas fa-times-circle"></i>';
            } else if (isExpired && signal.status === 'pending') {
                statusText = 'EXPIRADA';
                statusIcon = '<i class="fas fa-hourglass-end"></i>';
            }
            
            const showAdminButtons = this.isAdmin && isExpired && signal.status === 'pending';
            
            return `
                <div class="signal-card">
                    <div class="signal-header">
                        <div class="asset">${signal.asset}</div>
                        <div class="direction ${signal.direction}">
                            <span class="arrow ${signal.direction}">${signal.direction === 'up' ? '↑' : '↓'}</span>
                            <span>${signal.direction === 'up' ? 'ALZA' : 'BAJA'}</span>
                        </div>
                    </div>
                    <div class="signal-details">
                        <div class="detail-item">
                            <span class="detail-label">Duración</span>
                            <span class="detail-value">${signal.timeframe} min</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Expira</span>
                            <span class="detail-value">${expiresDate.toLocaleTimeString()}</span>
                        </div>
                    </div>
                    ${!isExpired ? `
                        <div class="time-remaining">
                            <i class="fas fa-clock"></i> ${minutes}:${seconds < 10 ? '0' : ''}${seconds}
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
    }
    
    async updateOperationStatus(operationId, status) {
        try {
            const response = await fetch(`${SERVER_URL}/api/signals/${operationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, userId: this.currentUserId })
            });
            
            if (response.ok) {
                this.showNotification(`✅ ${status.toUpperCase()}`, 'success');
                
                const signalIndex = this.signals.findIndex(s => s.id == operationId);
                if (signalIndex !== -1) {
                    this.signals[signalIndex].status = status;
                    this.renderSignals();
                }
            }
        } catch (error) {
            this.showNotification('❌ Error actualizando', 'error');
        }
    }
    
    async sendSignal() {
        const asset = this.elements.assetInput?.value;
        const timeframe = this.elements.timeframeSelect?.value;
        const direction = this.elements.directionSelect?.value;
        
        if (!asset) {
            alert('Ingresa un activo');
            return;
        }
        
        try {
            await fetch(`${SERVER_URL}/api/signals`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    asset: asset.toUpperCase(),
                    timeframe: parseInt(timeframe),
                    direction: direction,
                    userId: this.currentUserId
                })
            });
            
            this.elements.assetInput.value = '';
            this.showNotification('✅ Señal enviada', 'success');
            
        } catch (error) {
            alert('Error al enviar señal');
        }
    }
    
    toggleReady() {
        this.isReady = !this.isReady;
        if (this.elements.readyBtn) {
            if (this.isReady) {
                this.elements.readyBtn.innerHTML = '<i class="fas fa-check"></i> LISTOS';
                this.elements.readyBtn.classList.add('ready');
                this.showNotification('🔔 Alertas ACTIVADAS', 'success');
            } else {
                this.elements.readyBtn.innerHTML = '<i class="fas fa-bell"></i> PREPARADOS';
                this.elements.readyBtn.classList.remove('ready');
                this.showNotification('🔕 Alertas DESACTIVADAS', 'info');
            }
        }
    }
    
    async sendClientNotification() {
        try {
            await fetch(`${SERVER_URL}/api/notify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.currentUserId })
            });
            
            this.showNotification('📢 Notificación enviada', 'success');
            this.showSessionAlert('⏰ Sesión en 10 minutos', 'La sesión de trading comenzará en 10 minutos. Prepárate!');
            
        } catch (error) {
            this.showNotification('❌ Error enviando notificación', 'error');
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
    
    async startTradingSession() {
        try {
            await fetch(`${SERVER_URL}/api/sessions/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.currentUserId })
            });
            
            this.showNotification('🚀 Sesión INICIADA', 'success');
            this.showSessionAlert('🎯 Sesión Iniciada', 'La sesión de trading ha comenzado. ¡Buena suerte!');
            
        } catch (error) {
            this.showNotification('❌ Error iniciando sesión', 'error');
        }
    }
    
    async endTradingSession() {
        try {
            await fetch(`${SERVER_URL}/api/sessions/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.currentUserId })
            });
            
            this.showNotification('🛑 Sesión FINALIZADA', 'info');
            this.showSessionAlert('🏁 Sesión Finalizada', 'La sesión de trading ha finalizado. ¡Gracias por participar!');
            
        } catch (error) {
            this.showNotification('❌ Error finalizando sesión', 'error');
        }
    }
    
    showNotification(message, type = 'info') {
        if (!this.elements.notification) return;
        
        this.elements.notification.textContent = message;
        this.elements.notification.style.background = 
            type === 'success' ? 'var(--profit)' : 
            type === 'error' ? 'var(--loss)' : 'var(--primary)';
        
        this.elements.notification.classList.add('show');
        setTimeout(() => this.elements.notification.classList.remove('show'), 3000);
    }
    
    hideAlert() {
        if (this.elements.signalAlert) {
            this.elements.signalAlert.classList.remove('show');
        }
    }
    
    updateUI() {
        if (this.elements.userIdDisplay) {
            this.elements.userIdDisplay.className = 'user-badge ';
            if (this.isAdmin) {
                this.elements.userIdDisplay.classList.add('admin');
                this.elements.userIdDisplay.innerHTML = `<i class="fas fa-user-shield"></i> ID: ${this.currentUserId} (Admin)`;
                if (this.elements.adminPanel) this.elements.adminPanel.style.display = 'block';
            } else if (this.isVIP) {
                this.elements.userIdDisplay.classList.add('vip');
                this.elements.userIdDisplay.innerHTML = `<i class="fas fa-crown"></i> ID: ${this.currentUserId} (VIP)`;
            } else {
                this.elements.userIdDisplay.classList.add('regular');
                this.elements.userIdDisplay.innerHTML = `<i class="fas fa-user"></i> ID: ${this.currentUserId}`;
            }
        }
        
        if (this.elements.userStatus) {
            if (this.isVIP) {
                this.elements.userStatus.innerHTML = `
                    <div class="session-info" style="border-color: var(--vip);">
                        <i class="fas fa-crown"></i> Estado: <span class="vip-badge">USUARIO VIP</span>
                    </div>
                `;
            } else if (this.isAdmin) {
                this.elements.userStatus.innerHTML = `
                    <div class="session-info" style="border-color: var(--primary);">
                        <i class="fas fa-user-shield"></i> Estado: <span style="color: var(--primary);">ADMINISTRADOR</span>
                    </div>
                `;
            }
        }
    }

    initEventListeners() {
        if (this.elements.sendSignalBtn) {
            this.elements.sendSignalBtn.addEventListener('click', () => this.sendSignal());
        }
        if (this.elements.readyBtn) {
            this.elements.readyBtn.addEventListener('click', () => this.toggleReady());
        }
        if (this.elements.closeAlert) {
            this.elements.closeAlert.addEventListener('click', () => this.hideAlert());
        }
    }
}

// =============================================
// INICIALIZACIÓN ULTRA-RÁPIDA
// =============================================

const detectedUserId = getUserIdSuperRobust();
console.log('🚀 [APP] User ID detectado:', detectedUserId);

if (detectedUserId && !detectedUserId.startsWith('guest_')) {
    localStorage.setItem('tg_user_id', detectedUserId);
}

document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    signalManager = new SignalManager();
});
