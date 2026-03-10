import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const obtenerClientes = async () => {
    return await prisma.clientes.findMany();
};

export const crearCliente = async (data: any) => {
    return await prisma.clientes.create({
        data: data
    });
};