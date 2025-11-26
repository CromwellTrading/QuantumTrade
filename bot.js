const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8410509549:AAGA69J7j6JV4bKzfFwheJT5TOw4f4x7b7Y';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_ID = process.env.ADMIN_ID || '5376388604';
const RENDER_URL = process.env.RENDER_URL || 'https://quantumtrade-ie33.onrender.com';

console.log('🔧 Iniciando configuración del bot...');

// Verificar que tenemos todas las variables necesarias
if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ ERROR: TELEGRAM_BOT_TOKEN no está definido');
    process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERROR: Variables de Supabase no están definidas');
    process.exit(1);
}

// Inicializar Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log('✅ Supabase inicializado');

// Configurar opciones del bot
const botOptions = {
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
};

console.log('🤖 Inicializando bot de Telegram...');

try {
    const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, botOptions);
    console.log('✅ Bot de Telegram creado exitosamente');

    // Eventos de error
    bot.on('polling_error', (error) => {
        console.error('❌ Error de polling:', error);
    });

    bot.on('error', (error) => {
        console.error('❌ Error general del bot:', error);
    });

    // Verificar que el bot está funcionando
    bot.getMe().then((me) => {
        console.log(`✅ Bot conectado como: @${me.username}`);
        console.log(`✅ Bot ID: ${me.id}`);
        console.log(`✅ Bot nombre: ${me.first_name}`);
    }).catch((error) => {
        console.error('❌ Error obteniendo info del bot:', error);
    });

    // Función para enviar notificaciones al canal/admin
    async function sendNotification(message) {
        try {
            // Enviar al admin
            await bot.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
            console.log('✅ Notificación enviada al admin');
        } catch (error) {
            console.error('❌ Error enviando notificación:', error);
        }
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

    // =============================================
    // MANEJADORES DE MENSAJES Y BOTONES
    // =============================================

    // COMANDO /start - MENÚ PRINCIPAL
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const userId = msg.from.id.toString();
        const username = msg.from.username || 'Sin username';
        
        console.log(`📨 Comando /start recibido de:`, {
            userId: userId,
            username: username,
            chatId: chatId,
            firstName: msg.from.first_name
        });

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
                console.error('❌ Error guardando usuario:', error);
                await bot.sendMessage(chatId, '❌ Error al guardar tu información. Intenta nuevamente.');
                return;
            }

            const welcomeMessage = `
🎯 *BIENVENIDO A QUANTUM SIGNAL TRADER PRO* 🚀

*Sistema avanzado de señales de trading en tiempo real*

Usa los botones de abajo para navegar por el sistema:
            `;
            
            await bot.sendMessage(chatId, welcomeMessage, { 
                parse_mode: 'Markdown',
                ...createMainKeyboard()
            });
            
        } catch (error) {
            console.error('❌ Error en comando /start:', error);
            await bot.sendMessage(chatId, 
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

        console.log(`📨 Mensaje/botón recibido de ${userId}: ${messageText}`);

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
                // Si no es un botón conocido, mostrar menú principal
                if (!messageText.startsWith('/')) {
                    await bot.sendMessage(chatId, 
                        'Usa los botones del menú para navegar por el sistema:',
                        createMainKeyboard()
                    );
                }
                break;
        }
    });

    // MANEJAR CALLBACK QUERIES (botones inline)
    bot.on('callback_query', async (callbackQuery) => {
        const message = callbackQuery.message;
        const chatId = message.chat.id;
        const data = callbackQuery.data;
        const userId = callbackQuery.from.id.toString();

        console.log(`🔘 Callback recibido: ${data} de ${userId}`);

        try {
            switch (data) {
                case 'vip_benefits':
                    await handleVIPBenefits(chatId);
                    break;
                    
                case 'refresh_signals':
                    await handleViewSignals(chatId, userId);
                    break;
                    
                case 'refresh_status':
                    await handleUserStatus(chatId, userId);
                    break;
                    
                default:
                    console.log('Callback no manejado:', data);
            }

            // Responder al callback para quitar el "loading" del botón
            await bot.answerCallbackQuery(callbackQuery.id);
        } catch (error) {
            console.error('Error en callback:', error);
            await bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error al procesar la solicitud' });
        }
    });

    // =============================================
    // FUNCIONES DE MANEJO DE BOTONES
    // =============================================

    // 🌐 ABRIR WEBAPP
    async function handleWebApp(chatId) {
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

        await bot.sendMessage(chatId, webAppMessage, {
            parse_mode: 'Markdown',
            ...inlineKeyboard
        });
    }

    // 📊 VER SEÑALES
    async function handleViewSignals(chatId, userId) {
        try {
            // Obtener las señales más recientes
            const { data: signals, error } = await supabase
                .from('signals')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) throw error;

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

            await bot.sendMessage(chatId, signalsMessage, {
                parse_mode: 'Markdown',
                ...inlineKeyboard
            });

        } catch (error) {
            console.error('Error obteniendo señales:', error);
            await bot.sendMessage(chatId, 
                '❌ Error al obtener las señales. Intenta nuevamente.',
                createMainKeyboard()
            );
        }
    }

    // 💎 PLAN VIP
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
Contacta directamente a @Asche90 y menciona que quieres activar el plan VIP.

