const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// =============================================
// CONFIGURACIÓN
// =============================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_ID = process.env.ADMIN_ID || '5376388604';
const RENDER_URL = process.env.RENDER_URL || 'https://quantumtrade-ie33.onrender.com';

console.log('=== 🤖 INICIANDO BOT DE TELEGRAM ===');

// Verificar configuración
if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ ERROR: TELEGRAM_BOT_TOKEN no está definido');
    process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERROR: Variables de Supabase no están definidas');
    process.exit(1);
}

// =============================================
// INICIALIZACIÓN DE SUPABASE
// =============================================

console.log('🔄 Conectando con la base de datos...');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log('✅ Conexión a Supabase establecida');

// =============================================
// INICIALIZACIÓN DEL BOT
// =============================================

console.log('🚀 Inicializando bot de Telegram...');

let bot;
try {
    bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
        polling: {
            interval: 3000,
            timeout: 30,
            autoStart: true,
            params: {
                timeout: 60,
                limit: 100
            }
        }
    });
    console.log('✅ Cliente de Telegram inicializado');
} catch (error) {
    console.error('❌ Error crítico al crear el bot:', error);
    process.exit(1);
}

// =============================================
// FUNCIONES AUXILIARES
// =============================================

// Función para crear teclado principal
function createMainKeyboard() {
    return {
        reply_markup: {
            resize_keyboard: true,
            keyboard: [
                [{ text: '📈 VER SEÑALES' }, { text: '💎 PLAN VIP' }],
                [{ text: '👤 MI CUENTA' }, { text: '🌐 PLATAFORMA WEB' }],
                [{ text: '❓ AYUDA' }, { text: '📞 CONTACTO' }]
            ]
        }
    };
}

// Función para crear teclado inline para VIP
function createVIPInlineKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '💬 CONTACTAR ADMINISTRADOR', url: 'https://t.me/Asche90' }]
            ]
        }
    };
}

// Función para crear teclado inline para WebApp con ID de usuario
function createWebAppInlineKeyboard(userId) {
    const webAppUrl = `${RENDER_URL}?tgid=${userId}`;
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 ACCEDER A LA PLATAFORMA', web_app: { url: webAppUrl } }]
            ]
        }
    };
}

// Función para obtener estado del usuario
async function getUserStatus(userId) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error en getUserStatus:', error);
            return null;
        }
        
        return user;
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        return null;
    }
}

// Función para enviar notificaciones
async function sendNotification(chatId, message, options = {}) {
    try {
        await bot.sendMessage(chatId, message, { 
            parse_mode: 'Markdown', 
            ...options 
        });
        return true;
    } catch (error) {
        console.error('Error enviando notificación:', error.message);
        return false;
    }
}

// =============================================
// VERIFICACIÓN DE CONEXIÓN
// =============================================

console.log('🔍 Estableciendo conexión con Telegram...');

bot.getMe().then((me) => {
    console.log('🎉 === SISTEMA OPERATIVO ===');
    console.log(`🤖 Bot identificado: @${me.username}`);
    console.log(`🆔 ID del bot: ${me.id}`);
    console.log('✅ Todas las conexiones establecidas correctamente');
    console.log('📡 Sistema listo para recibir solicitudes...');
}).catch((error) => {
    console.error('❌ Error de conexión:', error);
    process.exit(1);
});

// =============================================
// MANEJADORES DE EVENTOS
// =============================================

// Manejar errores de polling
bot.on('polling_error', (error) => {
    if (error.code === 409) {
        console.log('⚠️ Conflicto de polling. Continuando...');
    } else {
        console.error('❌ Error de polling:', error.message);
    }
});

// COMANDO /start - MENÚ PRINCIPAL
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const userName = msg.from.first_name || 'Usuario';
    
    console.log(`👋 Nuevo usuario: ${userName} (${userId})`);

    try {
        // Guardar usuario en la base de datos
        const { data, error } = await supabase
            .from('users')
            .upsert({
                telegram_id: userId,
                username: msg.from.username,
                first_name: msg.from.first_name,
                last_name: msg.from.last_name,
                created_at: new Date().toISOString()
            }, { 
                onConflict: 'telegram_id',
                ignoreDuplicates: false 
            });

        if (error) {
            console.error('Error guardando usuario:', error);
        }

        const welcomeMessage = `
🤖 *Quantum Signal Trader*

¡Hola *${userName}*! 

Este bot envía señales de trading para opciones binarias.

*Usa los botones para navegar:* 👇
        `;
        
        await sendNotification(chatId, welcomeMessage, createMainKeyboard());
        
    } catch (error) {
        console.error('Error en /start:', error);
        await sendNotification(chatId, '❌ Error en el sistema. Por favor, intenta nuevamente.');
    }
});

