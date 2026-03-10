import axios from 'axios';

// Esta es la dirección de tu Backend
const API_URL = 'http://localhost:3000/api'; 

export const getProductos = async () => {
  try {
    const response = await axios.get(`${API_URL}/productos`);
    return response.data;
  } catch (error) {
    console.error("Error al traer productos:", error);
    return [];
  }
};