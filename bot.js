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

console.log('=== 🤖 INICIANDO BOT MEJORADO ===');

// Verificar configuración
if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERROR: Faltan variables de entorno');
    process.exit(1);
}

// =============================================
// INICIALIZACIÓN
// =============================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
    polling: {
        interval: 1000,
        timeout: 10,
        autoStart: true
    }
});

// =============================================
// CACHE PARA MÁXIMA VELOCIDAD
// =============================================

const userCache = new Map();
const signalCache = new Map();

// =============================================
// FUNCIONES PRINCIPALES
// =============================================

function createMainKeyboard() {
    return {
        reply_markup: {
            resize_keyboard: true,
            keyboard: [
                [{ text: '📈 SEÑALES' }, { text: '💎 VIP' }],
                [{ text: '🌐 WEBAPP' }, { text: '❓ AYUDA' }],
                [{ text: 'ℹ️ INFORMACIÓN' }, { text: '📊 PLATAFORMA' }]
            ]
        }
    };
}

function createPlatformKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [[
                { text: '🚀 REGISTRARSE EN OLYMPTRADE', url: 'https://olymptrade.com/pages/referral/?rf=108107566' }
            ]]
        }
    };
}

function createVIPKeyboard(userId) {
    return {
        reply_markup: {
            inline_keyboard: [[
                { 
                    text: '💎 SOLICITAR ACCESO VIP', 
                    url: `https://t.me/share/url?url=Hola!%20Quiero%20acceder%20al%20plan%20VIP%20de%20Quantum%20Signal%20Trader.%20Mi%20ID%20es:%20${userId}`
                }
            ]]
        }
    };
}

async function sendFastMessage(chatId, message, options = {}) {
    try {
        await bot.sendMessage(chatId, message, { 
            parse_mode: 'Markdown', 
            ...options 
        });
        return true;
    } catch (error) {
        console.error('❌ [BOT] Error enviando mensaje:', error.message);
        return false;
    }
}

async function getUserFast(userId) {
    if (userCache.has(userId)) {
        return userCache.get(userId);
    }
    
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', userId)
            .single();

        if (!error && user) {
            userCache.set(userId, user);
            setTimeout(() => userCache.delete(userId), 30000);
        }
        
        return user;
    } catch (error) {
        return null;
    }
}

// =============================================
// MANEJADORES PRINCIPALES
// =============================================

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const userName = msg.from.first_name || 'Usuario';

    // Guardar usuario en BD
    supabase.from('users').upsert({
        telegram_id: userId,
        username: msg.from.username,
        first_name: msg.from.first_name,
        created_at: new Date().toISOString()
    }).then(() => console.log(`✅ [BOT] Usuario ${userId} guardado`));

    const welcomeMessage = `🤖 *Quantum Signal Trader Pro*\n\n¡Hola *${userName}*! 👋\n\n*Tu ID:* \`${userId}\`\n\n🎯 *Sistema Profesional de Señales*:\n• 🤖 Bot automatizado\n• ⚡ Señales en tiempo real\n• 💰 Opciones binarias\n• 📊 Plataforma web integrada\n\n📈 *Horarios de Sesiones*:\n🕙 10:00 AM - Sesión Matutina\n🕙 10:00 PM - Sesión Nocturna\n\n🎁 *La primera señal de cada sesión es GRATIS*`;

    await sendFastMessage(chatId, welcomeMessage, createMainKeyboard());
    
    // Enviar mensaje adicional sobre la plataforma
    setTimeout(async () => {
        const platformMessage = `📊 *PLATAFORMA RECOMENDADA*\n\nPara operar con nuestras señales, te recomendamos:\n\n🔗 *Olymptrade* - Plataforma regulada\n\n👉 Regístrate usando nuestro enlace oficial:`;
        await sendFastMessage(chatId, platformMessage, createPlatformKeyboard());
    }, 1000);
});

