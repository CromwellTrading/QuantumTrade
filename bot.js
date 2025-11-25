const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8410509549:AAGA69J7j6JV4bKzfFwheJT5TOw4f4x7b7Y';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_ID = process.env.ADMIN_ID || '5376388604';

// Inicializar bot de Telegram
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Inicializar Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🤖 Bot de Telegram iniciado...');

// Comando /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
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
            }, { onConflict: 'telegram_id' });
        
        if (error) {
            console.error('Error guardando usuario:', error);
        }
        
        const welcomeMessage = `
🎯 *Bienvenido a Quantum Signal Trader Pro* 🚀

*Tu sistema avanzado de señales de trading*

📊 *Características:*
• Señales en tiempo real
• Análisis de rendimiento
• Sistema VIP exclusivo
• Soporte 24/7

💎 *Plan VIP:*
Acceso a todas las señales
Señales ilimitadas
Soporte prioritario

Para activar tu plan VIP, contacta a @Asche90

🌐 *Web App:* [Acceder a la plataforma](${process.env.RENDER_URL || 'https://tudominio.onrender.com'})

Usa /help para ver todos los comandos disponibles.
        `;
        
        await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Error en comando /start:', error);
        await bot.sendMessage(chatId, '❌ Error al procesar tu solicitud. Intenta nuevamente.');
    }
});

// Comando /vip
bot.onText(/\/vip/, async (msg) => {
    const chatId = msg.chat.id;
    
    const vipMessage = `
💎 *PLAN VIP - QUANTUM SIGNAL TRADER*

¡Mejora tu experiencia de trading con nuestro plan VIP!

🌟 *Beneficios exclusivos:*
• ✅ Acceso a TODAS las señales
• ✅ Señales ilimitadas
• ✅ Soporte prioritario 24/7
• ✅ Estadísticas avanzadas
• ✅ Alertas instantáneas

💰 *Precio:* $50 USD / mes

⏰ *Duración:* 30 días

📞 *Para activar:*
Contacta directamente a @Asche90 y menciona que quieres activar el plan VIP.

¡No esperes más para potenciar tus ganancias! 🚀
    `;
    
    await bot.sendMessage(chatId, vipMessage, { parse_mode: 'Markdown' });
});

// Comando /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    
    const helpMessage = `
🆘 *COMANDOS DISPONIBLES*

/start - Iniciar el bot y registrarse
/vip - Información del plan VIP
/help - Mostrar esta ayuda
/status - Ver tu estado actual
/web - Acceder a la plataforma web

📞 *Soporte:* @Asche90
    `;
    
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Comando /status
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', userId)
            .single();
        
        if (error) {
            throw error;
        }
        
        let statusMessage = `
👤 *TU ESTADO*

🆔 ID: ${userId}
👤 Nombre: ${user.first_name || 'No especificado'}
📊 Estado: ${user.is_vip ? '🎖️ *USUARIO VIP*' : '👤 Usuario Regular'}
        `;
        
        if (user.is_vip && user.vip_expires_at) {
            const expiryDate = new Date(user.vip_expires_at);
            const now = new Date();
            const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            
            statusMessage += `\n⏰ VIP expira: ${expiryDate.toLocaleDateString()}`;
            statusMessage += `\n📅 Días restantes: ${daysLeft}`;
            
            if (daysLeft <= 5) {
                statusMessage += `\n\n⚠️ *Tu VIP está por expirar! Renueva contactando a @Asche90*`;
            }
        } else if (!user.is_vip) {
            statusMessage += `\n\n💎 *Mejora a VIP para acceso completo*`;
            statusMessage += `\nUsa /vip para más información`;
        }
        
        await bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
        
    } catch (error) {
        console.error('Error en comando /status:', error);
        await bot.sendMessage(chatId, '❌ Error al obtener tu estado. Intenta nuevamente.');
    }
});

// Comando /web
bot.onText(/\/web/, (msg) => {
    const chatId = msg.chat.id;
    
    const webMessage = `
🌐 *PLATAFORMA WEB*

Accede a nuestra plataforma web para:
• 📊 Ver señales en tiempo real
• 📈 Analizar estadísticas
• 👥 Gestión de usuarios (admin)
• 🔔 Alertas visuales

🔗 *Enlace:* [Quantum Signal Trader Pro](${process.env.RENDER_URL || 'https://tudominio.onrender.com'})

¡La experiencia web ofrece una interfaz más completa! 🚀
    `;
    
    bot.sendMessage(chatId, webMessage, { parse_mode: 'Markdown' });
});

// Manejar mensajes directos para VIP
bot.on('message', async (msg) => {
    if (msg.text && msg.text.startsWith('/')) return; // Ignorar comandos
    
    const chatId = msg.chat.id;
    const userId = msg.from.id.toString();
    const messageText = msg.text;
    
    // Si el mensaje contiene palabras clave de VIP, sugerir contacto
    const vipKeywords = ['vip', 'premium', 'pago', 'precio', 'costo', 'plan', 'subscription', 'subscriptión'];
    const hasVipKeyword = vipKeywords.some(keyword => 
        messageText.toLowerCase().includes(keyword)
    );
    
    if (hasVipKeyword) {
        await bot.sendMessage(chatId, 
            `💎 Para información sobre planes VIP, contacta a @Asche90\n\nTambién puedes usar el comando /vip para más detalles.`,
            { parse_mode: 'Markdown' }
        );
    }
});

// Manejo de errores
bot.on('error', (error) => {
    console.error('❌ Error del bot:', error);
});

bot.on('polling_error', (error) => {
    console.error('❌ Error de polling:', error);
});

console.log('✅ Bot configurado y ejecutándose...');
