const express = require('express');
const path = require('path');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// CONFIGURACIÓN
// =============================================

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_ID = process.env.ADMIN_ID || '5376388604';
const RENDER_URL = process.env.RENDER_URL || 'https://quantumtrade-ie33.onrender.com';

console.log('=== 🚀 INICIANDO QUANTUM SIGNAL TRADER PRO ===');
console.log('📋 Verificando variables de entorno:');
console.log('- TELEGRAM_BOT_TOKEN:', TELEGRAM_BOT_TOKEN ? '✅ PRESENTE' : '❌ FALTANTE');
console.log('- SUPABASE_URL:', SUPABASE_URL ? '✅ PRESENTE' : '❌ FALTANTE');
console.log('- SUPABASE_KEY:', SUPABASE_KEY ? '✅ PRESENTE' : '❌ FALTANTE');
console.log('- ADMIN_ID:', ADMIN_ID);
console.log('- RENDER_URL:', RENDER_URL);

// Verificar configuración
if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERROR: Faltan variables de entorno críticas');
    process.exit(1);
}

// =============================================
// INICIALIZACIÓN DE SUPABASE
// =============================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log('✅ Supabase inicializado');

// =============================================
// INICIALIZACIÓN DEL BOT DE TELEGRAM
// =============================================

console.log('🤖 Inicializando bot de Telegram...');

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
    console.log('✅ Bot de Telegram creado exitosamente');
} catch (error) {
    console.error('❌ ERROR CRÍTICO al crear el bot:', error);
    process.exit(1);
}

// =============================================
// FUNCIONES AUXILIARES DEL BOT
// =============================================

// Función para crear teclado principal
function createMainKeyboard() {
    return {
        reply_markup: {
            resize_keyboard: true,
            keyboard: [
                [
                    { text: '📊 VER SEÑALES' },
                    { text: '💎 PLAN VIP' }
                ],
                [
                    { text: '👤 MI ESTADO' },
                    { text: '🌐 ABRIR WEBAPP' }
                ],
                [
                    { text: '🆘 AYUDA' },
                    { text: '📞 CONTACTO' }
                ]
            ]
        }
    };
}

// Función para crear teclado inline para VIP
function createVIPInlineKeyboard() {
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    { 
                        text: '💳 CONTACTAR PARA VIP', 
                        url: 'https://t.me/Asche90' 
                    }
                ]
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
        console.log('✅ Notificación enviada a:', chatId);
    } catch (error) {
        console.error('❌ Error enviando notificación:', error);
    }
}

// =============================================
// MANEJADORES DEL BOT
// =============================================