bot.on('message', async (msg) => {
    if (msg.text?.startsWith('/')) return;
    
    const chatId = msg.chat.id;
    const messageText = msg.text;
    const userId = msg.from.id.toString();

    switch (messageText) {
        case '📈 SEÑALES':
            await handleFastSignals(chatId, userId);
            break;
        case '💎 VIP':
            await handleFastVIP(chatId, userId);
            break;
        case '🌐 WEBAPP':
            await handleFastWebApp(chatId, userId);
            break;
        case '❓ AYUDA':
            await handleFastHelp(chatId);
            break;
        case 'ℹ️ INFORMACIÓN':
            await handleFastInfo(chatId);
            break;
        case '📊 PLATAFORMA':
            await handleFastPlatform(chatId);
            break;
    }
});

// =============================================
// MANEJADORES DE COMANDOS MEJORADOS
// =============================================

async function handleFastSignals(chatId, userId) {
    try {
        const { data: signals } = await supabase
            .from('signals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        let message = `📊 *ÚLTIMAS SEÑALES*\n\n`;
        
        if (signals?.length > 0) {
            signals.forEach(signal => {
                const arrow = signal.direction === 'up' ? '🟢 ALZA' : '🔴 BAJA';
                const status = signal.status === 'profit' ? '💰 GANADA' : 
                              signal.status === 'loss' ? '📉 PERDIDA' : '⏳ PENDIENTE';
                const time = new Date(signal.created_at).toLocaleTimeString();
                
                message += `${arrow} *${signal.asset}*\n`;
                message += `⏱ ${signal.timeframe}min | ${status}\n`;
                message += `🕐 ${time} | ID: ${signal.id}\n`;
                message += `━━━━━━━━━━━━━━\n`;
            });
            
            message += `\n📈 *Próxima Sesión:*\n🕙 10:00 AM | 10:00 PM\n\n🎁 *Primera señal GRATIS en cada sesión*`;
        } else {
            message += `No hay señales activas en este momento.\n\n`;
            message += `📅 *Próximas Sesiones:*\n`;
            message += `🕙 10:00 AM - Sesión Matutina\n`;
            message += `🕙 10:00 PM - Sesión Nocturna\n\n`;
            message += `🎯 La primera señal de cada sesión es GRATIS`;
        }

        await sendFastMessage(chatId, message);
        
    } catch (error) {
        await sendFastMessage(chatId, '⚠️ Error temporal cargando señales. Intenta nuevamente.');
    }
}

async function handleFastVIP(chatId, userId) {
    const message = `💎 *PLAN VIP - ACCESO COMPLETO*\n\n✨ *Beneficios Exclusivos:*\n\n• ✅ Todas las señales ilimitadas\n• ⚡ Alertas instantáneas\n• 🎯 Señales premium\n• 📊 Estadísticas avanzadas\n• 🔔 Soporte prioritario\n• 📈 Mejores oportunidades\n\n💰 *Inversión:* 5,000 CUP/mes\n\n👤 *Tu ID:* \`${userId}\`\n\n*¡Solicita tu acceso VIP ahora!* 🚀`;
    
    await sendFastMessage(chatId, message, createVIPKeyboard(userId));
}

async function handleFastWebApp(chatId, userId) {
    const webAppUrl = `${RENDER_URL}?tgid=${userId}`;
    const message = `🌐 *PLATAFORMA WEB - QUANTUM TRADER*\n\n*Características Principales:*\n\n• 📱 Interfaz moderna y responsive\n• ⚡ Señales en tiempo real\n• 📊 Panel de estadísticas\n• 🔔 Sistema de alertas\n• 👑 Panel VIP integrado\n• 📈 Historial completo\n\n*Para recibir alertas:*\n1. Abre la plataforma\n2. Toca el botón \"PREPARADOS\"\n3. Recibe señales automáticamente\n\n*Tu acceso personalizado:*`;
    
    await sendFastMessage(chatId, message, {
        reply_markup: {
            inline_keyboard: [[
                { text: '🚀 ABRIR PLATAFORMA WEB', web_app: { url: webAppUrl } }
            ]]
        }
    });
}

async function handleFastHelp(chatId) {
    const message = `❓ *GUÍA COMPLETA - QUANTUM SIGNAL TRADER*\n\n*¿CÓMO FUNCIONA?*\n\n🤖 *EL BOT:*\n• Envía señales de trading automáticamente\n• Opera con opciones binarias\n• Horarios: 10AM y 10PM\n• Primera señal GRATIS por sesión\n\n📱 *BOTONES PRINCIPALES:*\n\n📈 *SEÑALES:*\nMuestra las últimas señales enviadas\n\n💎 *VIP:*\nAcceso a todas las señales ilimitadas\n\n🌐 *WEBAPP:*\nPlataforma web con interfaz completa\n\n❓ *AYUDA:*\nEsta guía de uso\n\nℹ️ *INFORMACIÓN:*\nDetalles del sistema\n\n📊 *PLATAFORMA:*\nEnlace para registrarse\n\n⚡ *PARA RECIBIR SEÑALES:*\n1. Abre la WEBAPP (botón 🌐 WEBAPP)\n2. Toca \"PREPARADOS\" para activar alertas\n3. Recibe señales automáticamente\n4. Opera en tu plataforma preferida\n\n📅 *HORARIOS DE SESIONES:*\n🕙 10:00 AM - Sesión Matutina\n🕙 10:00 PM - Sesión Nocturna\n\n🎁 *LA PRIMERA SEÑAL DE CADA SESIÓN ES GRATIS*\n\n🔗 *PLATAFORMA RECOMENDADA:*\nOlymptrade - Regulada y confiable\n\n*¡Éxitos en tus operaciones!* 🚀`;
    
    await sendFastMessage(chatId, message);
}

async function handleFastInfo(chatId) {
    const message = `ℹ️ *INFORMACIÓN DEL SISTEMA*\n\n*QUANTUM SIGNAL TRADER PRO*\n\n🎯 *Qué Hacemos:*\nProveemos señales de trading automatizadas para opciones binarias con alta precisión.\n\n⏰ *Horarios Operativos:*\n• 🕙 10:00 AM - Sesión Matutina\n• 🕙 10:00 PM - Sesión Nocturna\n\n💰 *Modelo de Servicio:*\n• 🎁 Primera señal de cada sesión: GRATIS\n• 💎 Acceso completo: Plan VIP\n\n📊 *Características Técnicas:*\n• 🤖 Bot completamente automatizado\n• ⚡ Señales en tiempo real\n• 📱 Plataforma web responsive\n• 🔔 Sistema de alertas instantáneas\n• 📈 Panel de estadísticas\n\n🎯 *Recomendaciones:*\n• Opera con capital que puedas arriesgar\n• Usa gestión de riesgo\n• Sigue las señales disciplinadamente\n• La primera señal de cada sesión es gratuita\n\n*¡Trading responsable y exitoso!* 📈`;
    
    await sendFastMessage(chatId, message);
}

async function handleFastPlatform(chatId) {
    const message = `📊 *PLATAFORMA DE TRADING RECOMENDADA*\n\n*OLYMPTRADE* - Plataforma Regulada\n\n✨ *Ventajas:*\n• 📈 Regulada internacionalmente\n• 💰 Múltiples métodos de pago\n• 📱 App móvil disponible\n• 🎯 Interfaz intuitiva\n• 🔒 Seguridad garantizada\n\n💰 *Depósito Mínimo:* $10\n\n👉 *Regístrate usando nuestro enlace oficial:*`;
    
    await sendFastMessage(chatId, message, createPlatformKeyboard());
}

// =============================================
// SISTEMA DE NOTIFICACIONES CON ID
// =============================================

console.log('🔔 [BOT] Activando notificaciones con sistema de ID...');

// Suscripción a señales
const signalsChannel = supabase
    .channel('ultra-fast-bot-signals')
    .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'signals' }, 
        async (payload) => {
            console.log('⚡ [BOT] Señal detectada - Enviando con ID:', payload.new.id);
            await broadcastSignalWithID(payload.new);
        }
    )
    .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'signals' },
        async (payload) => {
            console.log('🔄 [BOT] Señal actualizada - Resultado:', payload.new.status);
            await broadcastSignalResult(payload.new);
        }
    )
    .subscribe();

