const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_ID = process.env.ADMIN_ID || '5376388604';
const RENDER_URL = process.env.RENDER_URL || 'https://quantumtrade-ie33.onrender.com';

console.log('=== 🔧 INICIANDO CONFIGURACIÓN DEL BOT ===');
console.log('📋 Variables de entorno:');
console.log('- TELEGRAM_BOT_TOKEN:', TELEGRAM_BOT_TOKEN ? '✅ PRESENTE' : '❌ FALTANTE');
console.log('- SUPABASE_URL:', SUPABASE_URL ? '✅ PRESENTE' : '❌ FALTANTE');
console.log('- SUPABASE_KEY:', SUPABASE_KEY ? '✅ PRESENTE' : '❌ FALTANTE');
console.log('- ADMIN_ID:', ADMIN_ID);
console.log('- RENDER_URL:', RENDER_URL);

// Verificar que tenemos todas las variables necesarias
if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ ERROR CRÍTICO: TELEGRAM_BOT_TOKEN no está definido');
    process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERROR CRÍTICO: Variables de Supabase no están definidas');
    process.exit(1);
}

// Inicializar Supabase
console.log('🔄 Inicializando Supabase...');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log('✅ Supabase inicializado');

// Función para crear teclado principal
function createMainKeyboard() {
    console.log('📱 Creando teclado principal...');
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
    console.log('📱 Creando teclado inline VIP...');
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
    console.log(`🔍 Obteniendo estado del usuario: ${userId}`);
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', userId)
            .single();

        if (error) {
            console.error('❌ Error obteniendo usuario:', error);
            throw error;
        }
        
        console.log(`✅ Usuario obtenido:`, user ? 'Encontrado' : 'No encontrado');
        return user;
    } catch (error) {
        console.error('❌ Error en getUserStatus:', error);
        return null;
    }
}

// Función para enviar notificaciones
async function sendNotification(bot, chatId, message, options = {}) {
    console.log(`📤 Enviando notificación a ${chatId}:`, message.substring(0, 50) + '...');
    try {
        const result = await bot.sendMessage(chatId, message, { 
            parse_mode: 'Markdown', 
            ...options 
        });
        console.log('✅ Notificación enviada exitosamente');
        return result;
    } catch (error) {
        console.error('❌ Error enviando notificación:', error);
        throw error;
    }
}