// COMANDO /estado - VERIFICACIÓN DEL SISTEMA
bot.onText(/\/estado/, async (msg) => {
    const chatId = msg.chat.id;
    
    const statusMessage = `
🔍 *Estado del Sistema*

🟢 *Sistema Operativo*

⏰ *Última actualización:*
${new Date().toLocaleString('es-ES')}
    `;

    await sendNotification(chatId, statusMessage);
});

// MANEJAR BOTONES DEL TECLADO PRINCIPAL
bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('/')) return;
    
    const chatId = msg.chat.id;
    const messageText = msg.text;
    const userId = msg.from.id.toString();
    const userName = msg.from.first_name || 'Usuario';

    console.log(`📨 Mensaje de ${userName} (${userId}): ${messageText}`);

    try {
        switch (messageText) {
            case '📈 VER SEÑALES':
                await handleViewSignals(chatId, userId);
                break;
                
            case '💎 PLAN VIP':
                await handleVIPInfo(chatId);
                break;
                
            case '👤 MI CUENTA':
                await handleUserStatus(chatId, userId);
                break;
                
            case '🌐 PLATAFORMA WEB':
                await handleWebApp(chatId, userId);
                break;
                
            case '❓ AYUDA':
                await handleHelp(chatId);
                break;
                
            case '📞 CONTACTO':
                await handleContact(chatId);
                break;
                
            default:
                if (!messageText.startsWith('/')) {
                    await sendNotification(chatId, 
                        `Usa los botones para navegar por las opciones disponibles.`,
                        createMainKeyboard()
                    );
                }
                break;
        }
    } catch (error) {
        console.error('Error procesando mensaje:', error);
        await sendNotification(chatId, 
            '⚠️ Error del sistema. Intenta nuevamente.',
            createMainKeyboard()
        );
    }
});

// MANEJAR CALLBACK QUERIES
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const data = callbackQuery.data;
    const userId = callbackQuery.from.id.toString();

    console.log(`🔘 Callback de ${userId}: ${data}`);

    try {
        switch (data) {
            case 'refresh_signals':
                await handleViewSignals(chatId, userId);
                break;
                
            case 'refresh_status':
                await handleUserStatus(chatId, userId);
                break;
                
            case 'vip_benefits':
                await handleVIPBenefits(chatId);
                break;
                
            default:
                console.log('Callback no manejado:', data);
        }

        await bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
        console.error('Error en callback:', error);
        await bot.answerCallbackQuery(callbackQuery.id, { 
            text: '❌ Error al procesar la solicitud' 
        });
    }
});

// =============================================
// FUNCIONES DE MANEJO
// =============================================

// 🌐 PLATAFORMA WEB - AHORA CON ID EN URL
async function handleWebApp(chatId, userId) {
    const webAppMessage = `
🌐 *Plataforma Web Quantum Trader*

Accede a nuestra plataforma web para:

• Ver señales en tiempo real
• Historial completo
• Gestión de cuenta

*Haz clic para acceder:* 👇
    `;

    await sendNotification(chatId, webAppMessage, createWebAppInlineKeyboard(userId));
}

// 📈 SEÑALES
async function handleViewSignals(chatId, userId) {
    try {
        const { data: signals, error } = await supabase
            .from('signals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        let signalsMessage = `📊 *Señales Recientes*\n\n`;

        if (signals && signals.length > 0) {
            signals.forEach((signal) => {
                const directionEmoji = signal.direction === 'up' ? '🟢' : '🔴';
                const directionText = signal.direction === 'up' ? 'ALZA' : 'BAJA';
                const statusEmoji = signal.status === 'profit' ? '💰' : 
                                  signal.status === 'loss' ? '📉' : '⏳';
                const statusText = signal.status === 'profit' ? 'GANADA' : 
                                 signal.status === 'loss' ? 'PERDIDA' : 'PENDIENTE';
                
                const created = new Date(signal.created_at).toLocaleTimeString();

                signalsMessage += `${directionEmoji} *${signal.asset}* - ${directionText}\n`;
                signalsMessage += `⏱ ${signal.timeframe} min | ${statusEmoji} ${statusText}\n`;
                signalsMessage += `🕐 ${created}\n`;
                signalsMessage += `${signal.is_free ? '🎯 GRATIS' : '💎 VIP'}\n`;
                signalsMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            });
        } else {
            signalsMessage += '*No hay señales activas.*\n';
        }

        signalsMessage += `💎 *¿Quieres acceso completo?*\nActiva tu membresía VIP.`;

        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔄 ACTUALIZAR', callback_data: 'refresh_signals' },
                        { text: '💎 VER VIP', callback_data: 'vip_benefits' }
                    ],
                    [
                        { text: '🚀 PLATAFORMA WEB', web_app: { url: `${RENDER_URL}?tgid=${userId}` } }
                    ]
                ]
            }
        };

        await sendNotification(chatId, signalsMessage, inlineKeyboard);

    } catch (error) {
        console.error('Error obteniendo señales:', error);
        await sendNotification(chatId, 
            '⚠️ Error al cargar señales.',
            createMainKeyboard()
        );
    }
}

