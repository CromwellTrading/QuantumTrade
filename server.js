const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// CONFIGURACIÓN
// =============================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ADMIN_ID = process.env.ADMIN_ID || '5376388604';
const RENDER_URL = process.env.RENDER_URL || 'https://quantumtrade-ie33.onrender.com';

console.log('=== 🚀 INICIANDO SERVIDOR WEB ===');

// Verificar configuración
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERROR: Faltan variables de entorno críticas de Supabase');
    process.exit(1);
}

// =============================================
// INICIALIZACIÓN DE SUPABASE
// =============================================

console.log('🔄 Conectando con la base de datos...');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log('✅ Conexión a Supabase establecida');

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

// Health check mejorado con logging
app.get('/health', (req, res) => {
    const healthData = {
        status: 'OK',
        message: 'Quantum Signal Trader is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        url: RENDER_URL
    };
    
    console.log('🏥 Health check ejecutado:', {
        timestamp: healthData.timestamp,
        uptime: Math.round(healthData.uptime / 60) + ' minutos'
    });
    
    res.status(200).json(healthData);
});

// Endpoint para obtener información del usuario
app.get('/api/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Verificar si es admin
        const isAdmin = userId === ADMIN_ID;
        
        // Obtener información del usuario de Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        const userData = {
            telegram_id: userId,
            is_admin: isAdmin,
            is_vip: user?.is_vip || false,
            vip_expires_at: user?.vip_expires_at || null,
            username: user?.username || null,
            first_name: user?.first_name || null
        };

        res.json({ success: true, data: userData });
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para obtener todos los usuarios
app.get('/api/users', async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para buscar usuario por ID
app.get('/api/users/search/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        res.status(200).json({ 
            success: true, 
            data: user,
            found: !!user
        });
    } catch (error) {
        console.error('Error buscando usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para hacer usuario VIP
app.post('/api/users/vip', async (req, res) => {
    try {
        const { telegramId, userId, days = 30 } = req.body;

        // Verificar que el usuario es admin
        if (userId !== ADMIN_ID) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        const vipExpiresAt = new Date();
        vipExpiresAt.setDate(vipExpiresAt.getDate() + parseInt(days));

        // Verificar si el usuario existe
        const { data: existingUser, error: findError } = await supabase
            .from('users')
            .select('telegram_id')
            .eq('telegram_id', telegramId)
            .single();

        let result;
        if (findError && findError.code === 'PGRST116') {
            // Usuario no existe, crear uno nuevo
            result = await supabase
                .from('users')
                .insert({
                    telegram_id: telegramId,
                    is_vip: true,
                    vip_expires_at: vipExpiresAt.toISOString(),
                    created_at: new Date().toISOString()
                })
                .select();
        } else {
            // Usuario existe, actualizar
            result = await supabase
                .from('users')
                .update({ 
                    is_vip: true,
                    vip_expires_at: vipExpiresAt.toISOString()
                })
                .eq('telegram_id', telegramId)
                .select();
        }

        if (result.error) throw result.error;

        res.status(200).json({ 
            success: true, 
            data: result.data,
            message: `Usuario ${telegramId} ahora es VIP por ${days} días`
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

// Endpoint para notificar a los clientes (10 minutos)
app.post('/api/notify', async (req, res) => {
    try {
        const { userId } = req.body;

        // Verificar que el usuario es admin
        if (userId !== ADMIN_ID) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

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

        res.status(200).json({ 
            success: true,
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

        res.status(200).json({ 
            success: true,
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
    console.log('🚀 Servidor completamente operativo');
});

// =============================================
// KEEP-ALIVE PARA PREVENIR SUSPENSIÓN
// =============================================

console.log('🔧 Configurando sistema keep-alive...');

// Función para mantener el servidor activo
const keepAlive = async () => {
    try {
        const response = await fetch(`${RENDER_URL}/health`);
        console.log(`🔄 Keep-alive ejecutado: ${response.status} - ${new Date().toLocaleTimeString()}`);
    } catch (error) {
        console.error('❌ Error en keep-alive:', error.message);
    }
};

// Ejecutar keep-alive inmediatamente y luego cada 5 minutos
keepAlive();
setInterval(keepAlive, 5 * 60 * 1000); // 5 minutos

console.log('✅ Sistema keep-alive configurado cada 5 minutos');

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rechazada no manejada:', reason);
});
