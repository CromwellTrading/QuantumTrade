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
console.log('🔧 [SERVER] Configuración cargada:');
console.log('🔧 [SERVER] SUPABASE_URL:', SUPABASE_URL ? '✅ Configurado' : '❌ Faltante');
console.log('🔧 [SERVER] SUPABASE_KEY:', SUPABASE_KEY ? '✅ Configurado' : '❌ Faltante');
console.log('🔧 [SERVER] ADMIN_ID:', ADMIN_ID);
console.log('🔧 [SERVER] RENDER_URL:', RENDER_URL);

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
// FUNCIÓN PARA INICIALIZAR USUARIO ADMIN
// =============================================

async function initializeAdminUser() {
    try {
        console.log('🔧 [SERVER] Verificando usuario administrador...');
        
        // Verificar si el admin ya existe
        const { data: existingAdmin, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', ADMIN_ID)
            .single();

        if (findError && findError.code === 'PGRST116') {
            // Admin no existe, crearlo
            console.log('👑 [SERVER] Creando usuario administrador...');
            
            const adminExpiry = new Date();
            adminExpiry.setFullYear(adminExpiry.getFullYear() + 10); // VIP por 10 años
            
            const { data: newAdmin, error: createError } = await supabase
                .from('users')
                .insert([
                    {
                        telegram_id: ADMIN_ID,
                        username: 'Asche90',
                        first_name: '☣︎𝐀𝐬𝐜𝐡𝐞᭄ᬊ𝐀𝐬𝐤𝐞𝐥𝐚𝐝𝐝𝐞n☬',
                        is_admin: true,
                        is_vip: true,
                        vip_expires_at: adminExpiry.toISOString(),
                        created_at: new Date().toISOString()
                    }
                ])
                .select();

            if (createError) {
                console.error('❌ [SERVER] Error creando admin:', createError);
            } else {
                console.log('✅ [SERVER] Usuario administrador creado exitosamente:', newAdmin);
            }
        } else if (existingAdmin) {
            console.log('✅ [SERVER] Usuario administrador ya existe:', existingAdmin.telegram_id);
            
            // Asegurarse de que el admin tenga los privilegios correctos
            if (!existingAdmin.is_admin || !existingAdmin.is_vip) {
                console.log('🔄 [SERVER] Actualizando privilegios de administrador...');
                
                const adminExpiry = new Date();
                adminExpiry.setFullYear(adminExpiry.getFullYear() + 10);
                
                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        is_admin: true,
                        is_vip: true,
                        vip_expires_at: adminExpiry.toISOString()
                    })
                    .eq('telegram_id', ADMIN_ID);
                
                if (updateError) {
                    console.error('❌ [SERVER] Error actualizando admin:', updateError);
                } else {
                    console.log('✅ [SERVER] Privilegios de administrador actualizados');
                }
            }
        }
    } catch (error) {
        console.error('❌ [SERVER] Error en initializeAdminUser:', error);
    }
}