// 💎 PLAN VIP
async function handleVIPInfo(chatId) {
    const vipMessage = `
💎 *Plan VIP Quantum Trader*

*Beneficios:*
• Todas las señales sin límites
• Alertas en tiempo real
• Soporte prioritario

*Precio: 5,000 CUP/mes*
*Duración: 30 días*

*Contacta al administrador para activar:* 👇
    `;

    await sendNotification(chatId, vipMessage, createVIPInlineKeyboard());
}

// 💎 BENEFICIOS VIP
async function handleVIPBenefits(chatId) {
    const benefitsMessage = `
💎 *Beneficios VIP*

*Incluye:*
• Todas las señales
• Dashboard avanzado
• Soporte 24/7

*Precio: 5,000 CUP/mes*

*Contacta al administrador para activar.*
    `;

    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '💬 CONTACTAR', url: 'https://t.me/Asche90' }
                ]
            ]
        }
    };

    await sendNotification(chatId, benefitsMessage, inlineKeyboard);
}

// 👤 ESTADO DE USUARIO
async function handleUserStatus(chatId, userId) {
    try {
        const user = await getUserStatus(userId);
        
        let statusMessage = `
👤 *Información de Cuenta*

🆔 *ID:* ${userId}
        `;

        if (user) {
            statusMessage += `👤 *Nombre:* ${user.first_name || 'No especificado'}\n`;
            statusMessage += `📊 *Membresía:* ${user.is_vip ? '🎖️ VIP' : '👤 Standard'}\n`;

            if (user.is_vip && user.vip_expires_at) {
                const expiryDate = new Date(user.vip_expires_at);
                const now = new Date();
                const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                
                statusMessage += `⏰ *Vigencia VIP:* ${expiryDate.toLocaleDateString('es-ES')}\n`;
                statusMessage += `📅 *Días restantes:* ${daysLeft}\n`;
            }
        } else {
            statusMessage += `👤 *Nombre:* No registrado\n`;
            statusMessage += `📊 *Membresía:* 👤 Standard\n`;
        }

        if (!user?.is_vip) {
            statusMessage += `\n💎 *Mejora a VIP para acceso completo.*`;
        }

        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔄 ACTUALIZAR', callback_data: 'refresh_status' }
                    ],
                    (user?.is_vip) ? 
                    [
                        { text: '💎 RENOVAR VIP', url: 'https://t.me/Asche90' }
                    ] :
                    [
                        { text: '🚀 ACTIVAR VIP', callback_data: 'vip_benefits' }
                    ]
                ]
            }
        };

        await sendNotification(chatId, statusMessage, inlineKeyboard);

    } catch (error) {
        console.error('Error en estado de usuario:', error);
        await sendNotification(chatId, 
            '⚠️ Error al cargar información.',
            createMainKeyboard()
        );
    }
}

// ❓ AYUDA
async function handleHelp(chatId) {
    const helpMessage = `
❓ *Centro de Ayuda*

*Para soporte técnico contacta al administrador:* 👇
    `;

    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📞 CONTACTAR', url: 'https://t.me/Asche90' }
                ]
            ]
        }
    };

    await sendNotification(chatId, helpMessage, inlineKeyboard);
}

// 📞 CONTACTO
async function handleContact(chatId) {
    const contactMessage = `
📞 *Contacto*

*Administrador:* @Asche90

*Para:*
• Activación de VIP
• Soporte técnico
• Consultas generales
    `;

    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '💬 CONTACTAR', url: 'https://t.me/Asche90' }
                ]
            ]
        }
    };

    await sendNotification(chatId, contactMessage, inlineKeyboard);
}

// =============================================
// SUSCRIPCIÓN A CAMBIOS EN SUPABASE
// =============================================

console.log('🔄 Activando sistema de notificaciones...');

// Suscribirse a nuevas señales
const signalsChannel = supabase
    .channel('signals-notifications')
    .on('postgres_changes', 
        { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'signals' 
        }, 
        async (payload) => {
            console.log('🔔 Nueva señal detectada');
            
            const signal = payload.new;
            const signalMessage = `
🎯 *Nueva Señal*

• Activo: ${signal.asset}
• Dirección: ${signal.direction === 'up' ? 'ALZA 🟢' : 'BAJA 🔴'}
• Timeframe: ${signal.timeframe} min
• Tipo: ${signal.is_free ? 'GRATIS 🎯' : 'VIP 💎'}
            `;
            
            await sendNotification(ADMIN_ID, signalMessage);
        }
    )
    .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log('✅ Suscrito a señales');
        }
    });

console.log('✅ Sistema de notificaciones activado');
console.log('🎉 === BOT QUANTUM TRADER OPERATIVO ===');

// Log de estado cada 10 minutos
setInterval(() => {
    console.log('💓 Bot activo -', new Date().toLocaleTimeString());
}, 600000);

module.exports = bot;
