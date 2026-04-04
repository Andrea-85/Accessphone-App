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
    const emailLimpio = email.trim().toLowerCase();
    
    // Buscamos si el usuario ya existe
    let usuario = await prisma.usuarios.findUnique({ 
        where: { email: emailLimpio } 
    });

    // --- SI NO EXISTE (COMO AHORA), LO CREAMOS AL INSTANTE ---
    if (!usuario) {
        console.log("Creando tu usuario de nuevo...");
        const hashedPassword = await bcrypt.hash("123456", 10);
        usuario = await prisma.usuarios.create({
            data: {
                nombre: "Andrea Londoño",
                email: emailLimpio,
                password: hashedPassword,
                rol: "administrador"
            }
        });
    }

    // Comparamos la clave (123456)
    const esCorrecta = await bcrypt.compare(passwordPlana.trim(), usuario.password);
    if (!esCorrecta) throw new Error("Contraseña incorrecta");

    const token = jwt.sign(
        { id: usuario.id, rol: usuario.rol },
        SECRET_KEY,
        { expiresIn: '8h' }
    );

    return { usuario, token };
};

// --- NUEVA FUNCIÓN PARA EL REGISTRO DE NUEVO USUARIO ---
export const registrarNuevoUsuario = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        
        // Encriptamos la clave que ella elija
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);

        const nuevoUsuario = await prisma.usuarios.create({
            data: {
                nombre,
                email: email.trim().toLowerCase(),
                password: passwordEncriptada,
                rol: "vendedor" // Ella entra como vendedora por defecto
            }
        });

        res.status(201).json({ msg: "Usuario creado con éxito", usuario: nuevoUsuario });
    } catch (error) {
        res.status(400).json({ msg: "El correo ya está registrado o hay un error" });
    }
};