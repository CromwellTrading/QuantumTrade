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
const BOT_USERNAME = 'QuantumQvabot'; // NUEVO: Nombre del bot

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
                [{ text: '🌐 WEBAPP' }, { text: '👥 REFERIDOS' }],
                [{ text: '🏢 BROKER' }, { text: '❓ AYUDA' }],
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
                    url: `https://t.me/Asche90`
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
    await supabase.from('users').upsert({
        telegram_id: userId,
        username: msg.from.username,
        first_name: msg.from.first_name,
        free_signals_used: 0, // Inicializar contador de señales free
        preferred_broker: 'olymptrade', // Broker por defecto
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
        case '👥 REFERIDOS':
            await handleFastReferrals(chatId, userId);
            break;
        case '🏢 BROKER':
            await handleFastBroker(chatId, userId);
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
                const brokerName = signal.broker === 'olymptrade' ? 'OLYMPTRADE' : 'QUOTEX';
                
                message += `${arrow} *${signal.asset}*\n`;
                message += `⏱ ${signal.timeframe}min | ${status}\n`;
                message += `🏢 ${brokerName} | 🕐 ${time}\n`;
                message += `ID: ${signal.id}\n`;
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
    const message = `💎 *PLAN VIP - ACCESO COMPLETO*\n\n✨ *Beneficios Exclusivos:*\n\n• ✅ Todas las señales ilimitadas\n• ⚡ Alertas instantáneas\n• 🎯 Señales premium\n• 📊 Estadísticas avanzadas\n• 🔔 Soporte prioritario\n• 📈 Mejores oportunidades\n\n💰 *Inversión:* 5000 CUP/mes (30 días)\n\n👤 *Tu ID:* \`${userId}\`\n\n*¡Solicita tu acceso VIP ahora!* 🚀`;
    
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

async function handleFastReferrals(chatId, userId) {
    try {
        const response = await fetch(`${RENDER_URL}/api/referrals/${userId}`);
        const result = await response.json();
        
        if (!result.success) {
            await sendFastMessage(chatId, '❌ Error al cargar información de referidos. Intenta nuevamente.');
            return;
        }
        
        const { stats, discount, bonus, next_month_free } = result.data;
        const referralLink = `https://t.me/QuantumQvabot?start=ref_${userId}`;
        
        let message = `👥 *SISTEMA DE REFERIDOS*\n\n`;
        message += `*Tu enlace de referido:*\n\`${referralLink}\`\n\n`;
        message += `*Estadísticas:*\n`;
        message += `• 📊 Total referidos: ${stats.total || 0}\n`;
        message += `• 💎 Referidos VIP: ${stats.vip || 0}\n`;
        message += `• 👤 Referidos regulares: ${stats.regular || 0}\n\n`;
        
        message += `*Beneficios acumulados:*\n`;
        message += `• 🎫 Descuento del ${discount || 0}% para el próximo mes\n`;
        
        if (next_month_free) {
            message += `• 🎁 *¡PRÓXIMO MES GRATIS!* (10+ referidos VIP)\n`;
        }
        
        if (bonus) {
            message += `• 💰 *BONO:* ${bonus}\n`;
        }
        
        message += `\n*¿Cómo funciona?*\n`;
        message += `1. Comparte tu enlace con amigos\n`;
        message += `2. Cuando se registren con tu enlace, se convierten en tus referidos\n`;
        message += `3. Por cada referido VIP: +10% de descuento (máx 50%)\n`;
        message += `4. Con 10 referidos VIP: próximo mes GRATIS\n`;
        message += `5. Con 20 referidos VIP: 20 USDT de bono\n`;
        
        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { 
                            text: '📤 Compartir enlace', 
                            url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=¡Únete a Quantum Signal Trader! Señales de trading profesionales para opciones binarias. Regístrate con mi enlace:`
                        }
                    ]
                ]
            }
        };
        
        await sendFastMessage(chatId, message, keyboard);
        
    } catch (error) {
        console.error('❌ [BOT] Error en comando /referidos:', error);
        await sendFastMessage(chatId, '❌ Error al cargar información de referidos. Intenta nuevamente.');
    }
}

async function handleFastBroker(chatId, userId) {
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { 
                        text: '🏢 OLYMPTRADE', 
                        callback_data: 'broker_olymptrade'
                    },
                    { 
                        text: '📊 QUOTEX', 
                        callback_data: 'broker_quotex'
                    }
                ],
                [
                    { 
                        text: 'ℹ️ Ver mi broker actual', 
                        callback_data: 'view_current_broker'
                    }
                ]
            ]
        }
    };
    
    const message = `🏢 *SELECCIÓN DE BROKER*\n\nElige tu broker preferido para recibir señales:\n\n` +
                   `• *Olymptrade*: Plataforma regulada internacionalmente\n` +
                   `• *Quotex*: Plataforma moderna con múltiples activos\n\n` +
                   `*Nota:* Solo recibirás señales para el broker que selecciones.`;
    
    await sendFastMessage(chatId, message, keyboard);
}

async function handleFastHelp(chatId) {
    const message = `❓ *GUÍA COMPLETA - QUANTUM SIGNAL TRADER*\n\n*¿CÓMO FUNCIONA?*\n\n🤖 *EL BOT:*\n• Envía señales de trading automáticamente\n• Opera con opciones binarias\n• Horarios: 10AM y 10PM\n• Primera señal GRATIS por sesión\n\n📱 *BOTONES PRINCIPALES:*\n\n📈 *SEÑALES:*\nMuestra las últimas señales enviadas\n\n💎 *VIP:*\nAcceso a todas las señales ilimitadas\n\n🌐 *WEBAPP:*\nPlataforma web con interfaz completa\n\n👥 *REFERIDOS:*\nSistema de referidos con beneficios\n\n🏢 *BROKER:*\nSelecciona tu broker preferido\n\n❓ *AYUDA:*\nEsta guía de uso\n\nℹ️ *INFORMACIÓN:*\nDetalles del sistema\n\n📊 *PLATAFORMA:*\nEnlace para registrarse\n\n⚡ *PARA RECIBIR SEÑALES:*\n1. Selecciona tu broker (botón 🏢 BROKER)\n2. Abre la WEBAPP (botón 🌐 WEBAPP)\n3. Toca \"PREPARADOS\" para activar alertas\n4. Recibe señales automáticamente\n5. Opera en tu broker seleccionado\n\n📅 *HORARIOS DE SESIONES:*\n🕙 10:00 AM - Sesión Matutina\n🕙 10:00 PM - Sesión Nocturna\n\n🎁 *LA PRIMERA SEÑAL DE CADA SESIÓN ES GRATIS*\n\n🔗 *PLATAFORMAS DISPONIBLES:*\n• Olymptrade - Regulada internacionalmente\n• Quotex - Plataforma moderna\n\n*¡Éxitos en tus operaciones!* 🚀`;
    
    await sendFastMessage(chatId, message);
}

async function handleFastInfo(chatId) {
    const message = `ℹ️ *INFORMACIÓN DEL SISTEMA*\n\n*QUANTUM SIGNAL TRADER PRO*\n\n🎯 *Qué Hacemos:*\nProveemos señales de trading automatizadas para opciones binarias con alta precisión.\n\n⏰ *Horarios Operativos:*\n• 🕙 10:00 AM - Sesión Matutina\n• 🕙 10:00 PM - Sesión Nocturna\n\n💰 *Modelo de Servicio:*\n• 🎁 Primera señal de cada sesión: GRATIS\n• 💎 Acceso completo: Plan VIP (5000 CUP/mes)\n\n📊 *Características Técnicas:*\n• 🤖 Bot completamente automatizado\n• ⚡ Señales en tiempo real\n• 📱 Plataforma web responsive\n• 🔔 Sistema de alertas instantáneas\n• 📈 Panel de estadísticas\n• 🏢 Soporte para múltiples brokers\n• 👥 Sistema de referidos\n\n🎯 *Recomendaciones:*\n• Opera con capital que puedas arriesgar\n• Usa gestión de riesgo\n• Sigue las señales disciplinadamente\n• La primera señal de cada sesión es gratuita\n\n*¡Trading responsable y exitoso!* 📈`;
    
    await sendFastMessage(chatId, message);
}

async function handleFastPlatform(chatId) {
    const message = `📊 *PLATAFORMAS DE TRADING DISPONIBLES*\n\n*ELIGE TU BROKER PREFERIDO:*\n\n🏢 *OLYMPTRADE* - Plataforma Regulada\n• 📈 Regulada internacionalmente\n• 💰 Múltiples métodos de pago\n• 📱 App móvil disponible\n• 🎯 Interfaz intuitiva\n• 🔒 Seguridad garantizada\n• 💵 Depósito Mínimo: $10\n\n📊 *QUOTEX* - Plataforma Moderna\n• 🚀 Tecnología avanzada\n• 📊 Gráficos profesionales\n• 💎 Múltiples activos\n• 📱 App optimizada\n• 🔐 Seguridad avanzada\n• 💵 Depósito Mínimo: $10\n\n*Selecciona tu broker en el menú principal (botón 🏢 BROKER)*`;
    
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { 
                        text: '🚀 REGISTRARSE EN OLYMPTRADE', 
                        url: 'https://olymptrade.com/pages/referral/?rf=108107566'
                    }
                ],
                [
                    { 
                        text: '📊 REGISTRARSE EN QUOTEX', 
                        url: 'https://qxbroker.com/es/promo/partner/108107566?qa=signals'
                    }
                ]
            ]
        }
    };
    
    await sendFastMessage(chatId, message, keyboard);
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
        console.log(`📨 [BOT] Procesando señal ${signal.id} - FREE: ${signal.is_free} - BROKER: ${signal.broker}`);
        
        // Obtener todos los usuarios
        const { data: users, error } = await supabase
            .from('users')
            .select('telegram_id, is_vip, free_signals_used, preferred_broker');
        
        if (error || !users) {
            console.error('❌ [BOT] Error obteniendo usuarios:', error);
            return;
        }

        const arrow = signal.direction === 'up' ? '🟢' : '🔴';
        const brokerName = signal.broker === 'olymptrade' ? 'Olymptrade' : 'Quotex';
        const message = `
🎯 *SEÑAL DETECTADA* 🎯

${arrow} *${signal.asset}*
📈 ${signal.direction === 'up' ? 'ALZA (CALL)' : 'BAJA (PUT)'}
⏱ ${signal.timeframe} minutos
${signal.is_free ? '🎯 GRATIS' : '💎 VIP'}
🏢 *Broker:* ${brokerName}

*ID: ${signal.id}*

*¡Actúa rápido!* ⚡
        `;

        // Lógica de envío de señales
        let recipients = [];
        let freeUsersToUpdate = [];

        if (signal.is_free) {
            // Señal FREE: enviar a usuarios NO VIP con el mismo broker y que no hayan usado su señal gratis
            const freeUsers = users.filter(user => 
                !user.is_vip && 
                (user.preferred_broker === signal.broker) && 
                (user.free_signals_used === 0 || !user.free_signals_used)
            );
            
            recipients = freeUsers;
            freeUsersToUpdate = freeUsers;
            
            console.log(`📨 [BOT] Señal FREE - FREE Users (mismo broker): ${freeUsers.length}`);
            
        } else {
            // Señal VIP: solo enviar a usuarios VIP con el mismo broker
            recipients = users.filter(user => 
                user.is_vip && 
                user.preferred_broker === signal.broker
            );
            console.log(`📨 [BOT] Señal VIP - VIPs (mismo broker): ${recipients.length}`);
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

        // Obtener todos los usuarios que recibieron esta señal
        const { data: users, error } = await supabase
            .from('users')
            .select('telegram_id, preferred_broker')
            .eq('preferred_broker', signal.broker);

        if (error || !users) {
            console.error('❌ [BOT] Error obteniendo usuarios para resultados:', error);
            return;
        }

        const resultEmoji = signal.status === 'profit' ? '💰' : '📉';
        const resultText = signal.status === 'profit' ? 'PROFIT' : 'LOSS';
        const resultColor = signal.status === 'profit' ? '🟢' : '🔴';
        const brokerName = signal.broker === 'olymptrade' ? 'Olymptrade' : 'Quotex';

        const message = `
${resultColor} *RESULTADO DE SEÑAL* ${resultColor}

📊 *${signal.asset}*
🏢 ${brokerName}
🎯 Resultado: *${resultText}* ${resultEmoji}
⏱ Duración: ${signal.timeframe} minutos

*ID: ${signal.id}*

${signal.status === 'profit' ? '¡Operación ganadora! 🎉' : 'Operación cerrada. Siguiente oportunidad 💪'}
        `;

        console.log(`📨 [BOT] Enviando resultado ${signal.status} para señal ${signal.id} a ${users.length} usuarios de ${brokerName}`);

        // Enviar a todos los usuarios con este broker
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
// FUNCIÓN PARA ALERTAS DE ACTIVO PREVIO
// =============================================

async function broadcastPreviewAsset(asset, broker) {
    try {
        console.log(`👁️ [BOT] Enviando alerta de activo previo: ${asset} para ${broker}`);
        
        // Obtener usuarios VIP con el broker especificado
        const { data: users, error } = await supabase
            .from('users')
            .select('telegram_id, is_vip, preferred_broker')
            .eq('is_vip', true)
            .eq('preferred_broker', broker);
            
        if (error) {
            console.error('❌ [BOT] Error obteniendo usuarios VIP:', error);
            return;
        }
        
        if (!users || users.length === 0) {
            console.log(`ℹ️ [BOT] No hay usuarios VIP para el broker ${broker}`);
            return;
        }
        
        const brokerName = broker === 'olymptrade' ? 'Olymptrade' : 'Quotex';
        const message = `👁️ *ALERTA DE ACTIVO* 👁️\n\n` +
                       `*Próxima señal para ${brokerName}*\n\n` +
                       `📊 *Activo:* ${asset}\n` +
                       `⏰ *Tiempo estimado:* 1-2 minutos\n\n` +
                       `*Prepárate para operar este activo!* ⚡\n` +
                       `Mantente atento a la señal...`;
        
        console.log(`👁️ [BOT] Enviando alerta a ${users.length} usuarios VIP de ${brokerName}`);
        
        // Enviar mensajes
        const sendPromises = users.map(user => 
            sendFastMessage(user.telegram_id, message).catch(error => {
                console.error(`❌ [BOT] Error enviando a ${user.telegram_id}:`, error.message);
                return null;
            })
        );
        
        await Promise.all(sendPromises);
        console.log(`✅ [BOT] Alerta de activo enviada correctamente`);
        
    } catch (error) {
        console.error('❌ [BOT] Error en broadcastPreviewAsset:', error);
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

// Endpoint para alertas de activo previo
app.post('/api/telegram/preview-asset', async (req, res) => {
    try {
        const { asset, broker, userId } = req.body;
        
        console.log('👁️ [BOT] Alerta de activo previo recibida:', { asset, broker, userId });
        
        // Verificar si es admin
        if (userId !== ADMIN_ID) {
            return res.status(403).json({ 
                success: false, 
                error: 'Solo el admin puede enviar alertas de activo' 
            });
        }
        
        // Enviar alerta
        await broadcastPreviewAsset(asset, broker);
        
        res.json({ 
            success: true, 
            message: `Alerta de activo enviada a VIPs de ${broker}: ${asset}`
        });
        
    } catch (error) {
        console.error('❌ [BOT] Error en endpoint de alerta de activo:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
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
                const brokerName = signal.broker === 'olymptrade' ? 'OLYMPTRADE' : 'QUOTEX';
                
                message += `${arrow} *${signal.asset}*\n`;
                message += `⏱ ${signal.timeframe}min | 🏢 ${brokerName} | ID: ${signal.id}\n`;
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
// CONFIGURACIÓN DE BROKERS
// =============================================

const BROKERS = {
    olimptrade: {
        name: 'Olymptrade',
        affiliate_link: 'https://olymptrade.com/pages/referral/?rf=108107566',
        description: 'Plataforma regulada internacionalmente'
    },
    quotex: {
        name: 'Quotex',
        affiliate_link: 'https://qxbroker.com/es/promo/partner/108107566?qa=signals',
        description: 'Plataforma moderna con múltiples activos'
    }
};

// =============================================
// MANEJADOR PARA BROKERS - ACTUALIZADO
// =============================================

bot.onText(/\/broker/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    const keyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { 
                        text: '🏢 OLYMPTRADE', 
                        callback_data: 'broker_olymptrade'
                    },
                    { 
                        text: '📊 QUOTEX', 
                        callback_data: 'broker_quotex'
                    }
                ],
                [
                    { 
                        text: 'ℹ️ Ver mi broker actual', 
                        callback_data: 'view_current_broker'
                    }
                ]
            ]
        }
    };
    
    const message = `🏢 *SELECCIÓN DE BROKER*\n\nElige tu broker preferido para recibir señales:\n\n` +
                   `• *Olymptrade*: Plataforma regulada internacionalmente\n` +
                   `• *Quotex*: Plataforma moderna con múltiples activos\n\n` +
                   `*Nota:* Solo recibirás señales para el broker que selecciones.`;
    
    await sendFastMessage(chatId, message, keyboard);
});

// Manejador para callback queries de brokers
bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id.toString();
    const data = callbackQuery.data;
    
    if (data.startsWith('broker_')) {
        const broker = data.replace('broker_', '');
        
        if (BROKERS[broker]) {
            try {
                // Actualizar broker en la base de datos
                const { error } = await supabase
                    .from('users')
                    .update({ 
                        preferred_broker: broker,
                        updated_at: new Date().toISOString()
                    })
                    .eq('telegram_id', userId);
                
                if (error) throw error;
                
                const brokerInfo = BROKERS[broker];
                const message = `✅ *Broker actualizado correctamente*\n\n` +
                               `Ahora recibirás señales para *${brokerInfo.name}*\n\n` +
                               `🔗 *Enlace de registro:* ${brokerInfo.affiliate_link}\n` +
                               `📝 *Descripción:* ${brokerInfo.description}\n\n` +
                               `*Nota:* Las señales serán específicas para este broker.`;
                
                await bot.answerCallbackQuery(callbackQuery.id, { text: '✅ Broker actualizado' });
                await sendFastMessage(chatId, message);
                
            } catch (error) {
                console.error('❌ [BOT] Error actualizando broker:', error);
                await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error al actualizar el broker' });
            }
        }
    } else if (data === 'view_current_broker') {
        try {
            const { data: user, error } = await supabase
                .from('users')
                .select('preferred_broker')
                .eq('telegram_id', userId)
                .single();
            
            if (error || !user) {
                await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error al obtener información' });
                return;
            }
            
            const currentBroker = user.preferred_broker || 'olymptrade';
            const brokerInfo = BROKERS[currentBroker];
            
            const message = `🏢 *TU BROKER ACTUAL*\n\n` +
                           `• *Broker:* ${brokerInfo.name}\n` +
                           `• *Estado:* ✅ Activado\n` +
                           `• *Descripción:* ${brokerInfo.description}\n\n` +
                           `*Nota:* Recibes señales específicas para ${brokerInfo.name}`;
            
            await bot.answerCallbackQuery(callbackQuery.id, { text: `Tu broker actual: ${brokerInfo.name}` });
            await sendFastMessage(chatId, message);
            
        } catch (error) {
            console.error('❌ [BOT] Error obteniendo broker actual:', error);
            await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error al obtener broker actual' });
        }
    }
});

// =============================================
// SISTEMA DE REFERIDOS EN EL BOT - ACTUALIZADO
// =============================================

bot.onText(/\/referidos/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    try {
        // Obtener información de referidos del servidor
        const response = await fetch(`${RENDER_URL}/api/referrals/${userId}`);
        const result = await response.json();
        
        if (!result.success) {
            await sendFastMessage(chatId, '❌ Error al cargar información de referidos. Intenta nuevamente.');
            return;
        }
        
        const { stats, discount, bonus, next_month_free } = result.data;
        const referralLink = `https://t.me/QuantumQvabot?start=ref_${userId}`;
        
        let message = `👥 *SISTEMA DE REFERIDOS*\n\n`;
        message += `*Tu enlace de referido:*\n\`${referralLink}\`\n\n`;
        message += `*Estadísticas:*\n`;
        message += `• 📊 Total referidos: ${stats.total || 0}\n`;
        message += `• 💎 Referidos VIP: ${stats.vip || 0}\n`;
        message += `• 👤 Referidos regulares: ${stats.regular || 0}\n\n`;
        
        message += `*Beneficios acumulados:*\n`;
        message += `• 🎫 Descuento del ${discount || 0}% para el próximo mes\n`;
        
        if (next_month_free) {
            message += `• 🎁 *¡PRÓXIMO MES GRATIS!* (10+ referidos VIP)\n`;
        }
        
        if (bonus) {
            message += `• 💰 *BONO:* ${bonus}\n`;
        }
        
        message += `\n*¿Cómo funciona?*\n`;
        message += `1. Comparte tu enlace con amigos\n`;
        message += `2. Cuando se registren con tu enlace, se convierten en tus referidos\n`;
        message += `3. Por cada referido VIP: +10% de descuento (máx 50%)\n`;
        message += `4. Con 10 referidos VIP: próximo mes GRATIS\n`;
        message += `5. Con 20 referidos VIP: 20 USDT de bono\n`;
        
        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { 
                            text: '📤 Compartir enlace', 
                            url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=¡Únete a Quantum Signal Trader! Señales de trading profesionales para opciones binarias. Regístrate con mi enlace:`
                        }
                    ]
                ]
            }
        };
        
        await sendFastMessage(chatId, message, keyboard);
        
    } catch (error) {
        console.error('❌ [BOT] Error en comando /referidos:', error);
        await sendFastMessage(chatId, '❌ Error al cargar información de referidos. Intenta nuevamente.');
    }
});

// Manejador para inicio con enlace de referido
bot.onText(/\/start ref_(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const referrerId = match[1];
    const userName = msg.from.first_name || 'Usuario';
    
    console.log(`🔗 [BOT] Usuario ${userId} registrado por referido de ${referrerId}`);
    
    try {
        // Guardar usuario en BD
        await supabase.from('users').upsert({
            telegram_id: userId,
            username: msg.from.username,
            first_name: msg.from.first_name,
            preferred_broker: 'olymptrade',
            free_signals_used: 0,
            referred_by: referrerId,
            created_at: new Date().toISOString()
        });
        
        console.log(`✅ [BOT] Usuario ${userId} guardado en BD`);
        
        // Registrar referido
        const response = await fetch(`${RENDER_URL}/api/referrals/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                referrerId: referrerId,
                referredId: userId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ [BOT] Referido registrado: ${userId} por ${referrerId}`);
            
            // Notificar al referidor
            const referrerMessage = `🎉 *¡NUEVO REFERIDO!*\n\n` +
                                  `• 👤 Usuario: ${userName}\n` +
                                  `• 🆔 ID: \`${userId}\`\n` +
                                  `• 📅 Fecha: ${new Date().toLocaleString()}\n\n` +
                                  `¡Gracias por compartir Quantum Signal Trader!`;
            
            await sendFastMessage(referrerId, referrerMessage);
        }
        
    } catch (error) {
        console.error('❌ [BOT] Error registrando referido:', error);
    }
    
    const welcomeMessage = `🤖 *Quantum Signal Trader Pro*\n\n` +
                          `¡Hola *${userName}*! 👋\n\n` +
                          `*Registrado por referido de:* \`${referrerId}\`\n\n` +
                          `🎯 *Sistema Profesional de Señales*:\n` +
                          `• 🤖 Bot automatizado\n` +
                          `• ⚡ Señales en tiempo real\n` +
                          `• 💰 Opciones binarias\n` +
                          `• 📊 Plataforma web integrada\n\n` +
                          `📈 *Horarios de Sesiones*:\n` +
                          `🕙 10:00 AM - Sesión Matutina\n` +
                          `🕙 10:00 PM - Sesión Nocturna\n\n` +
                          `🎁 *La primera señal de cada sesión es GRATIS*`;
    
    await sendFastMessage(chatId, welcomeMessage, createMainKeyboard());
});

