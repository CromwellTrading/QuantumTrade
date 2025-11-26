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

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8410509549:AAGA69J7j6JV4bKzfFwheJT5TOw4f4x7b7Y';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_ID = process.env.ADMIN_ID || '5376388604';
const RENDER_URL = process.env.RENDER_URL || 'https://quantumtrade-ie33.onrender.com';

console.log('🚀 Iniciando Quantum Signal Trader Pro...');
console.log('🔧 Verificando configuración...');
console.log('Token:', TELEGRAM_BOT_TOKEN ? '✅ Presente' : '❌ Faltante');
console.log('Supabase URL:', SUPABASE_URL ? '✅ Presente' : '❌ Faltante');
console.log('Supabase Key:', SUPABASE_KEY ? '✅ Presente' : '❌ Faltante');

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
            interval: 300,
            autoStart: true,
            params: {
                timeout: 10
            }
        }
    });
    console.log('✅ Bot de Telegram creado exitosamente');

    // Verificar conexión del bot
    bot.getMe().then((me) => {
        console.log(`✅ Bot conectado como: @${me.username}`);
        console.log(`✅ Bot ID: ${me.id}`);
        console.log(`✅ Bot nombre: ${me.first_name}`);
    }).catch((error) => {
        console.error('❌ Error obteniendo info del bot:', error);
    });

} catch (error) {
    console.error('❌ ERROR CRÍTICO al inicializar el bot:', error);
    process.exit(1);
}

// =============================================
// FUNCIÓN PARA ENVIAR NOTIFICACIONES
// =============================================

async function sendNotification(message) {
    try {
        await bot.sendMessage(ADMIN_ID, message, { parse_mode: 'Markdown' });
        console.log('✅ Notificación enviada al admin');
    } catch (error) {
        console.error('❌ Error enviando notificación:', error);
    }
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

// Health check mejorado
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        message: 'Quantum Signal Trader is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        bot_status: bot ? '✅ Conectado' : '❌ Desconectado'
    });
});

// Endpoint para información del sistema
app.get('/api/system-info', async (req, res) => {
    try {
        // Obtener estadísticas básicas
        const { data: signals, error: signalsError } = await supabase
            .from('signals')
            .select('*');
            
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*');

        if (signalsError || usersError) {
            throw new Error('Error obteniendo datos del sistema');
        }

        res.json({
            signals_count: signals?.length || 0,
            users_count: users?.length || 0,
            admin_id: ADMIN_ID,
            web_url: RENDER_URL,
            status: 'Operacional'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// ENDPOINTS DE LA API
// =============================================

// Endpoint para verificar usuario admin
app.get('/api/check-admin/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const isAdmin = userId === ADMIN_ID;
        
        res.json({ isAdmin });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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

        // Insertar señal en Supabase
        const { data, error } = await supabase
            .from('signals')
            .insert([
                {
                    asset: asset.toUpperCase(),
                    timeframe: parseInt(timeframe),
                    direction: direction,
                    is_free: true // Por defecto gratuita para la primera
                }
            ])
            .select();

        if (error) throw error;

        // Enviar notificación al admin
        const signalMessage = `
🎯 *SEÑAL ENVIADA DESDE WEBAPP*

• Activo: ${asset}
• Dirección: ${direction === 'up' ? 'ALZA 🟢' : 'BAJA 🔴'}
• Timeframe: ${timeframe} minutos
• ID: ${data[0].id}
        `;
        await sendNotification(signalMessage);

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

        // Enviar notificación del resultado
        const resultMessage = `
🔄 *RESULTADO ACTUALIZADO DESDE WEBAPP*

• ID: ${id}
• Resultado: ${status === 'profit' ? 'PROFIT ✅' : 'LOSS ❌'}
        `;
        await sendNotification(resultMessage);

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

        // Enviar notificación
        await sendNotification('⏰ *ALERTA: Sesión de trading en 10 minutos*');

        res.status(200).json({ 
            success: true, 
            message: 'Notificación de 10 minutos enviada' 
        });
    } catch (error) {
        console.error('Error enviando notificación:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para iniciar sesión
app.post('/api/sessions/start', async (req, res) => {
    try {
        const { userId } = req.body;

        // Verificar que el usuario es admin
        if (userId !== ADMIN_ID) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        const sessionId = `session_${Date.now()}`;
        
        const { data, error } = await supabase
            .from('sessions')
            .insert([
                {
                    session_id: sessionId,
                    start_time: new Date().toISOString(),
                    status: 'active'
                }
            ])
            .select();

        if (error) throw error;

        // Enviar notificación
        await sendNotification('🚀 *SESIÓN DE TRADING INICIADA*');

        res.status(200).json({ 
            success: true, 
            data,
            message: 'Sesión iniciada correctamente'
        });
    } catch (error) {
        console.error('Error iniciando sesión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para finalizar sesión
app.post('/api/sessions/end', async (req, res) => {
    try {
        const { userId } = req.body;

        // Verificar que el usuario es admin
        if (userId !== ADMIN_ID) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        // Encontrar sesión activa
        const { data: activeSession, error: findError } = await supabase
            .from('sessions')
            .select('*')
            .eq('status', 'active')
            .single();

        if (findError) throw findError;

        const { data, error } = await supabase
            .from('sessions')
            .update({ 
                end_time: new Date().toISOString(),
                status: 'finished'
            })
            .eq('session_id', activeSession.session_id)
            .select();

        if (error) throw error;

        // Enviar notificación
        await sendNotification('🛑 *SESIÓN DE TRADING FINALIZADA*');

        res.status(200).json({ 
            success: true, 
            data,
            message: 'Sesión finalizada correctamente'
        });
    } catch (error) {
        console.error('Error finalizando sesión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// INICIO DEL SERVIDOR
// =============================================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor web ejecutándose en puerto ${PORT}`);
    console.log(`✅ Bot de Telegram inicializado y escuchando`);
    console.log(`📱 Health check: ${RENDER_URL}/health`);
    console.log(`🤖 System info: ${RENDER_URL}/api/system-info`);
    console.log(`🌐 App principal: ${RENDER_URL}`);
    console.log('🚀 Sistema completamente operativo');
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rechazada no manejada:', reason);
});