async function broadcastSignalWithID(signal) {
    try {
        // Obtener todos los usuarios rápidamente
        const { data: users } = await supabase
            .from('users')
            .select('telegram_id, is_vip, free_signals_used');
        
        if (!users) return;

        const arrow = signal.direction === 'up' ? '🟢' : '🔴';
        const message = `
🎯 *SEÑAL DETECTADA* 🎯

${arrow} *${signal.asset}*
📈 ${signal.direction === 'up' ? 'ALZA (CALL)' : 'BAJA (PUT)'}
⏱ ${signal.timeframe} minutos
${signal.is_free ? '🎯 GRATIS' : '💎 VIP'}

*ID: ${signal.id}*

*¡Actúa rápido!* ⚡
        `;

        // Enviar a todos los usuarios VIP inmediatamente
        const vipUsers = users.filter(user => user.is_vip);
        const freeUsers = users.filter(user => !user.is_vip && user.free_signals_used === 0);

        const recipients = signal.is_free ? [...vipUsers, ...freeUsers] : vipUsers;

        console.log(`📨 [BOT] Enviando señal ${signal.id} a ${recipients.length} usuarios`);

        // Enviar en paralelo para máxima velocidad
        const sendPromises = recipients.map(user => 
            sendFastMessage(user.telegram_id, message).catch(() => null)
        );

        await Promise.all(sendPromises);

        // Actualizar contador de señales gratuitas
        if (signal.is_free && freeUsers.length > 0) {
            const freeUserIds = freeUsers.map(u => u.telegram_id);
            await supabase
                .from('users')
                .update({ free_signals_used: 1 })
                .in('telegram_id', freeUserIds);
        }

    } catch (error) {
        console.error('❌ [BOT] Error broadcast:', error);
    }
}