// Configurar manejadores de eventos del bot
function setupBotHandlers() {
    console.log('🔄 Configurando manejadores del bot...');

    // Manejar errores del bot
    bot.on('polling_error', (error) => {
        console.error('❌ Error de polling del bot:', error.message);
        
        if (error.code === 409) {
            console.log('🔄 Conflicto detectado, reiniciando bot...');
            setTimeout(() => {
                bot.stopPolling();
                setTimeout(() => bot.startPolling(), 2000);
            }, 5000);
        }
    });

    bot.on('error', (error) => {
        console.error('❌ Error general del bot:', error);
    });

    // COMANDO /start
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        
        console.log(`📨 /start recibido de ${userId}`);

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
🎯 *BIENVENIDO A QUANTUM SIGNAL TRADER PRO* 🚀

*Sistema avanzado de señales de trading en tiempo real*

Usa los botones de abajo para navegar por el sistema:
            `;
            
            await sendNotification(chatId, welcomeMessage, createMainKeyboard());
            
        } catch (error) {
            console.error('Error en /start:', error);
            await sendNotification(chatId, '❌ Error al procesar tu solicitud. Intenta nuevamente.');
        }
    });

    // MANEJAR BOTONES DEL TECLADO
    bot.on('message', async (msg) => {
        if (msg.text && msg.text.startsWith('/')) return;
        
        const chatId = msg.chat.id;
        const messageText = msg.text;
        const userId = msg.from.id.toString();

        console.log(`📨 Mensaje de ${userId}: ${messageText}`);

        try {
            switch (messageText) {
                case '📊 VER SEÑALES':
                    await handleViewSignals(chatId, userId);
                    break;
                    
                case '💎 PLAN VIP':
                    await handleVIPInfo(chatId);
                    break;
                    
                case '👤 MI ESTADO':
                    await handleUserStatus(chatId, userId);
                    break;
                    
                case '🌐 ABRIR WEBAPP':
                    await handleWebApp(chatId);
                    break;
                    
                case '🆘 AYUDA':
                    await handleHelp(chatId);
                    break;
                    
                case '📞 CONTACTO':
                    await handleContact(chatId);
                    break;
                    
                default:
                    if (!messageText.startsWith('/')) {
                        await sendNotification(chatId, 
                            'Usa los botones del menú para navegar por el sistema:',
                            createMainKeyboard()
                        );
                    }
                    break;
            }
        } catch (error) {
            console.error('Error procesando mensaje:', error);
            await sendNotification(chatId, '❌ Error al procesar tu solicitud.');
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
                    
                default:
                    console.log('Callback no manejado:', data);
            }

            await bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
            console.error('Error en callback:', error);
            await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error al procesar la solicitud' });
        }
    });

    console.log('✅ Manejadores del bot configurados');
}

// =============================================
// FUNCIONES DE MANEJO DE BOTONES
// =============================================

async function handleWebApp(chatId) {
    const webAppMessage = `
🌐 *ACCESO A LA WEBAPP PROFESIONAL*

Estás a punto de acceder a nuestra plataforma web profesional de trading.

Haz clic en el botón de abajo para abrir la WebApp:
    `;

    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { 
                        text: '🚀 ABRIR WEBAPP', 
                        web_app: { url: RENDER_URL } 
                    }
                ]
            ]
        }
    };

    await sendNotification(chatId, webAppMessage, inlineKeyboard);
}

async function handleViewSignals(chatId, userId) {
    try {
        const { data: signals, error } = await supabase
            .from('signals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        let signalsMessage = `📊 *SEÑALES RECIENTES*\n\n`;

        if (signals && signals.length > 0) {
            signals.forEach((signal) => {
                const directionEmoji = signal.direction === 'up' ? '🟢' : '🔴';
                const directionText = signal.direction === 'up' ? 'ALZA' : 'BAJA';
                const statusEmoji = signal.status === 'profit' ? '💰' : 
                                  signal.status === 'loss' ? '❌' : '⏳';
                const statusText = signal.status === 'profit' ? 'GANADA' : 
                                 signal.status === 'loss' ? 'PERDIDA' : 'PENDIENTE';
                
                const created = new Date(signal.created_at).toLocaleTimeString();
                const expires = new Date(signal.expires_at).toLocaleTimeString();

                signalsMessage += `${directionEmoji} *${signal.asset}* - ${directionText}\n`;
                signalsMessage += `⏱ ${signal.timeframe} min | ${statusEmoji} ${statusText}\n`;
                signalsMessage += `🕒 ${created} - ${expires}\n`;
                signalsMessage += `${signal.is_free ? '🆓 GRATIS' : '💎 VIP'}\n\n`;
            });
        } else {
            signalsMessage += 'No hay señales activas en este momento.\n\n';
        }

        signalsMessage += `💎 *Acceso VIP:* Para ver todas las señales sin límites, activa tu plan VIP.`;

        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔄 ACTUALIZAR', callback_data: 'refresh_signals' },
                        { text: '💎 ACTIVAR VIP', url: 'https://t.me/Asche90' }
                    ]
                ]
            }
        };

        await sendNotification(chatId, signalsMessage, inlineKeyboard);

    } catch (error) {
        console.error('Error obteniendo señales:', error);
        await sendNotification(chatId, 
            '❌ Error al obtener las señales. Intenta nuevamente.',
            createMainKeyboard()
        );
    }
}

async function handleVIPInfo(chatId) {
    const vipMessage = `
💎 *PLAN VIP - QUANTUM SIGNAL TRADER*

¡Potencia tus ganancias con acceso completo a nuestro sistema!

🌟 *BENEFICIOS EXCLUSIVOS:*
• ✅ Acceso a TODAS las señales sin límites
• ✅ Señales en tiempo real VIP
• ✅ Soporte prioritario 24/7
• ✅ Estadísticas avanzadas personalizadas
• ✅ Alertas instantáneas exclusivas
• ✅ Señales antes que los usuarios free

💰 *INVERSIÓN:*
5000 CUP / mes

⏰ *DURACIÓN:*
30 días completos

📞 *Para activar:*
Contacta directamente a @Asche90

¡No esperes más para potenciar tus ganancias! 🚀
    `;

    await sendNotification(chatId, vipMessage, createVIPInlineKeyboard());
}

async function handleUserStatus(chatId, userId) {
    try {
        const user = await getUserStatus(userId);
        
        if (!user) {
            await sendNotification(chatId, 
                '❌ No se pudo obtener tu información. Usa /start para registrarte.',
                createMainKeyboard()
            );
            return;
        }

        let statusMessage = `
👤 *INFORMACIÓN DE TU CUENTA*

🆔 *ID:* ${userId}
👤 *Nombre:* ${user.first_name || 'No especificado'}
📊 *Estado:* ${user.is_vip ? '🎖️ *USUARIO VIP*' : '👤 Usuario Regular'}
        `;

        if (user.is_vip && user.vip_expires_at) {
            const expiryDate = new Date(user.vip_expires_at);
            const now = new Date();
            const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            
            statusMessage += `\n⏰ *VIP expira:* ${expiryDate.toLocaleDateString()}`;
            statusMessage += `\n📅 *Días restantes:* ${daysLeft}`;
            
            if (daysLeft <= 5) {
                statusMessage += `\n\n⚠️ *¡TU VIP ESTÁ POR EXPIRAR!*`;
                statusMessage += `\nRenueva ahora para mantener tus beneficios.`;
            }
        } else if (!user.is_vip) {
            statusMessage += `\n\n💎 *Mejora a VIP para acceso completo*`;
            statusMessage += `\nDisfruta de todos los beneficios exclusivos.`;
        }

        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔄 ACTUALIZAR', callback_data: 'refresh_status' }
                    ],
                    user.is_vip ? 
                    [] :
                    [
                        { text: '💎 ACTIVAR VIP', url: 'https://t.me/Asche90' }
                    ]
                ]
            }
        };

        await sendNotification(chatId, statusMessage, inlineKeyboard);

    } catch (error) {
        console.error('Error en estado de usuario:', error);
        await sendNotification(chatId, 
            '❌ Error al obtener tu estado. Intenta nuevamente.',
            createMainKeyboard()
        );
    }
}

async function handleHelp(chatId) {
    const helpMessage = `
🆘 *CENTRO DE AYUDA - QUANTUM TRADER*

*📋 BOTONES DISPONIBLES:*

• *📊 VER SEÑALES* - Muestra las señales más recientes
• *💎 PLAN VIP* - Información sobre el plan VIP
• *👤 MI ESTADO* - Ver tu información y estado VIP
• *🌐 ABRIR WEBAPP* - Abrir la plataforma web
• *📞 CONTACTO* - Contactar al administrador

*🔧 SOPORTE:*
Si necesitas ayuda adicional:

• Contacta al administrador: @Asche90
• Reporta problemas técnicos
• Consulta sobre facturación
• Solicita asistencia personalizada
    `;

    await sendNotification(chatId, helpMessage, createMainKeyboard());
}

async function handleContact(chatId) {
    const contactMessage = `
📞 *CONTACTO Y SOPORTE*

*ADMINISTRADOR:* @Asche90

*📧 PARA:*
• Activación de plan VIP
• Soporte técnico
• Consultas generales
• Reporte de problemas
• Facturación y pagos

*⏰ DISPONIBILIDAD:*
Soporte 24/7 para usuarios VIP
Respuesta rápida para todos los usuarios
    `;

    await sendNotification(chatId, contactMessage);
}

// =============================================
// SUSCRIPCIÓN A CAMBIOS EN SUPABASE
// =============================================

function setupSupabaseSubscriptions() {
    console.log('🔄 Configurando suscripciones de Supabase...');

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
                console.log('🔔 Nueva señal detectada:', payload.new.id);
                
                const signal = payload.new;
                const signalMessage = `
🎯 *NUEVA SEÑAL GENERADA*

• ID: ${signal.id}
• Activo: ${signal.asset}
• Dirección: ${signal.direction === 'up' ? 'ALZA 🟢' : 'BAJA 🔴'}
• Timeframe: ${signal.timeframe} minutos
• Tipo: ${signal.is_free ? 'GRATIS 🆓' : 'VIP 💎'}
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
                    console.log('💰 Resultado de señal:', signal.id);
                    
                    const resultMessage = `
🔄 *RESULTADO DE SEÑAL*

• ID: ${signal.id}
• Activo: ${signal.asset}
• Resultado: ${signal.status === 'profit' ? 'PROFIT ✅' : 'LOSS ❌'}
                    `;
                    
                    await sendNotification(ADMIN_ID, resultMessage);
                }
            }
        )
        .subscribe();

    console.log('✅ Suscripciones de Supabase configuradas');
}

