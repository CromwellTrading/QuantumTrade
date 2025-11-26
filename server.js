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

console.log('=== 🚀 INICIANDO SERVIDOR WEB ===');
console.log('📋 Variables de entorno:');
console.log('- SUPABASE_URL:', SUPABASE_URL ? '✅ PRESENTE' : '❌ FALTANTE');
console.log('- SUPABASE_KEY:', SUPABASE_KEY ? '✅ PRESENTE' : '❌ FALTANTE');
console.log('- ADMIN_ID:', ADMIN_ID);
console.log('- PORT:', PORT);

// Verificar configuración
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERROR: Faltan variables de entorno críticas de Supabase');
    process.exit(1);
}

// =============================================
// INICIALIZACIÓN DE SUPABASE
// =============================================

console.log('🔄 Inicializando Supabase...');
try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase inicializado correctamente');
} catch (error) {
    console.error('❌ Error inicializando Supabase:', error);
    process.exit(1);
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
    console.log('📄 Petición recibida para servir index.html');
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    console.log('🔍 Health check recibido');
    res.status(200).json({ 
        status: 'OK', 
        message: 'Quantum Signal Trader is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Endpoint para verificar usuario admin
app.get('/api/check-admin/:userId', async (req, res) => {
    console.log('🔍 Verificando admin para usuario:', req.params.userId);
    try {
        const { userId } = req.params;
        const isAdmin = userId === ADMIN_ID;
        
        console.log(`✅ Resultado verificación admin: ${isAdmin}`);
        res.json({ isAdmin });
    } catch (error) {
        console.error('❌ Error verificando admin:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para enviar señales (solo admin)
app.post('/api/signals', async (req, res) => {
    console.log('📨 Recibida solicitud para enviar señal:', req.body);
    
    try {
        const { asset, timeframe, direction, userId } = req.body;

        console.log(`🔍 Verificando permisos de admin para: ${userId}`);
        // Verificar que el usuario es admin
        if (userId !== ADMIN_ID) {
            console.log('❌ Usuario no es admin:', userId);
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        if (!asset || !timeframe || !direction) {
            console.log('❌ Faltan campos requeridos');
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        console.log('✅ Datos válidos, insertando señal en Supabase...');

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

        if (error) {
            console.error('❌ Error insertando señal en Supabase:', error);
            throw error;
        }

        console.log('✅ Señal insertada correctamente en Supabase, ID:', data[0].id);
        res.status(200).json({ 
            success: true, 
            data,
            message: 'Señal enviada correctamente'
        });
    } catch (error) {
        console.error('❌ Error enviando señal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para actualizar estado de una señal (solo admin)
app.put('/api/signals/:id', async (req, res) => {
    console.log('📨 Recibida solicitud para actualizar señal:', req.params.id, req.body);
    
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
    console.log('📨 Solicitando lista de señales');
    try {
        const { data, error } = await supabase
            .from('signals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        console.log(`✅ Señales obtenidas: ${data?.length || 0}`);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo señales:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener usuarios
app.get('/api/users', async (req, res) => {
    console.log('📨 Solicitando lista de usuarios');
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log(`✅ Usuarios obtenidos: ${data?.length || 0}`);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para hacer usuario VIP
app.post('/api/users/vip', async (req, res) => {
    console.log('📨 Solicitando hacer usuario VIP:', req.body);
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
    console.log('📨 Solicitando quitar VIP:', req.body);
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
    console.log('📨 Solicitando notificación de 10 minutos:', req.body);
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
    console.log('📨 Solicitando inicio de sesión:', req.body);
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
    console.log('📨 Solicitando fin de sesión:', req.body);
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
    console.log(`🌐 Health check disponible en: http://localhost:${PORT}/health`);
    console.log(`📊 API disponible en: http://localhost:${PORT}/api`);
    console.log('🚀 Servidor completamente operativo');
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rechazada no manejada:', reason);
});
