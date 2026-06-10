import multer from 'multer';

// Guardamos en memoria porque no necesitamos dejar el archivo guardado en el disco
const storage = multer.memoryStorage();
export const upload = multer({ storage: storage });