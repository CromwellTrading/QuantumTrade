const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
require('dotenv').config();

// =============================================
// CONFIGURACIÓN
// =============================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_ID = process.env.ADMIN_ID || '5376388604';
const RENDER_URL = process.env.RENDER_URL || 'https://quantumtrade-ie33.onrender.com';

console.log('=== 🤖 INICIANDO BOT CORREGIDO ===');

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

// Configurar Express para el endpoint de notificaciones
const app = express();
app.use(express.json());
const NOTIFICATION_PORT = process.env.NOTIFICATION_PORT || 3001;

// =============================================
// CACHE Y SISTEMA DE DEDUPLICACIÓN
// =============================================

const userCache = new Map();
const signalCache = new Map();
const processedSignals = new Set(); // ✅ NUEVO: Para evitar duplicados
const processedResults = new Set(); // ✅ NUEVO: Para evitar resultados duplicados

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
                    url: `https://t.me/Quantum_PaymentBot`
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
        // Si el usuario bloqueó el bot o no inició chat, no mostrar error
        if (error.response && error.response.statusCode === 403) {
            console.log(`⚠️ [BOT] Usuario ${chatId} bloqueó el bot`);
            return false;
        }
        if (error.response && error.response.statusCode === 400) {
            console.log(`⚠️ [BOT] Chat no iniciado con usuario ${chatId}`);
            return false;
        }
        
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
// MANEJADORES PRINCIPALES - COMPLETOS
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
        free_signals_used: 0, // Inicializar contador de señales free
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
// MANEJADORES DE COMANDOS MEJORADOS - COMPLETOS
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
    const message = `💎 *PLAN VIP - ACCESO COMPLETO*\n\n✨ *Beneficios Exclusivos:*\n\n• ✅ Todas las señales ilimitadas\n• ⚡ Alertas instantáneas\n• 🎯 Señales premium\n• 📊 Estadísticas avanzadas\n• 🔔 Soporte prioritario\n• 📈 Mejores oportunidades\n\n💰 *Inversión:* 10 USDT/mes\n\n👤 *Tu ID:* \`${userId}\`\n\n*¡Solicita tu acceso VIP ahora!* 🚀`;
    
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
// SISTEMA DE NOTIFICACIONES CORREGIDO - SIN DUPLICADOS
// =============================================

console.log('🔔 [BOT] Activando notificaciones con sistema anti-duplicados...');

// ✅ CORRECCIÓN: Suscripción única con manejo de duplicados
let signalsSubscription = null;

function setupRealtimeSubscription() {
    // ✅ Evitar múltiples suscripciones
    if (signalsSubscription) {
        console.log('🔄 [BOT] Suscripción ya activa, cerrando anterior...');
        signalsSubscription.unsubscribe();
    }

    signalsSubscription = supabase
        .channel('bot-signals-single-channel') // ✅ Nombre único
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'signals' 
            }, 
            async (payload) => {
                console.log('⚡ [BOT] Nueva señal detectada:', payload.new.id);
                
                // ✅ Verificar si ya procesamos esta señal
                if (processedSignals.has(payload.new.id)) {
                    console.log(`✅ [BOT] Señal ${payload.new.id} ya procesada, omitiendo.`);
                    return;
                }
                
                // ✅ Marcar como procesada
                processedSignals.add(payload.new.id);
                
                await broadcastSignalWithID(payload.new);
            }
        )
        .on('postgres_changes',
            { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'signals' 
            },
            async (payload) => {
                console.log('🔄 [BOT] Señal actualizada:', payload.new.id, 'Estado:', payload.new.status);
                
                // ✅ SOLO procesar si cambió a profit/loss Y no es duplicado
                const isResultChange = (payload.new.status === 'profit' || payload.new.status === 'loss') && 
                                     payload.old.status !== payload.new.status;
                
                if (!isResultChange) {
                    console.log(`ℹ️ [BOT] Cambio no relevante para señal ${payload.new.id}, omitiendo.`);
                    return;
                }
                
                // ✅ Verificar si ya procesamos este resultado
                const resultKey = `${payload.new.id}_${payload.new.status}`;
                if (processedResults.has(resultKey)) {
                    console.log(`✅ [BOT] Resultado ${resultKey} ya procesado, omitiendo.`);
                    return;
                }
                
                // ✅ Marcar como procesado
                processedResults.add(resultKey);
                
                await broadcastSignalResult(payload.new);
            }
        )
        .subscribe((status) => {
            console.log('📡 [BOT] Estado de suscripción:', status);
            if (status === 'SUBSCRIBED') {
                console.log('✅ [BOT] Suscripción ÚNICA activada correctamente');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('❌ [BOT] Error en la suscripción');
                // ✅ Reintentar después de 5 segundos
                setTimeout(() => {
                    console.log('🔄 [BOT] Reintentando suscripción...');
                    setupRealtimeSubscription();
                }, 5000);
            } else if (status === 'TIMED_OUT') {
                console.error('❌ [BOT] Suscripción timeout');
                setTimeout(() => {
                    console.log('🔄 [BOT] Reintentando suscripción...');
                    setupRealtimeSubscription();
                }, 5000);
            }
        });
}

