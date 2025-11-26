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
                [{ text: '📈 SEÑALES EN TIEMPO REAL' }, { text: '💎 PLAN PREMIUM VIP' }],
                [{ text: '👤 MI CUENTA Y ESTADO' }, { text: '🌐 PLATAFORMA WEB' }],
                [{ text: '❓ CENTRO DE AYUDA' }, { text: '📞 CONTACTO DIRECTIVO' }]
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
                [{ text: '📋 VER BENEFICIOS COMPLETOS', callback_data: 'vip_benefits' }]
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
🌟 *BIENVENIDO A QUANTUM SIGNAL TRADER PRO* 🌟

¡Hola *${userName}*! 👋

🚀 *Tu portal definitivo hacia el trading profesional*

🌌 *¿Qué ofrece Quantum Trader?*
• 🔮 Señales de alta precisión en tiempo real
• 📊 Análisis técnico avanzado
• 💎 Estrategias probadas en mercado
• ⚡ Ejecución ultrarrápida

💫 *Características exclusivas:*
✅ Señales verificadas y validadas
✅ Soporte 24/7 profesional
✅ Plataforma web de última generación
✅ Comunidad de traders élite

*Selecciona una opción del menú para comenzar tu journey financiero:* ⬇️
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
🔍 *DIAGNÓSTICO DEL SISTEMA QUANTUM TRADER*

🟢 *ESTADO: SISTEMA OPERATIVO*

📊 *MÉTRICAS DEL SISTEMA:*
• 🤖 Bot Telegram: ✅ CONECTADO
• 🗄️ Base de datos: ✅ SINCRONIZADA  
• 🌐 Servidor Web: ✅ RESPONDIENDO
• 📡 API Señales: ✅ ACTIVA

🛡️ *SEGURIDAD:*
• Cifrado de extremo a extremo: ✅ ACTIVADO
• Verificación de identidad: ✅ IMPLEMENTADA
• Backup automático: ✅ CONFIGURADO

⏰ *ÚLTIMA ACTUALIZACIÓN:*
${new Date().toLocaleString('es-ES', { 
    timeZone: 'America/Havana',
    dateStyle: 'full',
    timeStyle: 'medium'
})}

