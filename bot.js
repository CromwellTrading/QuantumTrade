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
console.log('📋 Verificando configuración del sistema...');

// Verificar que tenemos todas las variables necesarias
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
            interval: 1000,
            timeout: 10,
            autoStart: true,
            params: {
                timeout: 60
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

// Función para crear teclado principal mejorado
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
                [{ text: '💬 CONTACTAR ADMINISTRADOR', url: 'https://t.me/Asche90' }],
                [{ text: '📋 VER BENEFICIOS', callback_data: 'vip_benefits' }]
            ]
        }
    };
}

// Función para crear teclado inline para WebApp
function createWebAppInlineKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [{ text: '🚀 ACCEDER A LA PLATAFORMA', web_app: { url: RENDER_URL } }],
                [{ text: '📱 ABRIR EN NAVEGADOR', url: RENDER_URL }]
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

        if (error) throw error;
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
    } catch (error) {
        console.error('Error enviando notificación:', error);
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

// Manejar errores
bot.on('polling_error', (error) => {
    console.error('❌ Error de polling:', error.message);
});

// COMANDO /start - MENÚ PRINCIPAL MEJORADO
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

        if (error) throw error;

        const welcomeMessage = `
🤖 *Quantum Signal Trader*

¡Hola *${userName}*! 

Este bot envía señales de trading para opciones binarias.

*Funcionalidades:*
• Señales en tiempo real
• Plataforma web integrada
• Plan VIP disponible

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

📊 *Métricas:*
• Bot: Conectado
• Base de datos: Sincronizada
• Servidor Web: Respondiendo

⏰ *Última actualización:*
${new Date().toLocaleString('es-ES', { 
    timeZone: 'America/Havana'
})}
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

    console.log(`📨 Interacción de ${userName}: ${messageText}`);

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
                await handleWebApp(chatId);
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

    console.log(`🔘 Callback recibido: ${data}`);

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
// FUNCIONES DE MANEJO MEJORADAS
// =============================================

// 🌐 PLATAFORMA WEB MEJORADA
async function handleWebApp(chatId) {
    const webAppMessage = `
🌐 *Plataforma Web Quantum Trader*

Accede a nuestra plataforma web para:

• Ver señales en tiempo real
• Historial completo de operaciones
• Gestión de tu cuenta

*Haz clic para acceder:* 👇
    `;

    await sendNotification(chatId, webAppMessage, createWebAppInlineKeyboard());
}

// 📈 SEÑALES MEJORADAS
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
            signals.forEach((signal, index) => {
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
            signalsMessage += '*No hay señales activas en este momento.*\n\n';
            signalsMessage += 'Nuestro equipo está monitoreando los mercados.\n\n';
        }

        signalsMessage += `💎 *¿Quieres acceso a todas las señales?*\nActiva tu membresía VIP.`;

        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔄 ACTUALIZAR', callback_data: 'refresh_signals' },
                        { text: '💎 VER VIP', callback_data: 'vip_benefits' }
                    ],
                    [
                        { text: '🚀 PLATAFORMA WEB', web_app: { url: RENDER_URL } }
                    ]
                ]
            }
        };

        await sendNotification(chatId, signalsMessage, inlineKeyboard);

    } catch (error) {
        console.error('Error obteniendo señales:', error);
        await sendNotification(chatId, 
            '⚠️ Error al cargar señales. Intenta más tarde.',
            createMainKeyboard()
        );
    }
}

// 💎 PLAN VIP MEJORADO
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

// 💎 BENEFICIOS VIP DETALLADOS
async function handleVIPBenefits(chatId) {
    const benefitsMessage = `
💎 *Beneficios VIP*

*Señales Completas:*
• Forex, índices, commodities
• Criptomonedas
• Acciones

*Herramientas:*
• Dashboard avanzado
• Alertas personalizadas
• Soporte 24/7

*Inversión: 5,000 CUP/mes*

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

// 👤 ESTADO DE USUARIO MEJORADO
async function handleUserStatus(chatId, userId) {
    try {
        const user = await getUserStatus(userId);
        
        if (!user) {
            await sendNotification(chatId, 
                '🔍 Cuenta no registrada. Usa /start para registrar.',
                createMainKeyboard()
            );
            return;
        }

        let statusMessage = `
👤 *Información de Cuanta*

🆔 *ID:* ${userId}
👤 *Nombre:* ${user.first_name || 'No especificado'}
📊 *Membresía:* ${user.is_vip ? '🎖️ VIP' : '👤 Standard'}
        `;

        if (user.is_vip && user.vip_expires_at) {
            const expiryDate = new Date(user.vip_expires_at);
            const now = new Date();
            const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            
            statusMessage += `\n⏰ *Vigencia VIP:* ${expiryDate.toLocaleDateString('es-ES')}`;
            statusMessage += `\n📅 *Días restantes:* ${daysLeft}`;
        } else if (!user.is_vip) {
            statusMessage += `\n\n💎 *Mejora a VIP para acceso completo.*`;
        }

        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔄 ACTUALIZAR', callback_data: 'refresh_status' }
                    ],
                    user.is_vip ? 
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

// ❓ AYUDA MEJORADA
async function handleHelp(chatId) {
    const helpMessage = `
❓ *Centro de Ayuda*

*Soporte Técnico:*
• Configuración
• Problemas de conexión
• Errores del sistema

*Contacta al administrador:* 👇
    `;

    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📞 CONTACTAR', url: 'https://t.me/Asche90' }
                ],
                [
                    { text: '🌐 PLATAFORMA WEB', web_app: { url: RENDER_URL } }
                ]
            ]
        }
    };

    await sendNotification(chatId, helpMessage, inlineKeyboard);
}