// ✅ Inicializar suscripción
setupRealtimeSubscription();

// ✅ Limpiar cache de procesados cada hora para evitar crecimiento excesivo
setInterval(() => {
    console.log('🧹 [BOT] Limpiando cache de señales procesadas...');
    const now = Date.now();
    
    // Mantener solo las señales de las últimas 24 horas
    processedSignals.clear();
    processedResults.clear();
    
}, 60 * 60 * 1000); // Cada hora

// FUNCIÓN MEJORADA PARA ENVÍO DE SEÑALES
async function broadcastSignalWithID(signal) {
    try {
        console.log(`📨 [BOT] Procesando señal ${signal.id} - FREE: ${signal.is_free}`);
        
        // Obtener todos los usuarios
        const { data: users, error } = await supabase
            .from('users')
            .select('telegram_id, is_vip, free_signals_used');
        
        if (error || !users) {
            console.error('❌ [BOT] Error obteniendo usuarios:', error);
            return;
        }

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

        // Lógica de envío de señales
        let recipients = [];
        let freeUsersToUpdate = [];

        if (signal.is_free) {
            // Señal FREE: enviar a VIPs + usuarios FREE que no han usado su señal
            const vipUsers = users.filter(user => user.is_vip);
            const freeUsers = users.filter(user => !user.is_vip && (user.free_signals_used === 0 || !user.free_signals_used));
            
            recipients = [...vipUsers, ...freeUsers];
            freeUsersToUpdate = freeUsers;
            
            console.log(`📨 [BOT] Señal FREE - VIPs: ${vipUsers.length}, FREE Users: ${freeUsers.length}`);
            
        } else {
            // Señal VIP: solo enviar a usuarios VIP
            recipients = users.filter(user => user.is_vip);
            console.log(`📨 [BOT] Señal VIP - VIPs: ${recipients.length}`);
        }

        console.log(`📨 [BOT] Enviando señal ${signal.id} a ${recipients.length} usuarios`);

        // Enviar mensajes en paralelo
        const sendPromises = recipients.map(user => 
            sendFastMessage(user.telegram_id, message).catch(() => null)
        );

        await Promise.all(sendPromises);

        // ✅ ACTUALIZAR free_signals_used EN EL SERVIDOR
        if (signal.is_free && freeUsersToUpdate.length > 0) {
            const updatePromises = freeUsersToUpdate.map(async (user) => {
                try {
                    const response = await fetch(`${RENDER_URL}/api/users/update-free-signals`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            telegramId: user.telegram_id,
                            freeSignalsUsed: 1
                        })
                    });
                    
                    if (!response.ok) {
                        console.error(`❌ [BOT] Error actualizando free_signals_used para ${user.telegram_id}`);
                    }
                } catch (error) {
                    console.error(`❌ [BOT] Error en actualización para ${user.telegram_id}:`, error);
                }
            });

            await Promise.all(updatePromises);
            console.log(`✅ [BOT] ${freeUsersToUpdate.length} usuarios actualizados con free_signals_used = 1`);
        }

    } catch (error) {
        console.error('❌ [BOT] Error en broadcastSignalWithID:', error);
    }
}

// FUNCIÓN MEJORADA PARA RESULTADOS DE SEÑALES
async function broadcastSignalResult(signal) {
    try {
        console.log(`📊 [BOT] Enviando resultado de señal ${signal.id} - ${signal.status}`);
        
        // Solo notificar si la señal tiene un resultado (profit/loss)
        if (signal.status !== 'profit' && signal.status !== 'loss') return;

        // Obtener todos los usuarios
        const { data: users, error } = await supabase
            .from('users')
            .select('telegram_id');

        if (error || !users) {
            console.error('❌ [BOT] Error obteniendo usuarios para resultados:', error);
            return;
        }

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

        console.log(`✅ [BOT] Resultado de señal ${signal.id} enviado correctamente`);

    } catch (error) {
        console.error('❌ [BOT] Error enviando resultado:', error);
    }
}

