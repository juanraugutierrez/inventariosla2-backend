import prisma from '../config/prisma.js';
import jwt from 'jsonwebtoken';

/**
 * INICIAR SESIÓN DE USUARIO
 * POST /api/auth/login
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validar campos requeridos
        if (!email || !password) {
            return res.status(400).json({ error: 'El correo y la contraseña son obligatorios.' });
        }

        // 2. Buscar usuario en MySQL e incluir su perfil/rol relacional
        const usuario = await prisma.usuario.findUnique({
            where: { email: email.trim() },
            include: { perfil: true }
        });

        // 3. Si el usuario no existe
        if (!usuario) {
            return res.status(401).json({ error: 'Las credenciales ingresadas no son válidas.' });
        }

        // 4. Verificar si el usuario está activo en el sistema
        if (!usuario.activo) {
            return res.status(403).json({ error: 'Tu cuenta se encuentra suspendida. Contacta al administrador.' });
        }

        // 5. Validar contraseña (Comparación directa para tus semillas de datos actuales)
        // Nota: En producción aquí usarías bcrypt.compareSync(password, usuario.password_hash)
        if (password !== usuario.password_hash) {
            return res.status(401).json({ error: 'Las credenciales ingresadas no son válidas.' });
        }

        // 6. Generar el Payload del JWT adaptado a tus middlewares existentes
        const payload = {
            id: usuario.id,
            nombre: usuario.nombre_completo,
            email: usuario.email,
            perfil_id: usuario.perfil_id,
            role: usuario.perfil?.nombre === 'Administrador General' ? 'ADMINISTRADOR_SISTEMA' : 'OPERARIO'
        };

        // 7. Firmar el Token usando la clave secreta de tu .env (caduca en 24 horas)
        const token = jwt.sign(payload, process.env.JWT_SECRET || 'CLAVE_SECRETA_POR_DEFECTO', {
            expiresIn: '24h'
        });

        // 8. Responder con el Token y la información limpia del usuario
        return res.json({
            message: 'Autenticación exitosa.',
            token,
            user: {
                nombre: usuario.nombre_completo,
                email: usuario.email,
                rol: usuario.perfil?.nombre
            }
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Error crítico en el proceso de autenticación',
            details: error.message
        });
    }
};