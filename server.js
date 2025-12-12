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
const BOT_NOTIFICATION_URL = process.env.BOT_NOTIFICATION_URL || 'http://localhost:3001';

console.log('=== 🚀 INICIANDO SERVIDOR CON SISTEMA COMPLETO ===');

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
        message: 'Quantum Signal Trader with Notifications System is running',
        timestamp: new Date().toISOString()
    });
});

// =============================================
// FUNCIONES AUXILIARES
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
                    preferred_broker: 'olymptrade',
                    free_signals_used: 0,
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
            first_name: user.first_name,
            preferred_broker: user.preferred_broker || 'olymptrade',
            free_signals_used: user.free_signals_used || 0
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
                    preferred_broker: 'olymptrade',
                    free_signals_used: 0,
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
// ENDPOINTS PARA free_signals_used
// =============================================

// Endpoint para actualizar free_signals_used
app.post('/api/users/update-free-signals', async (req, res) => {
    try {
        const { telegramId, freeSignalsUsed } = req.body;

        console.log(`🔄 [SERVER] Actualizando free_signals_used para ${telegramId} a ${freeSignalsUsed}`);

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
                    free_signals_used: freeSignalsUsed,
                    preferred_broker: 'olymptrade',
                    created_at: new Date().toISOString()
                })
                .select();
        } else {
            // Usuario existe, actualizar
            result = await supabase
                .from('users')
                .update({ 
                    free_signals_used: freeSignalsUsed
                })
                .eq('telegram_id', telegramId)
                .select();
        }

        if (result.error) throw result.error;

        console.log(`✅ [SERVER] free_signals_used actualizado para ${telegramId}: ${freeSignalsUsed}`);
        
        res.status(200).json({ 
            success: true, 
            data: result.data,
            message: `free_signals_used actualizado a ${freeSignalsUsed}`
        });
    } catch (error) {
        console.error('❌ [SERVER] Error actualizando free_signals_used:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para resetear free_signals_used (Solo admin)
app.post('/api/users/reset-free-signals', async (req, res) => {
    try {
        const { userId } = req.body;

        console.log(`🔄 [SERVER] Reseteando free_signals_used para todos los usuarios - Solicitado por: ${userId}`);

        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        const { data, error } = await supabase
            .from('users')
            .update({ 
                free_signals_used: 0
            })
            .neq('telegram_id', ADMIN_ID) // No resetear al admin
            .select();

        if (error) throw error;

        console.log(`✅ [SERVER] free_signals_used reseteado para todos los usuarios`);
        
        res.status(200).json({ 
            success: true, 
            data,
            message: 'free_signals_used reseteado para todos los usuarios'
        });
    } catch (error) {
        console.error('❌ [SERVER] Error reseteando free_signals_used:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// ENDPOINTS PARA BROKERS - NUEVOS
// =============================================

// Endpoint para obtener brokers disponibles
app.get('/api/brokers', async (req, res) => {
    try {
        const brokers = [
            {
                id: 'olymptrade',
                name: 'Olymptrade',
                description: 'Plataforma regulada internacionalmente',
                min_deposit: 10,
                currency: 'USD',
                affiliate_link: 'https://olymptrade.com/pages/referral/?rf=108107566',
                active: true
            },
            {
                id: 'quotex',
                name: 'Quotex',
                description: 'Plataforma moderna con múltiples activos',
                min_deposit: 10,
                currency: 'USD',
                affiliate_link: 'https://qxbroker.com/es/promo/partner/108107566?qa=signals',
                active: true
            }
        ];
        
        res.status(200).json({ success: true, data: brokers });
    } catch (error) {
        console.error('❌ [SERVER] Error obteniendo brokers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para actualizar broker preferido del usuario
app.post('/api/users/update-broker', async (req, res) => {
    try {
        const { telegramId, broker } = req.body;

        console.log(`🔄 [SERVER] Actualizando broker a ${broker} para usuario: ${telegramId}`);

        // Validar broker
        if (!['olymptrade', 'quotex'].includes(broker)) {
            return res.status(400).json({ error: 'Broker inválido. Use: olimptrade o quotex' });
        }

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
                    preferred_broker: broker,
                    created_at: new Date().toISOString()
                })
                .select();
        } else {
            // Usuario existe, actualizar
            result = await supabase
                .from('users')
                .update({ 
                    preferred_broker: broker,
                    updated_at: new Date().toISOString()
                })
                .eq('telegram_id', telegramId)
                .select();
        }

        if (result.error) throw result.error;

        console.log(`✅ [SERVER] Broker actualizado para ${telegramId}: ${broker}`);
        
        res.status(200).json({ 
            success: true, 
            data: result.data,
            message: `Broker actualizado a: ${broker}`
        });
    } catch (error) {
        console.error('❌ [SERVER] Error actualizando broker:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// ENDPOINT PARA "MOSTRAR ACTIVO" (Alerta Previa) - NUEVO
// =============================================

app.post('/api/signals/preview', async (req, res) => {
    try {
        const { asset, broker, userId } = req.body;

        console.log(`👁️ [SERVER] Mostrando activo previo: ${asset} para broker: ${broker} - Solicitado por: ${userId}`);

        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        if (!asset || !broker) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Validar broker
        if (!['olymptrade', 'quotex'].includes(broker)) {
            return res.status(400).json({ error: 'Broker inválido' });
        }

        // Enviar notificación al bot para que la distribuya
        const botResponse = await fetch(`${BOT_NOTIFICATION_URL}/api/telegram/preview-asset`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                asset, 
                broker, 
                userId: ADMIN_ID 
            })
        });

        const result = await botResponse.json();

        if (result.success) {
            res.status(200).json({ 
                success: true,
                message: `Alerta de activo enviada a VIPs de ${broker}: ${asset}`
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: result.error || 'Error enviando alerta de activo' 
            });
        }

    } catch (error) {
        console.error('❌ [SERVER] Error mostrando activo previo:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// ENDPOINTS DE REFERIDOS - NUEVOS
// =============================================

// Endpoint para obtener referidos de un usuario
app.get('/api/referrals/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`👥 [SERVER] Obteniendo referidos para usuario: ${userId}`);

        // Obtener referidos directos
        const { data: referrals, error: referralsError } = await supabase
            .from('referrals')
            .select('referred_id, created_at')
            .eq('referrer_id', userId);

        if (referralsError) throw referralsError;

        // Obtener información de los referidos
        let referidosInfo = [];
        if (referrals && referrals.length > 0) {
            const referredIds = referrals.map(r => r.referred_id);
            
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('telegram_id, username, first_name, is_vip, created_at')
                .in('telegram_id', referredIds);

            if (usersError) throw usersError;

            // Combinar información
            referidosInfo = referrals.map(ref => {
                const user = users?.find(u => u.telegram_id === ref.referred_id);
                return {
                    telegram_id: ref.referred_id,
                    username: user?.username,
                    first_name: user?.first_name,
                    is_vip: user?.is_vip || false,
                    referred_at: ref.created_at
                };
            });
        }

        // Calcular estadísticas
        const total = referidosInfo.length;
        const vip = referidosInfo.filter(r => r.is_vip).length;
        
        // Calcular descuento (10% por cada referido VIP, máximo 50%)
        const discount = Math.min(vip * 10, 50);
        
        // Calcular bonificaciones
        let bonus = '';
        if (vip >= 20) {
            bonus = '20 USDT GRATIS';
        } else if (vip >= 10) {
            bonus = 'MES GRATIS';
        }

        res.status(200).json({ 
            success: true,
            data: {
                referrals: referidosInfo,
                stats: {
                    total: total,
                    vip: vip,
                    regular: total - vip
                },
                discount: discount,
                bonus: bonus,
                next_month_free: vip >= 10
            }
        });
    } catch (error) {
        console.error('❌ [SERVER] Error obteniendo referidos:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para registrar un referido
app.post('/api/referrals/register', async (req, res) => {
    try {
        const { referrerId, referredId } = req.body;

        console.log(`📝 [SERVER] Registrando referido: ${referredId} por referidor: ${referrerId}`);

        if (!referrerId || !referredId) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Verificar que no sea auto-referido
        if (referrerId === referredId) {
            return res.status(400).json({ error: 'No puedes referirte a ti mismo' });
        }

        // Insertar referido
        const { data, error } = await supabase
            .from('referrals')
            .insert([
                {
                    referrer_id: referrerId,
                    referred_id: referredId
                }
            ])
            .select();

        if (error) {
            // Si ya existe, no es error
            if (error.code === '23505') { // Violación de constraint único
                return res.status(200).json({ 
                    success: true, 
                    message: 'Referido ya registrado' 
                });
            }
            throw error;
        }

        // Actualizar campo referred_by en usuario
        await supabase
            .from('users')
            .update({ referred_by: referrerId })
            .eq('telegram_id', referredId)
            .is('referred_by', null);

        console.log(`✅ [SERVER] Referido registrado: ${referredId} por ${referrerId}`);

        res.status(200).json({ 
            success: true,
            message: 'Referido registrado exitosamente'
        });
    } catch (error) {
        console.error('❌ [SERVER] Error registrando referido:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para generar enlace de referido
app.get('/api/referrals/link/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        console.log(`🔗 [SERVER] Generando enlace de referido para: ${userId}`);

        if (!userId) {
            return res.status(400).json({ error: 'Falta ID de usuario' });
        }

        const referralLink = `https://t.me/QuantumQvabot?start=ref_${userId}`;
        
        res.status(200).json({ 
            success: true,
            data: {
                referral_link: referralLink,
                user_id: userId
            },
            message: 'Enlace de referido generado exitosamente'
        });
    } catch (error) {
        console.error('❌ [SERVER] Error generando enlace de referido:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// ENDPOINTS DE SEÑALES - MODIFICADOS PARA BROKER
// =============================================

// Endpoint para enviar señales (solo admin)
app.post('/api/signals', async (req, res) => {
    try {
        const { asset, timeframe, direction, userId, broker = 'olymptrade', is_free = false } = req.body;

        console.log(`📡 [SERVER] Enviando señal: ${asset} ${direction} ${timeframe}min - Broker: ${broker} - Solicitado por: ${userId}`);

        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        if (!asset || !timeframe || !direction || !broker) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        // Validar broker
        if (!['olymptrade', 'quotex'].includes(broker)) {
            return res.status(400).json({ error: 'Broker inválido. Use: olimptrade o quotex' });
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
                    is_free: is_free,
                    broker: broker,
                    status: 'pending',
                    created_at: new Date().toISOString()
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

// Endpoint para actualizar estado de una señal (solo admin)
app.put('/api/signals/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, userId } = req.body;

        console.log(`🔄 [SERVER] Actualizando señal ${id} a estado: ${status} - Solicitado por: ${userId}`);

        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        // Validar estados permitidos
        if (!['pending', 'expired', 'profit', 'loss'].includes(status)) {
            return res.status(400).json({ error: 'Estado inválido. Use: pending, expired, profit o loss' });
        }

        // Verificar que la señal existe
        const { data: existingSignal, error: findError } = await supabase
            .from('signals')
            .select('*')
            .eq('id', id)
            .single();

        if (findError || !existingSignal) {
            return res.status(404).json({ 
                success: false, 
                error: 'Señal no encontrada' 
            });
        }

        // Actualizar señal en Supabase
        const { data, error } = await supabase
            .from('signals')
            .update({ 
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) throw error;

        if (data && data.length > 0) {
            console.log(`✅ [SERVER] Señal ${id} actualizada a: ${status}`);
            
            res.status(200).json({ 
                success: true, 
                data: data[0],
                message: `Estado actualizado a: ${status}`
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: 'Señal no encontrada después de actualizar'
            });
        }
    } catch (error) {
        console.error('❌ [SERVER] Error actualizando señal:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Endpoint para obtener señales pendientes de resultado
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
// ENDPOINT PARA NOTIFICACIONES DE TELEGRAM
// =============================================

app.post('/api/telegram/notify', async (req, res) => {
    try {
        const { message, type, userId } = req.body;
        
        console.log('📨 [SERVER] Notificación recibida desde webapp:', { type, userId });
        
        // Verificar si es admin
        if (userId !== ADMIN_ID) {
            return res.status(403).json({ 
                success: false, 
                error: 'Solo el admin puede enviar notificaciones' 
            });
        }
        
        // Hacer una petición al bot para que envíe la notificación
        const botResponse = await fetch(`${BOT_NOTIFICATION_URL}/api/telegram/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message, type, userId })
        });
        
        const result = await botResponse.json();
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ [SERVER] Error en endpoint de notificación:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Error interno del servidor' 
        });
    }
});

// =============================================
// ENDPOINT DE ESTADÍSTICAS
// =============================================

app.get('/api/stats', async (req, res) => {
    try {
        const { userId, period = 'day' } = req.query;
        
        console.log(`📊 [SERVER] Obteniendo estadísticas - Periodo: ${period} - Solicitado por: ${userId}`);

        const isAdmin = await verifyAdmin(userId);
        if (!isAdmin) {
            return res.status(403).json({ error: 'No tienes permisos de administrador' });
        }

        let startDate = new Date();
        
        if (period === 'day') {
            startDate.setHours(0, 0, 0, 0);
        } else if (period === 'week') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (period === 'month') {
            startDate.setMonth(startDate.getMonth() - 1);
        }

        const { data: signals, error } = await supabase
            .from('signals')
            .select('*')
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        const stats = {
            total: signals.length,
            profit: signals.filter(s => s.status === 'profit').length,
            loss: signals.filter(s => s.status === 'loss').length,
            pending: signals.filter(s => s.status === 'pending').length,
            expired: signals.filter(s => s.status === 'expired').length
        };

        console.log(`✅ [SERVER] Estadísticas obtenidas:`, stats);
        
        res.status(200).json({ 
            success: true,
            data: stats,
            period: period
        });
    } catch (error) {
        console.error('❌ [SERVER] Error obteniendo estadísticas:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============================================
// INICIO DEL SERVIDOR
// =============================================

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`✅ [SERVER] Servidor web ejecutándose en puerto ${PORT}`);
    console.log('🚀 [SERVER] Sistema completo activado');
    console.log(`🌐 [SERVER] URL: ${RENDER_URL}`);
    console.log('👑 [SERVER] Admin ID configurado:', ADMIN_ID);
    console.log('🔗 [SERVER] Bot notification URL:', BOT_NOTIFICATION_URL);
    
    // Procesar señales expiradas al iniciar el servidor
    try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('signals')
            .update({ 
                status: 'expired'
            })
            .eq('status', 'pending')
            .lt('expires_at', now);

        if (error) {
            console.error('❌ [SERVER] Error procesando señales expiradas al inicio:', error);
        } else {
            console.log('✅ [SERVER] Señales expiradas procesadas al inicio del servidor');
        }
    } catch (error) {
        console.error('❌ [SERVER] Error en proceso inicial de señales expiradas:', error);
    }
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

// Procesar señales expiradas periódicamente
const processExpiredSignals = async () => {
    try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('signals')
            .update({ 
                status: 'expired'
            })
            .eq('status', 'pending')
            .lt('expires_at', now);

        if (error) {
            console.error('❌ [AUTO-EXPIRY] Error procesando señales expiradas:', error);
        } else if (data) {
            console.log(`✅ [AUTO-EXPIRY] Señales procesadas automáticamente`);
        }
    } catch (error) {
        console.error('❌ [AUTO-EXPIRY] Error en proceso automático:', error);
    }
};

setInterval(keepAlive, 5 * 60 * 1000);
setInterval(processExpiredSignals, 60 * 1000); // Procesar cada minuto

console.log('✅ [SERVER] Sistema keep-alive configurado');
console.log('✅ [SERVER] Sistema de expiración automática configurado');