// =============================================
// ENDPOINT PARA NOTIFICACIONES DESDE LA WEBAPP - COMPLETO
// =============================================

// Endpoint para recibir notificaciones desde la webapp
app.post('/api/telegram/notify', async (req, res) => {
    try {
        const { message, type, userId } = req.body;
        
        console.log('📨 [BOT] Notificación recibida desde webapp:', { type, userId });
        
        // Verificar si es admin
        if (userId !== ADMIN_ID) {
            return res.status(403).json({ 
                success: false, 
                error: 'Solo el admin puede enviar notificaciones' 
            });
        }
        
        // ✅ RESETEAR free_signals_used CUANDO INICIA SESIÓN
        if (type === 'session_start') {
            console.log('🔄 [BOT] Reseteando free_signals_used para todos los usuarios');
            
            try {
                const response = await fetch(`${RENDER_URL}/api/users/reset-free-signals`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId: ADMIN_ID
                    })
                });
                
                if (response.ok) {
                    console.log('✅ [BOT] free_signals_used reseteado exitosamente');
                } else {
                    console.error('❌ [BOT] Error en respuesta del servidor al resetear free_signals_used');
                }
            } catch (error) {
                console.error('❌ [BOT] Error reseteando free_signals_used:', error);
            }
        }
        
        // Obtener todos los usuarios
        const { data: users, error } = await supabase
            .from('users')
            .select('telegram_id');
            
        if (error) {
            throw error;
        }
        
        if (!users || users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'No hay usuarios registrados' 
            });
        }
        
        console.log(`📨 [BOT] Enviando notificación ${type} a ${users.length} usuarios`);
        
        // Enviar a todos los usuarios
        const sendPromises = users.map(user => 
            sendFastMessage(user.telegram_id, message).catch(error => {
                console.error(`❌ [BOT] Error enviando a ${user.telegram_id}:`, error.message);
                return null;
            })
        );
        
        await Promise.all(sendPromises);
        
        res.json({ 
            success: true, 
            message: `Notificación enviada a ${users.length} usuarios` 
        });
        
    } catch (error) {
        console.error('❌ [BOT] Error en endpoint de notificación:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

// Iniciar servidor de notificaciones
app.listen(NOTIFICATION_PORT, () => {
    console.log(`🔔 [BOT] Servidor de notificaciones en puerto ${NOTIFICATION_PORT}`);
});

// =============================================
// COMANDOS DE ADMIN PARA RESULTADOS - COMPLETOS
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
// COMANDO PARA RESETEAR SEÑALES FREE (Solo admin)
// =============================================

bot.onText(/\/reset_free/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    // Verificar si es admin
    if (userId !== ADMIN_ID) {
        await sendFastMessage(chatId, '❌ No tienes permisos para usar este comando.');
        return;
    }

    try {
        const response = await fetch(`${RENDER_URL}/api/users/reset-free-signals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: ADMIN_ID
            })
        });

        if (response.ok) {
            await sendFastMessage(chatId, '✅ free_signals_used reseteado para todos los usuarios');
        } else {
            await sendFastMessage(chatId, '❌ Error reseteando free_signals_used');
        }
        
    } catch (error) {
        console.error('Error reseteando free_signals_used:', error);
        await sendFastMessage(chatId, '❌ Error reseteando free_signals_used');
    }
});

// =============================================
// INICIALIZACIÓN COMPLETADA
// =============================================

bot.getMe().then((me) => {
    console.log('🎉 === BOT CORREGIDO OPERATIVO ===');
    console.log(`🤖 Bot: @${me.username}`);
    console.log('📊 Sistema anti-duplicados activado');
    console.log('✅ Una sola suscripción activa');
    console.log('✅ Cache de señales procesadas');
    console.log('✅ Filtrado de eventos irrelevantes');
    console.log('⚡ Comandos admin: /resultado <ID> <profit/loss>');
    console.log('⚡ Comandos admin: /pendientes');
    console.log('⚡ Comando admin: /reset_free');
    console.log('🔔 Endpoint notificaciones activo en puerto:', NOTIFICATION_PORT);
    console.log('🕙 Horarios: 10AM y 10PM');
    console.log('🎁 Primera señal gratis por sesión');
});

module.exports = bot;