¡No esperes más para potenciar tus ganancias! 🚀
        `;

        await bot.sendMessage(chatId, vipMessage, {
            parse_mode: 'Markdown',
            ...createVIPInlineKeyboard()
        });
    }

    // 👤 MI ESTADO
    async function handleUserStatus(chatId, userId) {
        try {
            const user = await getUserStatus(userId);
            
            if (!user) {
                await bot.sendMessage(chatId, 
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

            await bot.sendMessage(chatId, statusMessage, {
                parse_mode: 'Markdown',
                ...inlineKeyboard
            });

        } catch (error) {
            console.error('Error en estado de usuario:', error);
            await bot.sendMessage(chatId, 
                '❌ Error al obtener tu estado. Intenta nuevamente.',
                createMainKeyboard()
            );
        }
    }

    // 🆘 AYUDA
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

*💡 CONSEJOS:*
• Mantén actualizada la aplicación
• Revisa las señales regularmente
• Considera el plan VIP para mejor experiencia
        `;

        await bot.sendMessage(chatId, helpMessage, {
            parse_mode: 'Markdown',
            ...createMainKeyboard()
        });
    }

    // 📞 CONTACTO
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

*💬 INSTRUCCIONES:*
Envía un mensaje directo al administrador con:
1. Tu nombre de usuario
2. El motivo de tu consulta
3. Capturas de pantalla si es necesario
        `;

        await bot.sendMessage(chatId, contactMessage, {
            parse_mode: 'Markdown'
        });
    }

    // 💎 BENEFICIOS VIP (callback)
    async function handleVIPBenefits(chatId) {
        const benefitsMessage = `
🌟 *BENEFICIOS DETALLADOS VIP*

*📊 SEÑALES ILIMITADAS:*
• Acceso a todas las señales sin restricciones
• Señales VIP exclusivas
• Mayor frecuencia de señales

*🚀 VENTAJAS EXCLUSIVAS:*
• Soporte prioritario 24/7
• Alertas instantáneas
• Análisis personalizados
• Señales antes que usuarios free

*💰 GARANTÍA:*
Si no estás satisfecho, contáctanos para resolver cualquier issue.
        `;

        await bot.sendMessage(chatId, benefitsMessage, {
            parse_mode: 'Markdown',
            ...createVIPInlineKeyboard()
        });
    }

    // =============================================
    // SUSCRIPCIÓN A CAMBIOS EN SUPABASE PARA NOTIFICACIONES
    // =============================================

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
                console.log('🔔 Nueva señal para notificar:', payload.new);
                
                const signal = payload.new;
                const signalMessage = `
🎯 *NUEVA SEÑAL GENERADA*

• ID: ${signal.id}
• Activo: ${signal.asset}
• Dirección: ${signal.direction === 'up' ? 'ALZA 🟢' : 'BAJA 🔴'}
• Timeframe: ${signal.timeframe} minutos
• Tipo: ${signal.is_free ? 'GRATIS 🆓' : 'VIP 💎'}
                `;
                
                await sendNotification(signalMessage);
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
                const signal = payload.new;
                
                // Solo notificar cuando cambia el estado a profit/loss
                if (payload.old.status === 'pending' && (signal.status === 'profit' || signal.status === 'loss')) {
                    console.log('🔔 Resultado de señal:', signal);
                    
                    const resultMessage = `
🔄 *RESULTADO DE SEÑAL*

• ID: ${signal.id}
• Activo: ${signal.asset}
• Resultado: ${signal.status === 'profit' ? 'PROFIT ✅' : 'LOSS ❌'}
                    `;
                    
                    await sendNotification(resultMessage);
                }
            }
        )
        .subscribe();

    console.log('✅ Todos los handlers del bot configurados');
    console.log('🚀 Bot con interfaz de botones listo para recibir mensajes...');

} catch (error) {
    console.error('❌ ERROR CRÍTICO al inicializar el bot:', error);
    process.exit(1);
}
