import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const SECRET_KEY = "Accessphone_Secret_2026"; // Esta es la firma de tus llaves

export const registrarUsuario = async (data: any) => {
    const salt = await bcrypt.genSalt(10);
    const passwordEncriptada = await bcrypt.hash(data.password, salt);

    return await prisma.usuarios.create({
        data: {
            nombre: data.nombre,
            email: data.email,
            password: passwordEncriptada,
            rol: data.rol || "vendedor"
        }
    });
};

export const loginUsuario = async (email: string, passwordPlana: string) => {
    const usuario = await prisma.usuarios.findUnique({ where: { email } });
    if (!usuario) throw new Error("Usuario no encontrado");

    const esCorrecta = await bcrypt.compare(passwordPlana, usuario.password);
    if (!esCorrecta) throw new Error("Contraseña incorrecta");

    const token = jwt.sign(
        { id: usuario.id, rol: usuario.rol },
        SECRET_KEY,
        { expiresIn: '8h' }
    );

    // AQUÍ: Solo devolvemos lo que el Front necesita, NUNCA la contraseña
    return { 
        usuario: { 
            id: usuario.id,
            nombre: usuario.nombre, 
            email: usuario.email,
            rol: usuario.rol 
        }, 
        token 
    };
};