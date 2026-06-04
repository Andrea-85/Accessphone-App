import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// Validamos que la clave secreta exista al arrancar
if (!JWT_SECRET) {
    throw new Error("ERROR CRÍTICO: JWT_SECRET no está definido en el archivo .env");
}

export const registrarUsuario = async (req: any) => {
    const { nombre, email, password, rol, organizationId } = req.body;

    return await prisma.usuarios.create({
        data: { 
            nombre, 
            email, 
            password, // Recuerda: en producción, siempre hashea el password (bcrypt)
            rol: rol || "vendedor", 
            organizationId: Number(organizationId) || Number(req.organizationId) 
        }
    });
};

export const loginUsuario = async (req: any) => {
    const { email, password, organizationId } = req.body;

    const usuario = await prisma.usuarios.findFirst({
        where: { 
            email, 
            organizationId: Number(organizationId) 
        }
    });

    if (!usuario || usuario.password !== password) {
        throw new Error("Credenciales inválidas o empresa no encontrada");
    }

    // Generamos el token de manera segura
    const token = jwt.sign(
        { userId: usuario.id, email: usuario.email, organizationId, role: usuario.rol },
        JWT_SECRET,
        { expiresIn: '24h' } // Esto es correcto y seguro
    );

    return { 
        token, 
        usuario: { 
            nombre: usuario.nombre, 
            rol: usuario.rol 
        } 
    };
};