// =============================================
// CONFIGURACIÓN DEL SERVIDOR WEB
// =============================================

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Servir el archivo HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Quantum Signal Trader is running',
        timestamp: new Date().toISOString(),
        bot_status: bot ? '✅ Conectado' : '❌ Desconectado'
    });
});

// Endpoint para enviar señales (solo admin)
app.post('/api/signals', async (req, res) => {
    try {
        const { asset, timeframe, direction, userId } = req.body;

        // Verificar que el usuario es admin
        if (userId !== ADMIN_ID) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        if (!asset || !timeframe || !direction) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Calcular fecha de expiración
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + parseInt(timeframe));

        // Insertar señal en Supabase
        const { data, error } = await supabase
            .from('signals')
            .insert([
                {
                    asset: asset.toUpperCase(),
                    timeframe: parseInt(timeframe),
                    direction: direction,
                    expires_at: expiresAt.toISOString(),
                    is_free: true
                }
            ])
            .select();

        if (error) throw error;

        res.status(200).json({ 
            success: true, 
            data,
            message: 'Señal enviada correctamente'
        });
    } catch (error) {
        console.error('Error enviando señal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para actualizar estado de una señal (solo admin)
app.put('/api/signals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, userId } = req.body;

        // Verificar que el usuario es admin
        if (userId !== ADMIN_ID) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        // Actualizar señal en Supabase
        const { data, error } = await supabase
            .from('signals')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;

        res.status(200).json({ 
            success: true, 
            data,
            message: `Estado actualizado a: ${status}`
        });
    } catch (error) {
        console.error('Error actualizando señal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener señales
app.get('/api/signals', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('signals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo señales:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener usuarios
app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para hacer usuario VIP
app.post('/api/users/vip', async (req, res) => {
    try {
        const { telegramId, userId } = req.body;

        // Verificar que el usuario es admin
        if (userId !== ADMIN_ID) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        const vipExpiresAt = new Date();
        vipExpiresAt.setDate(vipExpiresAt.getDate() + 30);

        const { data, error } = await supabase
            .from('users')
            .update({ 
                is_vip: true,
                vip_expires_at: vipExpiresAt.toISOString()
            })
            .eq('telegram_id', telegramId)
            .select();

        if (error) throw error;

        res.status(200).json({ 
            success: true, 
            data,
            message: `Usuario ${telegramId} ahora es VIP`
        });
    } catch (error) {
        console.error('Error haciendo usuario VIP:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para quitar VIP
app.post('/api/users/remove-vip', async (req, res) => {
    try {
        const { telegramId, userId } = req.body;

        // Verificar que el usuario es admin
        if (userId !== ADMIN_ID) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        const { data, error } = await supabase
            .from('users')
            .update({ 
                is_vip: false,
                vip_expires_at: null
            })
            .eq('telegram_id', telegramId)
            .select();

        if (error) throw error;

        res.status(200).json({ 
            success: true, 
            data,
            message: `Usuario ${telegramId} ya no es VIP`
        });
    } catch (error) {
        console.error('Error quitando VIP:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para notificar a los clientes (10 minutos)
app.post('/api/notify', async (req, res) => {
    try {
        const { userId } = req.body;

        // Verificar que el usuario es admin
        if (userId !== ADMIN_ID) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        // Enviar notificación a todos los usuarios (implementación básica)
        // En una implementación real, obtendrías la lista de usuarios de la base de datos
        await sendNotification(ADMIN_ID, '⏰ *ALERTA: Sesión de trading en 10 minutos*');

        res.status(200).json({ 
            success: true, 
            message: 'Notificación de 10 minutos enviada' 
        });
    } catch (error) {
        console.error('Error enviando notificación:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// INICIO DEL SERVIDOR
// =============================================

// Inicializar el servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor web ejecutándose en puerto ${PORT}`);
    
    // Configurar el bot después de que el servidor esté listo
    setTimeout(() => {
        setupBotHandlers();
        setupSupabaseSubscriptions();
        
        // Verificar conexión del bot
        bot.getMe().then((me) => {
            console.log(`✅ Bot conectado como: @${me.username}`);
            console.log(`✅ Bot ID: ${me.id}`);
            console.log('🎉 Sistema completamente operativo');
        }).catch((error) => {
            console.error('❌ Error verificando conexión del bot:', error);
        });
    }, 1000);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rechazada no manejada:', reason);
});