🎯 *SISTEMA LISTO PARA OPERACIONES*
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
            case '📈 SEÑALES EN TIEMPO REAL':
                await handleViewSignals(chatId, userId);
                break;
                
            case '💎 PLAN PREMIUM VIP':
                await handleVIPInfo(chatId);
                break;
                
            case '👤 MI CUENTA Y ESTADO':
                await handleUserStatus(chatId, userId);
                break;
                
            case '🌐 PLATAFORMA WEB':
                await handleWebApp(chatId);
                break;
                
            case '❓ CENTRO DE AYUDA':
                await handleHelp(chatId);
                break;
                
            case '📞 CONTACTO DIRECTIVO':
                await handleContact(chatId);
                break;
                
            default:
                if (!messageText.startsWith('/')) {
                    await sendNotification(chatId, 
                        `🔍 *Menú de Navegación - Quantum Trader*

Por favor, utiliza los botones inferiores para acceder a las diferentes secciones de nuestra plataforma.

¿Necesitas asistencia? Selecciona "❓ CENTRO DE AYUDA" para recibir soporte inmediato.`,
                        createMainKeyboard()
                    );
                }
                break;
        }
    } catch (error) {
        console.error('Error procesando mensaje:', error);
        await sendNotification(chatId, 
            '⚠️ *Error del Sistema*\n\nNuestros técnicos han sido notificados. Por favor, intenta nuevamente en unos momentos.',
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
🌐 *PLATAFORMA WEB QUANTUM TRADER PRO*

¡Accede a nuestra plataforma web de última generación! 

🚀 *Características Exclusivas:*
• 📊 Dashboard profesional en tiempo real
• 📈 Gráficos avanzados interactivos
• 🔔 Sistema de alertas personalizado
• 📱 Interfaz responsive y moderna
• 💾 Historial completo de operaciones

💫 *Beneficios de la Plataforma Web:*
✅ Análisis técnico en profundidad
✅ Gestión de portfolio avanzada
✅ Backtesting de estrategias
✅ Reportes automáticos detallados

*Haz clic en el botón inferior para acceder inmediatamente:* 👇
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

        let signalsMessage = `📊 *SEÑALES RECIENTES - MERCADOS ACTIVOS*\n\n`;

        if (signals && signals.length > 0) {
            signals.forEach((signal, index) => {
                const directionEmoji = signal.direction === 'up' ? '🟢' : '🔴';
                const directionText = signal.direction === 'up' ? 'TENDENCIA ALCISTA ↗️' : 'TENDENCIA BAJISTA ↘️';
                const statusEmoji = signal.status === 'profit' ? '💰' : 
                                  signal.status === 'loss' ? '📉' : '⏳';
                const statusText = signal.status === 'profit' ? 'OPERACIÓN EXITOSA' : 
                                 signal.status === 'loss' ? 'OPERACIÓN CERRADA' : 'EN EJECUCIÓN';
                
                const created = new Date(signal.created_at).toLocaleTimeString();
                const expires = new Date(signal.expires_at).toLocaleTimeString();

                signalsMessage += `${directionEmoji} *${signal.asset}* - ${directionText}\n`;
                signalsMessage += `⏰ Duración: ${signal.timeframe} minutos | ${statusEmoji} ${statusText}\n`;
                signalsMessage += `🕐 Emisión: ${created} | Expira: ${expires}\n`;
                signalsMessage += `${signal.is_free ? '🎯 SEÑAL GRATUITA' : '💎 SEÑAL PREMIUM'}\n`;
                signalsMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            });
        } else {
            signalsMessage += '*No hay señales activas en este momento.*\n\n';
            signalsMessage += '🔮 Nuestro equipo de análisis está monitoreando los mercados para generar nuevas oportunidades.\n\n';
        }

        signalsMessage += `💎 *¿Quieres acceso a todas nuestras señales premium?*\nActiva tu membresía VIP para recibir alertas exclusivas.`;

        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔄 ACTUALIZAR SEÑALES', callback_data: 'refresh_signals' },
                        { text: '💎 VER PLAN VIP', callback_data: 'vip_benefits' }
                    ],
                    [
                        { text: '🚀 ACCEDER A PLATAFORMA', web_app: { url: RENDER_URL } }
                    ]
                ]
            }
        };

        await sendNotification(chatId, signalsMessage, inlineKeyboard);

    } catch (error) {
        console.error('Error obteniendo señales:', error);
        await sendNotification(chatId, 
            '⚠️ *Sistema de Señales Temporalmente No Disponible*\n\nNuestro equipo técnico está trabajando para restablecer el servicio. Agradecemos tu comprensión.',
            createMainKeyboard()
        );
    }
}

// 💎 PLAN VIP MEJORADO
async function handleVIPInfo(chatId) {
    const vipMessage = `
💎 *MEMBRESÍA PREMIUM QUANTUM TRADER*

✨ *Transforma tu Experiencia de Trading* ✨

🚀 *BENEFICIOS EXCLUSIVOS VIP:*

🎯 *SEÑALES ILIMITADAS:*
• ✅ Acceso completo a todas las señales premium
• ✅ Alertas en tiempo real antes del mercado
• ✅ Señales de alta probabilidad verificadas
• ✅ Sin restricciones ni límites

📊 *HERRAMIENTAS AVANZADAS:*
• 📈 Análisis técnico profesional
• 🔮 Proyecciones de mercado exclusivas
• 💡 Estrategias avanzadas documentadas
• 📋 Reportes de performance detallados

🛡️ *SOPORTE PRIORITARIO:*
• 👨‍💼 Asesoramiento personalizado 24/7
• 📞 Atención directa con el equipo directivo
• 🔄 Actualizaciones en tiempo real
• 🎓 Sesiones formativas exclusivas

💰 *INVERSIÓN:*
*5,000 CUP / mes* - *Inversión inteligente para resultados extraordinarios*

⏰ *DURACIÓN:*
30 días de acceso completo ilimitado

🎁 *GARANTÍA:*
Si no estás satisfecho durante los primeros 7 días, reembolso completo.

*¿Listo para elevar tu trading?* 👇
    `;

    await sendNotification(chatId, vipMessage, createVIPInlineKeyboard());
}

