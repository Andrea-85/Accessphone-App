import { PrismaClient } from '@prisma/client';

// 👇 CAMBIAMOS EL PUERTO A 5432 (Directo) Y QUITAMOS EL PARAMETRO DE PGBOUNCER
const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres.wftobmyvywyzqjzxnpds:access_phone2026@aws-1-us-east-2.pooler.supabase.com:5432/postgres";

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl,
        },
    },
    log: ['query', 'info', 'warn', 'error'], 
});

export default prisma;