// NUEVA FUNCIÓN: Notificar resultados de señales
async function broadcastSignalResult(signal) {
    try {
        // Solo notificar si la señal tiene un resultado (profit/loss)
        if (signal.status !== 'profit' && signal.status !== 'loss') return;

        const { data: users } = await supabase
            .from('users')
            .select('telegram_id, is_vip');

        if (!users) return;

        const resultEmoji = signal.status === 'profit' ? '💰' : '📉';
        const resultText = signal.status === 'profit' ? 'PROFIT' : 'LOSS';
        const resultColor = signal.status === 'profit' ? '🟢' : '🔴';

        const message = `
${resultColor} *RESULTADO DE SEÑAL* ${resultColor}

📊 *${signal.asset}*
🎯 Resultado: *${resultText}* ${resultEmoji}
⏱ Duración: ${signal.timeframe} minutos

*ID: ${signal.id}*

${signal.status === 'profit' ? '¡Operación ganadora! 🎉' : 'Operación cerrada. Siguiente oportunidad 💪'}
        `;

        console.log(`📨 [BOT] Enviando resultado ${signal.status} para señal ${signal.id} a ${users.length} usuarios`);

        // Enviar a todos los usuarios
        const sendPromises = users.map(user => 
            sendFastMessage(user.telegram_id, message).catch(() => null)
        );

        await Promise.all(sendPromises);

    } catch (error) {
        console.error('❌ [BOT] Error enviando resultado:', error);
    }
}

// =============================================
// COMANDOS DE ADMIN PARA RESULTADOS
// =============================================

