import { FacturaSchema } from "../lib/schema";

export async function extraerDatosFactura(buffer: Buffer, intentos = 3): Promise<any> {
  const apiKey = process.env.GOOGLE_AI_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  // 1. Declaramos la variable ANTES de usarla
  const productosConocidos = "Cargadores KineTec, Cables C-C KineTec, Cargador Sam 25w";
  const prompt = `
    Extrae los productos de esta factura.
  IMPORTANTE: Incluye el nombre del producto en el campo 'descripcion'.
  Responde SOLO en formato JSON con la siguiente estructura exacta: 
  { 
    "items": [
      { "varianteId": number, "descripcion": string, "cantidad": number, "precioUnitario": number }
    ] 
  }
  NO incluyas explicaciones.`;

  // 2. Ahora sí usamos la variable prompt aquí
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt }, 
          { inline_data: { mime_type: "image/jpeg", data: buffer.toString("base64") } }
        ]
      }]
    })
  });

  // Manejo de saturación (503)
  if (response.status === 503 && intentos > 0) {
    const espera = (4 - intentos) * 3000;
    console.log(`Servidor ocupado, reintentando en ${espera/1000} segundos...`);
    await new Promise(res => setTimeout(res, espera));
    return extraerDatosFactura(buffer, intentos - 1);
  }

  const data = await response.json();

  if (!response.ok) {
    console.error("Error API:", JSON.stringify(data, null, 2));
    throw new Error("La API de Google rechazó la petición.");
  }

  const rawText = data.candidates[0].content.parts[0].text;
  const jsonString = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

  const datos = JSON.parse(jsonString);
  return FacturaSchema.parse(datos);
}