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

console.log('=== 🚀 INICIANDO SERVIDOR CON SISTEMA DE RESULTADOS ===');

// Verificar configuración
if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ ERROR: Faltan variables de entorno de Supabase');
    process.exit(1);
}

// =============================================
// INICIALIZACIÓN DE SUPABASE
// =============================================

console.log('🔄 [SERVER] Conectando con la base de datos...');
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log('✅ [SERVER] Conexión a Supabase establecida');

// =============================================
// CONFIGURACIÓN DEL SERVIDOR WEB
// =============================================

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Middleware de logging
app.use((req, res, next) => {
    console.log(`🌐 [SERVER] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Servir el archivo HTML principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Quantum Signal Trader with Results System is running',
        timestamp: new Date().toISOString()
    });
});

// =============================================
// ENDPOINTS DE USUARIO
// =============================================

app.get('/api/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`👤 [SERVER] GET /api/user/${userId}`);
        
        // Verificación de admin
        const isAdminByID = String(userId).trim() === String(ADMIN_ID).trim();
        
        // Obtener información del usuario de Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Si no existe, crear usuario con privilegios de admin si corresponde
                const userData = {
                    telegram_id: userId,
                    is_admin: isAdminByID,
                    is_vip: isAdminByID,
                    vip_expires_at: isAdminByID ? new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString() : null,
                    username: null,
                    first_name: null,
                    created_at: new Date().toISOString()
                };
                
                return res.json({ success: true, data: userData });
            } else {
                throw error;
            }
        }

        // Si el usuario existe en la BD
        const finalIsAdmin = user.is_admin || isAdminByID;
        const finalIsVip = user.is_vip || isAdminByID;

        const userData = {
            telegram_id: user.telegram_id,
            is_admin: finalIsAdmin,
            is_vip: finalIsVip,
            vip_expires_at: user.vip_expires_at,
            username: user.username,
            first_name: user.first_name
        };
        
        res.json({ success: true, data: userData });
    } catch (error) {
        console.error('❌ [SERVER] Error obteniendo usuario:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// ENDPOINTS DE ADMINISTRACIÓN
// =============================================

// Middleware para verificar admin
async function verifyAdmin(userId) {
    const isAdminByID = String(userId).trim() === String(ADMIN_ID).trim();
    
    if (isAdminByID) {
        return true;
    }
    
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('is_admin')
            .eq('telegram_id', userId)
            .single();

        if (error || !user) {
            return false;
        }

        return user.is_admin;
    } catch (error) {
        console.error('❌ [SERVER] Error verificando admin:', error);
        return false;
    }
}

// Endpoint para obtener todos los usuarios
app.get('/api/users', async (req, res) => {
    try {
        const { userId } = req.query;
        
        console.log(`👥 [SERVER] GET /api/users - Solicitado por: ${userId}`);
        
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log(`✅ [SERVER] ${users?.length || 0} usuarios obtenidos`);
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error('❌ [SERVER] Error obteniendo usuarios:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para buscar usuario por ID
app.get('/api/users/search/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        const { userId } = req.query;
        
        console.log(`🔍 [SERVER] Buscando usuario: ${telegramId} - Solicitado por: ${userId}`);
        
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

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
        console.error('❌ [SERVER] Error buscando usuario:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para hacer usuario VIP
app.post('/api/users/vip', async (req, res) => {
    try {
        const { telegramId, userId, days = 30 } = req.body;

        console.log(`👑 [SERVER] Haciendo VIP usuario: ${telegramId} por ${days} días - Solicitado por: ${userId}`);

        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
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

        console.log(`✅ [SERVER] Usuario ${telegramId} ahora es VIP por ${days} días`);
        
        res.status(200).json({ 
            success: true, 
            data: result.data,
            message: `Usuario ${telegramId} ahora es VIP por ${days} días`
        });
    } catch (error) {
        console.error('❌ [SERVER] Error haciendo usuario VIP:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para quitar VIP
app.post('/api/users/remove-vip', async (req, res) => {
    try {
        const { telegramId, userId } = req.body;

        console.log(`👑 [SERVER] Quitando VIP a usuario: ${telegramId} - Solicitado por: ${userId}`);

        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
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

        console.log(`✅ [SERVER] VIP removido del usuario: ${telegramId}`);
        
        res.status(200).json({ 
            success: true, 
            data,
            message: `Usuario ${telegramId} ya no es VIP`
        });
    } catch (error) {
        console.error('❌ [SERVER] Error quitando VIP:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// ENDPOINTS DE SEÑALES CON SISTEMA DE RESULTADOS
// =============================================

// Endpoint para enviar señales (solo admin)
app.post('/api/signals', async (req, res) => {
    try {
        const { asset, timeframe, direction, userId } = req.body;

        console.log(`📡 [SERVER] Enviando señal: ${asset} ${direction} ${timeframe}min - Solicitado por: ${userId}`);

        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
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
                    is_free: true,
                    status: 'pending'
                }
            ])
            .select();

        if (error) throw error;

        console.log('✅ [SERVER] Señal enviada correctamente con ID:', data[0].id);
        
        res.status(200).json({ 
            success: true, 
            data,
            message: 'Señal enviada correctamente'
        });
    } catch (error) {
        console.error('❌ [SERVER] Error enviando señal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para actualizar estado de una señal (solo admin) - MEJORADO
app.put('/api/signals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, userId } = req.body;

        console.log(`🔄 [SERVER] Actualizando señal ${id} a estado: ${status} - Solicitado por: ${userId}`);

        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        // En el endpoint PUT /api/signals/:id
if (!['pending', 'expired', 'profit', 'loss'].includes(status)) {
    return res.status(400).json({ error: 'Estado inválido. Use: pending, expired, profit o loss' });
}

        // Actualizar señal en Supabase
        const { data, error } = await supabase
            .from('signals')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;

        if (data && data.length > 0) {
            console.log(`✅ [SERVER] Señal ${id} actualizada a: ${status}`);
            
            res.status(200).json({ 
                success: true, 
                data,
                message: `Estado actualizado a: ${status}`
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Señal no encontrada'
            });
        }
    } catch (error) {
        console.error('❌ [SERVER] Error actualizando señal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// NUEVO: Endpoint para obtener señales pendientes de resultado
app.get('/api/signals/pending', async (req, res) => {
    try {
        const { userId } = req.query;
        
        console.log(`📋 [SERVER] Obteniendo señales pendientes - Solicitado por: ${userId}`);

        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        const { data, error } = await supabase
            .from('signals')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log(`✅ [SERVER] ${data?.length || 0} señales pendientes obtenidas`);
        
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('❌ [SERVER] Error obteniendo señales pendientes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener señales
app.get('/api/signals', async (req, res) => {
    try {
        console.log(`📡 [SERVER] Obteniendo señales`);
        
        const { data, error } = await supabase
            .from('signals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        console.log(`✅ [SERVER] ${data?.length || 0} señales obtenidas`);
        
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('❌ [SERVER] Error obteniendo señales:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// ENDPOINTS DE SESIONES Y NOTIFICACIONES
// =============================================

app.post('/api/notify', async (req, res) => {
    try {
        const { userId } = req.body;

        console.log(`🔔 [SERVER] Notificación de 10 minutos solicitada por: ${userId}`);

        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        console.log(`✅ [SERVER] Notificación de 10 minutos procesada`);
        
        res.status(200).json({ 
            success: true, 
            message: 'Notificación de 10 minutos enviada' 
        });
    } catch (error) {
        console.error('❌ [SERVER] Error enviando notificación:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/sessions/start', async (req, res) => {
    try {
        const { userId } = req.body;

        console.log(`▶️ [SERVER] Iniciando sesión para usuario: ${userId}`);

        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        console.log(`✅ [SERVER] Sesión iniciada para admin: ${userId}`);
        
        res.status(200).json({ 
            success: true,
            message: 'Sesión iniciada correctamente'
        });
    } catch (error) {
        console.error('❌ [SERVER] Error iniciando sesión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/sessions/end', async (req, res) => {
    try {
        const { userId } = req.body;

        console.log(`⏹️ [SERVER] Finalizando sesión para usuario: ${userId}`);

        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        console.log(`✅ [SERVER] Sesión finalizada para admin: ${userId}`);
        
        res.status(200).json({ 
            success: true,
            message: 'Sesión finalizada correctamente'
        });
    } catch (error) {
        console.error('❌ [SERVER] Error finalizando sesión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// INICIO DEL SERVIDOR
// =============================================

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ [SERVER] Servidor web ejecutándose en puerto ${PORT}`);
    console.log('🚀 [SERVER] Sistema de resultados activado');
    console.log(`🌐 [SERVER] URL: ${RENDER_URL}`);
});

// Keep-alive para prevenir suspensión
const keepAlive = async () => {
    try {
        const response = await fetch(`${RENDER_URL}/health`);
        console.log(`🔄 [KEEP-ALIVE] ${response.status} - ${new Date().toLocaleTimeString()}`);
    } catch (error) {
        console.error('❌ [KEEP-ALIVE] Error:', error.message);
    }
};

setInterval(keepAlive, 5 * 60 * 1000);
console.log('✅ [SERVER] Sistema keep-alive configurado');