// =============================================
// CONFIGURACIÓN DEL SERVIDOR WEB
// =============================================

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Middleware de logging para TODAS las requests
app.use((req, res, next) => {
    console.log(`🌐 [SERVER] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log(`🌐 [SERVER] Query parameters:`, req.query);
    console.log(`🌐 [SERVER] Headers:`, {
        'user-agent': req.headers['user-agent'],
        'referer': req.headers['referer'],
        'origin': req.headers['origin']
    });
    next();
});

// Servir el archivo HTML principal
app.get('/', (req, res) => {
    console.log(`📄 [SERVER] Sirviendo index.html`);
    console.log(`📄 [SERVER] Parámetros recibidos en /:`, req.query);
    console.log(`📄 [SERVER] tgid parameter:`, req.query.tgid);
    
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check mejorado
app.get('/health', (req, res) => {
    console.log(`🏥 [SERVER] Health check - Query:`, req.query);
    
    const healthData = {
        status: 'OK',
        message: 'Quantum Signal Trader is running',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime() / 60) + ' minutos',
        query_params: req.query
    };
    
    res.status(200).json(healthData);
});

// =============================================
// ENDPOINT MEJORADO PARA INFORMACIÓN DE USUARIO
// =============================================

app.get('/api/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`👤 [SERVER] GET /api/user/${userId}`);
        console.log(`👤 [SERVER] ¿Es ADMIN_ID? ${userId === ADMIN_ID}`);
        console.log(`👤 [SERVER] ADMIN_ID configurado: ${ADMIN_ID}`);
        console.log(`👤 [SERVER] userId recibido: ${userId} (tipo: ${typeof userId})`);
        
        // VERIFICACIÓN ROBUSTA DE ADMIN
        const isAdminByID = String(userId).trim() === String(ADMIN_ID).trim();
        
        console.log(`🔍 [SERVER] Buscando usuario en BD: ${userId}`);
        
        // Obtener información del usuario de Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', userId)
            .single();

        if (error) {
            console.error(`❌ [SERVER] Error en consulta de usuario:`, error);
            if (error.code === 'PGRST116') {
                console.log(`👤 [SERVER] Usuario ${userId} no encontrado en BD, creando nuevo...`);
                
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
                
                console.log(`✅ [SERVER] Datos de usuario (nuevo):`, userData);
                return res.json({ success: true, data: userData });
            } else {
                throw error;
            }
        }

        // Si el usuario existe en la BD, USAR LOS DATOS DEL SERVIDOR COMO ÚNICA FUENTE DE VERDAD
        const finalIsAdmin = user.is_admin || isAdminByID;
        const finalIsVip = user.is_vip || isAdminByID;

        console.log(`🔍 [SERVER] Usuario BD - is_admin: ${user.is_admin}, is_vip: ${user.is_vip}`);
        console.log(`🔍 [SERVER] Por ID - isAdminByID: ${isAdminByID}`);
        console.log(`🔍 [SERVER] Resultado final - Admin: ${finalIsAdmin}, VIP: ${finalIsVip}`);

        const userData = {
            telegram_id: user.telegram_id,
            is_admin: finalIsAdmin,
            is_vip: finalIsVip,
            vip_expires_at: user.vip_expires_at,
            username: user.username,
            first_name: user.first_name
        };

        console.log(`✅ [SERVER] Datos de usuario finales:`, userData);
        
        res.json({ success: true, data: userData });
    } catch (error) {
        console.error('❌ [SERVER] Error obteniendo usuario:', error);
        res.status(500).json({ error: error.message });
    }
});

// =============================================
// ENDPOINTS DE ADMINISTRACIÓN (SOLO ADMIN)
// =============================================

// Middleware para verificar admin
async function verifyAdmin(userId) {
    console.log(`🔐 [SERVER] Verificando permisos de admin para: ${userId}`);
    
    // Verificación directa por ID
    const isAdminByID = String(userId).trim() === String(ADMIN_ID).trim();
    
    if (isAdminByID) {
        console.log(`✅ [SERVER] Usuario ${userId} es admin por ID`);
        return true;
    }
    
    // Verificar en base de datos por si acaso
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('is_admin')
            .eq('telegram_id', userId)
            .single();

        if (error || !user) {
            console.log(`❌ [SERVER] Usuario no encontrado o error:`, error);
            return false;
        }

        const isAdmin = user.is_admin;
        console.log(`🔍 [SERVER] Usuario ${userId} - is_admin en BD: ${isAdmin}`);
        
        return isAdmin;
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
        
        // Verificar permisos de admin
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            console.log(`❌ [SERVER] Usuario ${userId} no tiene permisos de admin`);
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
        
        // Verificar permisos de admin
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            console.log(`❌ [SERVER] Usuario ${userId} no tiene permisos de admin`);
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

        console.log(`✅ [SERVER] Búsqueda completada - Usuario encontrado: ${!!user}`);
        
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

        // Verificar permisos de admin
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            console.log(`❌ [SERVER] Usuario ${userId} no tiene permisos de admin`);
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
            console.log(`👤 [SERVER] Creando nuevo usuario VIP: ${telegramId}`);
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
            console.log(`👤 [SERVER] Actualizando usuario existente a VIP: ${telegramId}`);
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

        // Verificar permisos de admin
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            console.log(`❌ [SERVER] Usuario ${userId} no tiene permisos de admin`);
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
// ENDPOINTS DE SEÑALES
// =============================================

// Endpoint para enviar señales (solo admin)
app.post('/api/signals', async (req, res) => {
    try {
        const { asset, timeframe, direction, userId } = req.body;

        console.log(`📡 [SERVER] Enviando señal: ${asset} ${direction} ${timeframe}min - Solicitado por: ${userId}`);

        // Verificar permisos de admin
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            console.log(`❌ [SERVER] Usuario ${userId} no tiene permisos de admin`);
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        if (!asset || !timeframe || !direction) {
            console.log(`❌ [SERVER] Faltan campos requeridos para señal`);
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

        console.log('✅ [SERVER] Señal enviada correctamente:', asset, direction, timeframe + 'min');
        
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

// Endpoint para actualizar estado de una señal (solo admin)
app.put('/api/signals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, userId } = req.body;

        console.log(`🔄 [SERVER] Actualizando señal ${id} a estado: ${status} - Solicitado por: ${userId}`);

        // Verificar permisos de admin
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            console.log(`❌ [SERVER] Usuario ${userId} no tiene permisos de admin`);
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        // Actualizar señal en Supabase
        const { data, error } = await supabase
            .from('signals')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) throw error;

        console.log(`✅ [SERVER] Señal ${id} actualizada a: ${status}`);
        
        res.status(200).json({ 
            success: true, 
            data,
            message: `Estado actualizado a: ${status}`
        });
    } catch (error) {
        console.error('❌ [SERVER] Error actualizando señal:', error);
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

// Endpoint para notificar a los clientes (10 minutos)
app.post('/api/notify', async (req, res) => {
    try {
        const { userId } = req.body;

        console.log(`🔔 [SERVER] Notificación de 10 minutos solicitada por: ${userId}`);

        // Verificar permisos de admin
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            console.log(`❌ [SERVER] Usuario ${userId} no tiene permisos de admin`);
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

// Endpoint para iniciar sesión
app.post('/api/sessions/start', async (req, res) => {
    try {
        const { userId } = req.body;

        console.log(`▶️ [SERVER] Iniciando sesión para usuario: ${userId}`);

        // Verificar permisos de admin
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            console.log(`❌ [SERVER] Usuario ${userId} no tiene permisos de admin`);
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

// Endpoint para finalizar sesión
app.post('/api/sessions/end', async (req, res) => {
    try {
        const { userId } = req.body;

        console.log(`⏹️ [SERVER] Finalizando sesión para usuario: ${userId}`);

        // Verificar permisos de admin
        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            console.log(`❌ [SERVER] Usuario ${userId} no tiene permisos de admin`);
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
// ENDPOINT PARA DEBUG
// =============================================

app.get('/api/debug/request', (req, res) => {
    const debugInfo = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        headers: {
            'user-agent': req.headers['user-agent'],
            'referer': req.headers['referer'],
            'origin': req.headers['origin'],
            'host': req.headers['host']
        },
        body: req.body
    };
    
    console.log(`🐛 [DEBUG] Información completa de request:`, debugInfo);
    
    res.json({ 
        success: true, 
        message: 'Debug information',
        data: debugInfo 
    });
});

// =============================================
// INICIO DEL SERVIDOR
// =============================================

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ [SERVER] Servidor web ejecutándose en puerto ${PORT}`);
    console.log('🚀 [SERVER] Servidor completamente operativo');
    console.log(`🌐 [SERVER] URL: ${RENDER_URL}`);
    
    // Inicializar el usuario admin al arrancar el servidor
    await initializeAdminUser();
});

// =============================================
// KEEP-ALIVE PARA PREVENIR SUSPENSIÓN
// =============================================

console.log('🔧 [SERVER] Configurando sistema keep-alive...');

// Función para mantener el servidor activo
const keepAlive = async () => {
    try {
        const response = await fetch(`${RENDER_URL}/health`);
        console.log(`🔄 [KEEP-ALIVE] ${response.status} - ${new Date().toLocaleTimeString()}`);
    } catch (error) {
        console.error('❌ [KEEP-ALIVE] Error:', error.message);
    }
};

// Ejecutar keep-alive cada 5 minutos
setInterval(keepAlive, 5 * 60 * 1000);

console.log('✅ [SERVER] Sistema keep-alive configurado');

// Manejo de errores
process.on('uncaughtException', (error) => {
    console.error('❌ [SERVER] Error no capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ [SERVER] Promise rechazada:', reason);
});