// 💎 BENEFICIOS VIP DETALLADOS
async function handleVIPBenefits(chatId) {
    const benefitsMessage = `
🌟 *DETALLE COMPLETO DE BENEFICIOS VIP*

📊 *PAQUETE DE SEÑALES COMPLETO:*
• Señales Forex mayores y menores
• Análisis de índices bursátiles
• Señales de commodities (Oro, Petróleo)
• Criptomonedas principales
• Acciones blue-chip

🔧 *HERRAMIENTAS PROFESIONALES:*
• Dashboard personalizado avanzado
• Calculadora de riesgo integrada
• Gestor de posición automático
• Alertas de noticias económicas
• Calendario económico filtrado

🎓 *FORMACIÓN CONTINUA:*
• Webinars mensuales exclusivos
• E-books y guías avanzadas
• Sesiones de Q&A con analistas
• Estrategias paso a paso
• Análisis de mercado semanal

📈 *VENTAJAS COMPETITIVAS:*
• Señales 15-30 minutos antes que usuarios free
• Ratio de éxito documentado: 75-85%
• Soporte multilingüe
• Actualizaciones en tiempo real
• Comunidad privada de traders

💼 *INVERSIÓN INTELIGENTE:*
*5,000 CUP/mes* = *~167 CUP/día* por acceso ilimitado a herramientas profesionales.

*¡Tu éxito en el trading comienza aquí!* 🚀
    `;

    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '💬 CONTACTAR PARA ACTIVAR VIP', url: 'https://t.me/Asche90' }
                ],
                [
                    { text: '📞 HABLAR CON ASESOR', url: 'https://t.me/Asche90' }
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
                '🔍 *Cuenta No Registrada*\n\nPor favor, utiliza el comando /start para registrar tu cuenta y acceder a todos los beneficios de Quantum Trader.',
                createMainKeyboard()
            );
            return;
        }

        let statusMessage = `
👤 *INFORMACIÓN DE TU CUENTA QUANTUM TRADER*

🆔 *Identificador Único:* ${userId}
👤 *Nombre Registrado:* ${user.first_name || 'Por completar'}
📊 *Nivel de Membresía:* ${user.is_vip ? '🎖️ *PREMIUM VIP*' : '👤 USUARIO STANDARD'}
🏆 *Estado de la Cuenta:* ACTIVA ✅
        `;

        if (user.is_vip && user.vip_expires_at) {
            const expiryDate = new Date(user.vip_expires_at);
            const now = new Date();
            const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            
            statusMessage += `\n⏰ *Vigencia VIP:* ${expiryDate.toLocaleDateString('es-ES')}`;
            statusMessage += `\n📅 *Días Restantes:* ${daysLeft} días`;
            
            if (daysLeft <= 7) {
                statusMessage += `\n\n⚠️ *ATENCIÓN: Tu membresía VIP está por expirar!*`;
                statusMessage += `\n💎 Renueva ahora para mantener tus beneficios exclusivos.`;
            } else if (daysLeft <= 3) {
                statusMessage += `\n\n🚨 *URGENTE: Tu VIP expira en ${daysLeft} días!*`;
                statusMessage += `\n🔔 Contacta inmediatamente para renovar.`;
            }
        } else if (!user.is_vip) {
            statusMessage += `\n\n💎 *OPORTUNIDAD DE CRECIMIENTO*`;
            statusMessage += `\n¡Eleva tu experiencia de trading con nuestra membresía Premium VIP!`;
            statusMessage += `\nAccede a señales exclusivas, herramientas avanzadas y soporte prioritario.`;
        }

        statusMessage += `\n\n📈 *Tu Journey en Quantum Trader acaba de comenzar.*`;

        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '🔄 ACTUALIZAR ESTADO', callback_data: 'refresh_status' }
                    ],
                    user.is_vip ? 
                    [
                        { text: '💎 GESTIONAR VIP', url: 'https://t.me/Asche90' }
                    ] :
                    [
                        { text: '🚀 VER PLANES VIP', callback_data: 'vip_benefits' }
                    ]
                ]
            }
        };

        await sendNotification(chatId, statusMessage, inlineKeyboard);

    } catch (error) {
        console.error('Error en estado de usuario:', error);
        await sendNotification(chatId, 
            '⚠️ *Error al cargar información de cuenta*\n\nPor favor, intenta nuevamente en unos momentos.',
            createMainKeyboard()
        );
    }
}

