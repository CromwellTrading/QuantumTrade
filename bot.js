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

console.log('=== 🤖 INICIANDO BOT ULTRA-RÁPIDO ===');

// Verificar configuración
if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERROR: Faltan variables de entorno');
    process.exit(1);
}

// =============================================
// INICIALIZACIÓN RÁPIDA
// =============================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
    polling: {
        interval: 1000, // Más rápido
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
// FUNCIONES ULTRA-RÁPIDAS
// =============================================

function createMainKeyboard() {
    return {
        reply_markup: {
            resize_keyboard: true,
            keyboard: [
                [{ text: '📈 SEÑALES' }, { text: '💎 VIP' }],
                [{ text: '🌐 WEBAPP' }, { text: '❓ AYUDA' }]
            ]
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
    // Usar cache para máxima velocidad
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
            setTimeout(() => userCache.delete(userId), 30000); // Cache por 30 segundos
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

    // Guardar usuario en BD (async sin await para no bloquear)
    supabase.from('users').upsert({
        telegram_id: userId,
        username: msg.from.username,
        first_name: msg.from.first_name,
        created_at: new Date().toISOString()
    }).then(() => console.log(`✅ [BOT] Usuario ${userId} guardado`));

    const welcomeMessage = `🤖 *Quantum Signal Trader*\n\n¡Hola *${userName}*! 👋`;
    
    await sendFastMessage(chatId, welcomeMessage, createMainKeyboard());
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
            await handleFastVIP(chatId);
            break;
        case '🌐 WEBAPP':
            await handleFastWebApp(chatId, userId);
            break;
        case '❓ AYUDA':
            await handleFastHelp(chatId);
            break;
    }
});

// =============================================
// MANEJADORES OPTIMIZADOS
// =============================================

async function handleFastSignals(chatId, userId) {
    try {
        const { data: signals } = await supabase
            .from('signals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3);

        let message = `📊 *Últimas Señales*\n\n`;
        
        if (signals?.length > 0) {
            signals.forEach(signal => {
                const arrow = signal.direction === 'up' ? '🟢 ALZA' : '🔴 BAJA';
                const status = signal.status === 'profit' ? '💰' : 
                              signal.status === 'loss' ? '📉' : '⏳';
                
                message += `${arrow} *${signal.asset}*\n`;
                message += `⏱ ${signal.timeframe}min | ${status}\n`;
                message += `━━━━━━━━━━━━━━\n`;
            });
        } else {
            message += `No hay señales activas.\n`;
        }

        await sendFastMessage(chatId, message);
        
    } catch (error) {
        await sendFastMessage(chatId, '⚠️ Error cargando señales.');
    }
}

async function handleFastVIP(chatId) {
    const message = `💎 *Plan VIP*\n\n• Todas las señales\n• Alertas instantáneas\n• Soporte prioritario\n\n*Precio: 5,000 CUP/mes*\n\n💬 Contacta: @Asche90`;
    
    await sendFastMessage(chatId, message, {
        reply_markup: {
            inline_keyboard: [[
                { text: '💬 CONTACTAR', url: 'https://t.me/Asche90' }
            ]]
        }
    });
}

async function handleFastWebApp(chatId, userId) {
    const webAppUrl = `${RENDER_URL}?tgid=${userId}`;
    const message = `🌐 *Plataforma Web*\n\nAccede a señales en tiempo real:`;
    
    await sendFastMessage(chatId, message, {
        reply_markup: {
            inline_keyboard: [[
                { text: '🚀 ABRIR PLATAFORMA', web_app: { url: webAppUrl } }
            ]]
        }
    });
}

async function handleFastHelp(chatId) {
    await sendFastMessage(chatId, '❓ *Ayuda*\n\nPara soporte contacta: @Asche90');
}

// =============================================
// SISTEMA DE NOTIFICACIONES ULTRA-RÁPIDO
// =============================================

console.log('🔔 [BOT] Activando notificaciones ULTRA-RÁPIDAS...');

// Suscripción a señales - ENVÍO INMEDIATO
const signalsChannel = supabase
    .channel('ultra-fast-bot-signals')
    .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'signals' }, 
        async (payload) => {
            console.log('⚡ [BOT] Señal detectada - Enviando INMEDIATAMENTE');
            await broadcastSignalUltraFast(payload.new);
        }
    )
    .subscribe();

async function broadcastSignalUltraFast(signal) {
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

*¡Actúa rápido!* ⚡
        `;

        // Enviar a todos los usuarios VIP inmediatamente
        const vipUsers = users.filter(user => user.is_vip);
        const freeUsers = users.filter(user => !user.is_vip && user.free_signals_used === 0);

        const recipients = signal.is_free ? [...vipUsers, ...freeUsers] : vipUsers;

        console.log(`📨 [BOT] Enviando a ${recipients.length} usuarios`);

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

    const message = `🚀 *SESIÓN INICIADA*\n\n¡La sesión de trading ha comenzado! Prepárate para las señales. ⚡`;
    
    users.forEach(user => {
        sendFastMessage(user.telegram_id, message).catch(() => null);
    });
}

async function broadcastSessionEnd() {
    const { data: users } = await supabase.from('users').select('telegram_id');
    if (!users) return;

    const message = `🏁 *SESIÓN FINALIZADA*\n\nLa sesión de trading ha terminado. ¡Gracias por participar!`;
    
    users.forEach(user => {
        sendFastMessage(user.telegram_id, message).catch(() => null);
    });
}

// =============================================
// INICIALIZACIÓN COMPLETADA
// =============================================

bot.getMe().then((me) => {
    console.log('🎉 === BOT ULTRA-RÁPIDO OPERATIVO ===');
    console.log(`🤖 Bot: @${me.username}`);
    console.log('⚡ Sistema listo - Señales en milisegundos');
});

module.exports = bot;