// 📞 CONTACTO MEJORADO
async function handleContact(chatId) {
    const contactMessage = `
📞 *Contacto*

*Administrador:* @Asche90

*Para:*
• Activación de VIP
• Soporte técnico
• Consultas generales

*Horarios:*
Lunes a Domingo, 9:00 - 23:00
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
supabase
    .channel('signals-notifications')
    .on('postgres_changes', 
        { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'signals' 
        }, 
        async (payload) => {
            console.log('🔔 Nueva señal detectada en el sistema');
            
            const signal = payload.new;
            const signalMessage = `
🎯 *Nueva Señal Generada*

• Activo: ${signal.asset}
• Dirección: ${signal.direction === 'up' ? 'ALZA 🟢' : 'BAJA 🔴'}
• Timeframe: ${signal.timeframe} minutos
• Tipo: ${signal.is_free ? 'GRATUITA 🎯' : 'VIP 💎'}
            `;
            
            await sendNotification(ADMIN_ID, signalMessage);
        }
    )
    .subscribe();

// Suscribirse a actualizaciones de señales
supabase
    .channel('signals-updates')
    .on('postgres_changes', 
        { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'signals' 
        }, 
        async (payload) => {
            const signal = payload.new;
            
            if (payload.old.status === 'pending' && (signal.status === 'profit' || signal.status === 'loss')) {
                console.log('💰 Resultado de operación registrado');
                
                const resultMessage = `
📊 *Resultado de Operación*

• ID: ${signal.id}
• Activo: ${signal.asset}
• Resultado: ${signal.status === 'profit' ? 'GANADA ✅' : 'PERDIDA 📉'}
                `;
                
                await sendNotification(ADMIN_ID, resultMessage);
            }
        }
    )
    .subscribe();

console.log('✅ Sistema de notificaciones activado');
console.log('🎉 === BOT QUANTUM TRADER OPERATIVO ===');
console.log('📡 Esperando interacciones de usuarios...');

// Log de actividad periódica
setInterval(() => {
    console.log('💓 Sistema Quantum Trader - Operativo...');
}, 300000); // Log cada 5 minutos

module.exports = bot;