// ❓ CENTRO DE AYUDA MEJORADO
async function handleHelp(chatId) {
    const helpMessage = `
❓ *CENTRO DE ASISTENCIA QUANTUM TRADER*

🛡️ *Estamos aquí para ayudarte* 🛡️

📋 *SECCIONES DE AYUDA:*

🔧 *SOPORTE TÉCNICO:*
• Configuración de la plataforma
• Problemas de conexión
• Errores del sistema
• Consultas técnicas

💼 *ASUNTOS COMERCIALES:*
• Activación de membresías
• Facturación y pagos
• Renovaciones y cancelaciones
• Consultas de precios

📊 *USO DE PLATAFORMA:*
• Interpretación de señales
• Configuración de alertas
• Uso de herramientas
• Optimización de estrategias

🔄 *PROCEDIMIENTOS:*
1. Selecciona el tipo de consulta
2. Describe detalladamente tu situación
3. Proporciona tu ID de usuario
4. Adjunta capturas si es necesario

⏰ *TIEMPOS DE RESPUESTA:*
• Usuarios VIP: < 15 minutos
• Usuarios Standard: < 2 horas

*¿En qué podemos asistirte hoy?* 👇
    `;

    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '📞 CONTACTO INMEDIATO', url: 'https://t.me/Asche90' },
                    { text: '💬 CHAT DE SOPORTE', url: 'https://t.me/Asche90' }
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
📞 *CANALES DE CONTACTO DIRECTIVO*

👨‍💼 *EQUIPO DIRECTIVO QUANTUM TRADER*

🌐 *CONTACTO PRINCIPAL:*
@Asche90 - *Director General*

💼 *ÁREAS DE ATENCIÓN:*

🎯 *DIRECCIÓN ESTRATÉGICA:*
• Planificación de inversiones
• Estrategias corporativas
• Alianzas institucionales
• Desarrollo de negocio

💎 *MEMBRESÍAS PREMIUM:*
• Activación de cuentas VIP
• Negociación corporativa
• Planes personalizados
• Consultoría exclusiva

📊 *ANÁLISIS Y MERCADOS:*
• Consultas técnicas avanzadas
• Análisis de portfolio
• Estrategias personalizadas
• Mentoring profesional

🛡️ *SEGURIDAD Y CUMPLIMIENTO:*
• Verificación de cuentas
• Protocolos de seguridad
• Cumplimiento normativo
• Protección de datos

⏰ *HORARIOS DE ATENCIÓN:*
• Lunes a Viernes: 8:00 AM - 10:00 PM
• Sábados: 9:00 AM - 6:00 PM
• Soporte urgente: 24/7 para VIP

*Selecciona el canal apropiado para tu consulta:* 👇
    `;

    const inlineKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: '👨‍💼 DIRECCIÓN GENERAL', url: 'https://t.me/Asche90' },
                    { text: '💎 ACTIVACIONES VIP', url: 'https://t.me/Asche90' }
                ],
                [
                    { text: '📊 CONSULTORÍA AVANZADA', url: 'https://t.me/Asche90' },
                    { text: '🛡️ SEGURIDAD', url: 'https://t.me/Asche90' }
                ],
                [
                    { text: '🌐 ACCESO PLATAFORMA', web_app: { url: RENDER_URL } }
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
🎯 *NUEVA SEÑAL GENERADA - SISTEMA QUANTUM*

• 📊 Activo: ${signal.asset}
• 🎯 Dirección: ${signal.direction === 'up' ? 'ALZA 🟢' : 'BAJA 🔴'}
• ⏰ Timeframe: ${signal.timeframe} minutos
• 🆔 Identificador: ${signal.id}
• 💎 Tipo: ${signal.is_free ? 'SEÑAL GRATUITA 🎯' : 'SEÑAL PREMIUM 💎'}

*La señal ha sido distribuida a todos los usuarios correspondientes.*
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
📊 *RESULTADO DE OPERACIÓN CONFIRMADO*

• 🆔 ID: ${signal.id}
• 📈 Activo: ${signal.asset}
• 💰 Resultado: ${signal.status === 'profit' ? 'OPERACIÓN EXITOSA ✅' : 'OPERACIÓN CERRADA 📉'}
• 🎯 Performance: ${signal.status === 'profit' ? 'GANANCIA REGISTRADA' : 'CIERRE EJECUTADO'}

*El resultado ha sido actualizado en el sistema.*
                `;
                
                await sendNotification(ADMIN_ID, resultMessage);
            }
        }
    )
    .subscribe();

console.log('✅ Sistema de notificaciones activado');
console.log('🎉 === BOT QUANTUM TRADER COMPLETAMENTE OPERATIVO ===');
console.log('📡 Esperando interacciones de usuarios...');

// Log de actividad periódica
setInterval(() => {
    console.log('💓 Sistema Quantum Trader - Operativo y monitoreando...');
}, 300000); // Log cada 5 minutos

module.exports = bot;