// Comando para que el admin pueda marcar resultados
bot.onText(/\/resultado (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Verificar si es admin
    if (userId !== ADMIN_ID) {
        await sendFastMessage(chatId, '❌ No tienes permisos para usar este comando.');
        return;
    }

    const params = match[1].split(' ');
    if (params.length < 2) {
        await sendFastMessage(chatId, '❌ Formato incorrecto. Usa: /resultado <ID> <profit/loss>');
        return;
    }

    const signalId = params[0];
    const result = params[1].toLowerCase();

    if (result !== 'profit' && result !== 'loss') {
        await sendFastMessage(chatId, '❌ Resultado debe ser "profit" o "loss"');
        return;
    }

    try {
        // Actualizar señal en Supabase
        const { data, error } = await supabase
            .from('signals')
            .update({ status: result })
            .eq('id', signalId)
            .select();

        if (error) {
            throw error;
        }

        if (data && data.length > 0) {
            await sendFastMessage(chatId, `✅ Señal ${signalId} marcada como ${result.toUpperCase()}`);
            
            // Notificar a todos los usuarios del resultado
            await broadcastSignalResult(data[0]);
        } else {
            await sendFastMessage(chatId, '❌ No se encontró la señal con ese ID');
        }

    } catch (error) {
        console.error('Error actualizando resultado:', error);
        await sendFastMessage(chatId, '❌ Error actualizando el resultado');
    }
});

// Comando para ver señales pendientes de resultado
bot.onText(/\/pendientes/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Verificar si es admin
    if (userId !== ADMIN_ID) {
        await sendFastMessage(chatId, '❌ No tienes permisos para usar este comando.');
        return;
    }

    try {
        const { data: signals, error } = await supabase
            .from('signals')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        let message = `📋 *Señales Pendientes de Resultado*\n\n`;
        
        if (signals?.length > 0) {
            signals.forEach(signal => {
                const arrow = signal.direction === 'up' ? '🟢' : '🔴';
                const expired = new Date(signal.expires_at) < new Date();
                
                message += `${arrow} *${signal.asset}*\n`;
                message += `⏱ ${signal.timeframe}min | ID: ${signal.id}\n`;
                message += `⏰ ${new Date(signal.created_at).toLocaleTimeString()}\n`;
                message += `📊 ${expired ? 'EXPIRADA' : 'ACTIVA'}\n`;
                message += `💡 Usa: /resultado ${signal.id} profit|loss\n`;
                message += `━━━━━━━━━━━━━━\n`;
            });
        } else {
            message += `No hay señales pendientes de resultado.`;
        }

        await sendFastMessage(chatId, message);
        
    } catch (error) {
        console.error('Error obteniendo señales pendientes:', error);
        await sendFastMessage(chatId, '❌ Error cargando señales pendientes.');
    }
});

// =============================================
// NOTIFICACIONES DE SESIÓN
// =============================================

const sessionsChannel = supabase
    .channel('session-notifications')
    .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'sessions' }, 
        async (payload) => {
            if (!payload.new.end_time) {
                await broadcastSessionStart();
            }
        }
    )
    .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions' },
        async (payload) => {
            if (payload.new.end_time) {
                await broadcastSessionEnd();
            }
        }
    )
    .subscribe();

async function broadcastSessionStart() {
    const { data: users } = await supabase.from('users').select('telegram_id');
    if (!users) return;

    const message = `🚀 *SESIÓN INICIADA*\n\n¡La sesión de trading ha comenzado! Prepárate para las señales. ⚡\n\n🎁 *Recuerda:* La primera señal es GRATIS`;
    
    users.forEach(user => {
        sendFastMessage(user.telegram_id, message).catch(() => null);
    });
}

async function broadcastSessionEnd() {
    const { data: users } = await supabase.from('users').select('telegram_id');
    if (!users) return;

    const message = `🏁 *SESIÓN FINALIZADA*\n\nLa sesión de trading ha terminado. ¡Gracias por participar!\n\n📅 *Próxima Sesión:*\n🕙 10:00 AM | 10:00 PM`;
    
    users.forEach(user => {
        sendFastMessage(user.telegram_id, message).catch(() => null);
    });
}

// =============================================
// INICIALIZACIÓN COMPLETADA
// =============================================

bot.getMe().then((me) => {
    console.log('🎉 === BOT MEJORADO OPERATIVO ===');
    console.log(`🤖 Bot: @${me.username}`);
    console.log('📊 Sistema de IDs y resultados activado');
    console.log('⚡ Comandos admin: /resultado <ID> <profit/loss>');
    console.log('⚡ Comandos admin: /pendientes');
    console.log('🕙 Horarios: 10AM y 10PM');
    console.log('🎁 Primera señal gratis por sesión');
});

module.exports = bot;