// Función para inicializar el bot
async function initializeBot() {
    console.log('\n=== 🤖 INICIALIZANDO BOT DE TELEGRAM ===');

    try {
        console.log('🔄 Creando instancia del bot...');
        
        // Configurar opciones del bot con manejo mejorado de errores
        const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, {
            polling: {
                interval: 1000,
                timeout: 10,
                autoStart: true,
                params: {
                    timeout: 60
                }
            }
        });

        console.log('✅ Instancia del bot creada');

        // Manejar errores de polling
        bot.on('polling_error', (error) => {
            console.error('❌ ERROR DE POLLING:', {
                code: error.code,
                message: error.message,
                stack: error.stack
            });
            
            // Si es error 409 (conflict), esperar y reiniciar
            if (error.code === 409) {
                console.log('🔄 Detectado error 409 - Conflicto de múltiples instancias');
                console.log('🔄 Reiniciando bot en 5 segundos...');
                setTimeout(() => {
                    console.log('🔄 Deteniendo polling...');
                    bot.stopPolling();
                    setTimeout(() => {
                        console.log('🔄 Reiniciando polling...');
                        bot.startPolling();
                    }, 2000);
                }, 5000);
            }
        });

        bot.on('webhook_error', (error) => {
            console.error('❌ ERROR DE WEBHOOK:', error);
        });

        bot.on('error', (error) => {
            console.error('❌ ERROR GENERAL DEL BOT:', error);
        });

        // Verificar que el bot está funcionando
        console.log('🔍 Verificando conexión del bot...');
        try {
            const me = await bot.getMe();
            console.log('✅ Bot conectado exitosamente:');
            console.log(`   - Username: @${me.username}`);
            console.log(`   - ID: ${me.id}`);
            console.log(`   - Nombre: ${me.first_name}`);
        } catch (error) {
            console.error('❌ Error verificando conexión del bot:', error);
            throw error;
        }

        // =============================================
        // MANEJADORES DE MENSAJES Y BOTONES
        // =============================================

        console.log('🔄 Configurando manejadores de mensajes...');

        // COMANDO /start - MENÚ PRINCIPAL
        bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const userId = msg.from.id.toString();
            const username = msg.from.username || 'Sin username';
            
            console.log(`\n📨 COMANDO /start RECIBIDO:`);
            console.log(`   - Chat ID: ${chatId}`);
            console.log(`   - User ID: ${userId}`);
            console.log(`   - Username: @${username}`);
            console.log(`   - Nombre: ${msg.from.first_name}`);

            try {
                console.log('💾 Guardando usuario en la base de datos...');
                
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
                    console.error('❌ Error guardando usuario:', error);
                    await sendNotification(bot, chatId, '❌ Error al guardar tu información. Intenta nuevamente.');
                    return;
                }

                console.log('✅ Usuario guardado exitosamente');

                const welcomeMessage = `
🎯 *BIENVENIDO A QUANTUM SIGNAL TRADER PRO* 🚀

*Sistema avanzado de señales de trading en tiempo real*

Usa los botones de abajo para navegar por el sistema:
                `;
                
                console.log('📤 Enviando mensaje de bienvenida...');
                await sendNotification(bot, chatId, welcomeMessage, createMainKeyboard());
                console.log('✅ Mensaje de bienvenida enviado');
                
            } catch (error) {
                console.error('❌ ERROR EN COMANDO /START:', error);
                await sendNotification(bot, chatId, 
                    '❌ Error al procesar tu solicitud. Por favor, intenta nuevamente.',
                    createMainKeyboard()
                );
            }
        });

        // MANEJAR BOTONES DEL TECLADO PRINCIPAL
        bot.on('message', async (msg) => {
            // Ignorar comandos que ya manejamos
            if (msg.text && msg.text.startsWith('/')) return;
            
            const chatId = msg.chat.id;
            const messageText = msg.text;
            const userId = msg.from.id.toString();

            console.log(`\n📨 MENSAJE/BOTÓN RECIBIDO:`);
            console.log(`   - User ID: ${userId}`);
            console.log(`   - Chat ID: ${chatId}`);
            console.log(`   - Mensaje: "${messageText}"`);

            try {
                switch (messageText) {
                    case '📊 VER SEÑALES':
                        console.log('🔄 Ejecutando: VER SEÑALES');
                        await handleViewSignals(bot, chatId, userId);
                        break;
                        
                    case '💎 PLAN VIP':
                        console.log('🔄 Ejecutando: PLAN VIP');
                        await handleVIPInfo(bot, chatId);
                        break;
                        
                    case '👤 MI ESTADO':
                        console.log('🔄 Ejecutando: MI ESTADO');
                        await handleUserStatus(bot, chatId, userId);
                        break;
                        
                    case '🌐 ABRIR WEBAPP':
                        console.log('🔄 Ejecutando: ABRIR WEBAPP');
                        await handleWebApp(bot, chatId);
                        break;
                        
                    case '🆘 AYUDA':
                        console.log('🔄 Ejecutando: AYUDA');
                        await handleHelp(bot, chatId);
                        break;
                        
                    case '📞 CONTACTO':
                        console.log('🔄 Ejecutando: CONTACTO');
                        await handleContact(bot, chatId);
                        break;
                        
                    default:
                        console.log('ℹ️  Mensaje no reconocido, mostrando menú principal');
                        // Si no es un botón conocido, mostrar menú principal
                        if (!messageText.startsWith('/')) {
                            await sendNotification(bot, chatId, 
                                'Usa los botones del menú para navegar por el sistema:',
                                createMainKeyboard()
                            );
                        }
                        break;
                }
            } catch (error) {
                console.error('❌ ERROR PROCESANDO MENSAJE:', error);
                await sendNotification(bot, chatId, '❌ Error al procesar tu solicitud.');
            }
        });

        // MANEJAR CALLBACK QUERIES (botones inline)
        bot.on('callback_query', async (callbackQuery) => {
            const message = callbackQuery.message;
            const chatId = message.chat.id;
            const data = callbackQuery.data;
            const userId = callbackQuery.from.id.toString();

            console.log(`\n🔘 CALLBACK RECIBIDO:`);
            console.log(`   - User ID: ${userId}`);
            console.log(`   - Chat ID: ${chatId}`);
            console.log(`   - Data: ${data}`);

            try {
                switch (data) {
                    case 'refresh_signals':
                        console.log('🔄 Ejecutando callback: REFRESH SIGNALS');
                        await handleViewSignals(bot, chatId, userId);
                        break;
                        
                    case 'refresh_status':
                        console.log('🔄 Ejecutando callback: REFRESH STATUS');
                        await handleUserStatus(bot, chatId, userId);
                        break;
                        
                    default:
                        console.log('ℹ️  Callback no manejado:', data);
                }

                // Responder al callback para quitar el "loading" del botón
                console.log('✅ Respondiendo al callback query');
                await bot.answerCallbackQuery(callbackQuery.id);
            } catch (error) {
                console.error('❌ ERROR EN CALLBACK:', error);
                await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error al procesar la solicitud' });
            }
        });

        // =============================================
        // FUNCIONES DE MANEJO DE BOTONES
        // =============================================

        // 🌐 ABRIR WEBAPP
        async function handleWebApp(bot, chatId) {
            console.log('🌐 Procesando apertura de WebApp...');
            const webAppMessage = `
🌐 *ACCESO A LA WEBAPP PROFESIONAL*

Estás a punto de acceder a nuestra plataforma web profesional de trading.

*Características:*
• Señales en tiempo real
• Panel de control avanzado
• Estadísticas detalladas
• Interfaz profesional

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

            await sendNotification(bot, chatId, webAppMessage, inlineKeyboard);
        }

        // 📊 VER SEÑALES
        async function handleViewSignals(bot, chatId, userId) {
            console.log('📊 Obteniendo señales...');
            try {
                // Obtener las señales más recientes
                const { data: signals, error } = await supabase
                    .from('signals')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (error) {
                    console.error('❌ Error obteniendo señales:', error);
                    throw error;
                }

                console.log(`✅ Señales obtenidas: ${signals?.length || 0}`);

                let signalsMessage = `📊 *SEÑALES RECIENTES*\n\n`;

                if (signals && signals.length > 0) {
                    signals.forEach((signal, index) => {
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

                await sendNotification(bot, chatId, signalsMessage, inlineKeyboard);

            } catch (error) {
                console.error('❌ ERROR EN HANDLE VIEW SIGNALS:', error);
                await sendNotification(bot, chatId, 
                    '❌ Error al obtener las señales. Intenta nuevamente.',
                    createMainKeyboard()
                );
            }
        }

        // 💎 PLAN VIP
        async function handleVIPInfo(bot, chatId) {
            console.log('💎 Mostrando información VIP...');
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
Contacta directamente a @Asche90 y menciona que quieres activar el plan VIP.

¡No esperes más para potenciar tus ganancias! 🚀
            `;

            await sendNotification(bot, chatId, vipMessage, createVIPInlineKeyboard());
        }

        // 👤 MI ESTADO
        async function handleUserStatus(bot, chatId, userId) {
            console.log(`👤 Obteniendo estado del usuario ${userId}...`);
            try {
                const user = await getUserStatus(userId);
                
                if (!user) {
                    console.log('❌ Usuario no encontrado');
                    await sendNotification(bot, chatId, 
                        '❌ No se pudo obtener tu información. Usa /start para registrarte.',
                        createMainKeyboard()
                    );
                    return;
                }

                console.log(`✅ Estado del usuario obtenido: VIP=${user.is_vip}`);

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

                await sendNotification(bot, chatId, statusMessage, inlineKeyboard);

            } catch (error) {
                console.error('❌ ERROR EN HANDLE USER STATUS:', error);
                await sendNotification(bot, chatId, 
                    '❌ Error al obtener tu estado. Intenta nuevamente.',
                    createMainKeyboard()
                );
            }
        }

        // 🆘 AYUDA
        async function handleHelp(bot, chatId) {
            console.log('🆘 Mostrando ayuda...');
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

*💡 CONSEJOS:*
• Mantén actualizada la aplicación
• Revisa las señales regularmente
• Considera el plan VIP para mejor experiencia
            `;

            await sendNotification(bot, chatId, helpMessage, createMainKeyboard());
        }

        // 📞 CONTACTO
        async function handleContact(bot, chatId) {
            console.log('📞 Mostrando contacto...');
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

*💬 INSTRUCCIONES:*
Envía un mensaje directo al administrador con:
1. Tu nombre de usuario
2. El motivo de tu consulta
3. Capturas de pantalla si es necesario
            `;

            await sendNotification(bot, chatId, contactMessage);
        }

        // =============================================
        // SUSCRIPCIÓN A CAMBIOS EN SUPABASE PARA NOTIFICACIONES
        // =============================================

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
                    console.log('🔔 NUEVA SEÑAL DETECTADA:', payload.new);
                    
                    const signal = payload.new;
                    const signalMessage = `
🎯 *NUEVA SEÑAL GENERADA*

• ID: ${signal.id}
• Activo: ${signal.asset}
• Dirección: ${signal.direction === 'up' ? 'ALZA 🟢' : 'BAJA 🔴'}
• Timeframe: ${signal.timeframe} minutos
• Tipo: ${signal.is_free ? 'GRATIS 🆓' : 'VIP 💎'}
                    `;
                    
                    // Enviar notificación al admin
                    console.log('📤 Enviando notificación de nueva señal al admin');
                    await sendNotification(bot, ADMIN_ID, signalMessage);
                }
            )
            .subscribe();

        // Suscribirse a actualizaciones de señales (resultados)
        supabase
            .channel('signals-updates')
            .on('postgres_changes', 
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'signals' 
                }, 
                async (payload) => {
                    console.log('🔄 ACTUALIZACIÓN DE SEÑAL DETECTADA:', payload.new);
                    
                    const signal = payload.new;
                    
                    // Solo notificar cuando cambia el estado a profit/loss
                    if (payload.old.status === 'pending' && (signal.status === 'profit' || signal.status === 'loss')) {
                        console.log('💰 RESULTADO DE SEÑAL:', signal);
                        
                        const resultMessage = `
🔄 *RESULTADO DE SEÑAL*

• ID: ${signal.id}
• Activo: ${signal.asset}
• Resultado: ${signal.status === 'profit' ? 'PROFIT ✅' : 'LOSS ❌'}
                        `;
                        
                        // Enviar notificación al admin
                        console.log('📤 Enviando notificación de resultado al admin');
                        await sendNotification(bot, ADMIN_ID, resultMessage);
                    }
                }
            )
            .subscribe();

        console.log('✅ Todos los handlers del bot configurados');
        console.log('🎉 BOT INICIALIZADO EXITOSAMENTE');
        console.log('🚀 Bot listo para recibir mensajes...');

        return bot;

    } catch (error) {
        console.error('❌ ERROR CRÍTICO AL INICIALIZAR EL BOT:', error);
        
        // Reintentar después de 10 segundos si hay error
        console.log('🔄 Reintentando en 10 segundos...');
        setTimeout(initializeBot, 10000);
        
        return null;
    }
}

// Inicializar el bot
console.log('\n=== 🚀 INICIANDO APLICACIÓN ===');
initializeBot().then(bot => {
    if (bot) {
        console.log('🎉 APLICACIÓN INICIALIZADA EXITOSAMENTE');
    } else {
        console.log('❌ NO SE PUDO INICIALIZAR LA APLICACIÓN');
    }
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ ERROR NO CAPTURADO:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ PROMESA RECHAZADA NO MANEJADA:', reason);
});