// =============================================
// ENDPOINT PARA NOTIFICACIONES DE REFERIDOS
// =============================================

app.post('/api/telegram/notify-referral', async (req, res) => {
    try {
        const { referrerId, referredId, isVip } = req.body;
        
        console.log('👥 [BOT] Notificación de referido recibida:', { referrerId, referredId, isVip });
        
        if (isVip) {
            const message = `🎉 *¡REFERIDO VIP!*\n\n` +
                          `Uno de tus referidos se ha convertido en VIP 🎊\n\n` +
                          `• 🆔 ID del referido: \`${referredId}\`\n` +
                          `• 💎 Estado: Usuario VIP\n` +
                          `• 🎁 Beneficio: +10% de descuento acumulado\n\n` +
                          `¡Gracias por recomendar Quantum Signal Trader!`;
            
            await sendFastMessage(referrerId, message);
        }
        
        res.json({ 
            success: true, 
            message: 'Notificación de referido enviada' 
        });
        
    } catch (error) {
        console.error('❌ [BOT] Error en endpoint de notificación de referido:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
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
    console.log(`🔗 Enlace: https://t.me/${me.username}`);
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
    console.log('🏢 Brokers soportados: Olymptrade, Quotex');
    console.log('👥 Sistema de referidos activo');
});

// Iniciar servidor de notificaciones
app.listen(NOTIFICATION_PORT, () => {
    console.log(`🔔 [BOT] Servidor de notificaciones en puerto ${NOTIFICATION_PORT}`);
});

module.exports = bot;
