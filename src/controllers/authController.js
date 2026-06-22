// src/controllers/authController.js
import prisma from '../config/prisma.js';

export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'El correo y la contraseña son requeridos.' });
    }

    try {
        // 1. Buscamos al usuario usando las relaciones exactas de tu schema.prisma
        const usuarioDB = await prisma.usuario.findFirst({
            where: { 
                email: email.trim(),
                activo: true // En tu schema está configurado como Boolean
            }, 
            include: {
                perfil: { // 👈 Nombre exacto de la relación en tu modelo 'Usuario'
                    include: {
                        perfil_permiso: { // 👈 Nombre exacto en tu modelo 'Perfil'
                            include: {
                                permiso: true // 👈 Nombre exacto en tu modelo 'perfil_permiso'
                            }
                        }
                    }
                }
            }
        });

        // 2. Si el correo no existe en la base de datos
        if (!usuarioDB) {
            return res.status(401).json({ error: 'El correo electrónico no está registrado o la cuenta está inactiva.' });
        }

        // 3. Validación de Contraseña usando 'password_hash' (tu propiedad real)
        if (usuarioDB.password_hash !== password) { 
            return res.status(401).json({ error: 'La contraseña ingresada es incorrecta.' });
        }

        // 4. Extracción dinámica de la matriz de permisos
        let listaPermisosStrings = [];
        
        if (usuarioDB.perfil && usuarioDB.perfil.nombre === 'ADMINISTRADOR') {
            // Bypass completo de privilegios para tu usuario principal
            listaPermisosStrings = [
                "VER_DASHBOARD", 
                "VER_USUARIOS", 
                "GESTIONAR_PERMISOS", 
                "permiso_crear_bodega", 
                "permiso_ingresar_stock", 
                "permiso_retirar_stock", 
                "permiso_ver_informes"
            ];
        } else if (usuarioDB.perfil && usuarioDB.perfil.perfil_permiso) {
            // Mapeo seguro para Bodegueros y Técnicos basados en las filas de tu MySQL
            listaPermisosStrings = usuarioDB.perfil.perfil_permiso
                .filter(pp => pp.permiso) 
                .map(pp => pp.permiso.codigo);
        }

        // 5. Retornar payload de sesión limpio y estructurado al Frontend
        res.json({
            message: 'Autenticación exitosa',
            usuario: {
                id: usuarioDB.id,
                nombre: usuarioDB.nombre_completo,
                email: usuarioDB.email,
                cargo: usuarioDB.perfil?.nombre || 'SIN_CARGO',
                permisos: listaPermisosStrings  
            }
        });

    } catch (error) {
        console.error("❌ ERROR DETECTADO EN EL INICIO DE SESIÓN:", error);
        res.status(500).json({ 
            error: 'Error interno en el servidor al intentar validar credenciales.', 
            details: error.message 
        });
    }
};