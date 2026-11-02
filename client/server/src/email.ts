import { config, isEmailJsConfigured } from "./config.js";

export async function sendRegistrationCode(
  email: string,
  name: string,
  code: string,
): Promise<void> {
  if (!isEmailJsConfigured()) {
    throw new Error("EmailJS is not configured. Set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY.");
  }

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: config.emailJs.serviceId,
      template_id: config.emailJs.templateId,
      user_id: config.emailJs.publicKey,
      template_params: {
        to_email: email,
        user_name: name,
        otp_code: code,
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`EmailJS returned ${response.status}: ${details}`);
  }
}
