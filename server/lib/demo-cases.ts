import type { CaseSource } from "./cases.js";

/**
 * Six SYNTHETIC example cases (Nicaragua). None are real messages; phone
 * numbers, domains and amounts are invented for the demo.
 */
export const DEMO_CASES: {
  source: CaseSource;
  sender: string;
  text: string;
  url?: string;
}[] = [
  {
    source: "sms",
    sender: "+505 8123 4567",
    text: "BAC Credomatic: Su tarjeta ha sido bloqueada por actividad inusual. Para reactivarla ingrese en las próximas 24 horas a https://bac-credomatic-ni.xyz/verificar",
  },
  {
    source: "sms",
    sender: "+505 7788 1020",
    text: "Banpro le informa: hemos detectado un intento de acceso. Responda este mensaje con el código OTP de 6 dígitos que le acabamos de enviar para cancelar la operación.",
  },
  {
    source: "email",
    sender: "service@paypa1-security-check.com",
    text: "Your PayPal account has been limited. Confirm your identity within 24 hours to avoid permanent suspension.",
    url: "https://paypa1-security-check.com/login",
  },
  {
    source: "whatsapp",
    sender: "+1 (305) 555-0199",
    text: "🚀 Duplica tu dinero con Bitcoin: deposita $100 hoy y en 7 días recibes $200. Ganancias garantizadas, cupos limitados. ¡Escríbeme ya!",
  },
  {
    source: "whatsapp",
    sender: "+505 5712 3344",
    text: "Western Union: Su remesa de $350 está retenida en aduana. Para liberarla debe pagar una comisión de $25 por depósito antes de mañana.",
  },
  {
    source: "sms",
    sender: "BAC",
    text: "BAC Credomatic: Compra aprobada por C$ 1,250.00 en SUPERMERCADO LA COLONIA con tarjeta terminada en 4821. Si no reconoce esta compra llame al número al reverso de su tarjeta.",
  },
];
