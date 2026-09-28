import { z } from "zod";

/** Datos del usuario que la contraseña no puede contener (política de seguridad). */
export interface PasswordContext {
  email?: string | null;
  fullName?: string | null;
  organizationName?: string | null;
}

/** Requisitos mínimos de la contraseña (HU-01, HU-03 y política de seguridad). */
export const PASSWORD_RULES = [
  { key: "length", label: "Al menos 8 caracteres", test: (pw: string) => pw.length >= 8 },
  { key: "upper", label: "Una mayúscula", test: (pw: string) => /[A-ZÁÉÍÓÚÑ]/.test(pw) },
  { key: "lower", label: "Una minúscula", test: (pw: string) => /[a-záéíóúñ]/.test(pw) },
  { key: "digit", label: "Un número", test: (pw: string) => /[0-9]/.test(pw) },
  { key: "symbol", label: "Un carácter especial (por ejemplo ! # $ %)", test: (pw: string) => /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/.test(pw) },
] as const;

/** Minúsculas, sin acentos ni espacios, para comparar la contraseña con los datos del usuario. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Mensaje de cada dato del usuario que aparece dentro de la contraseña. */
export function passwordAttributeIssues(password: string, context: PasswordContext): string[] {
  const pw = normalize(password);
  const checks: [string | null | undefined, string][] = [
    [context.email?.split("@")[0], "No puede contener tu correo"],
    [context.fullName, "No puede contener tu nombre"],
    [context.organizationName, "No puede contener el nombre de la organización"],
  ];
  return checks
    .filter(([value]) => {
      const attr = value ? normalize(value) : "";
      return attr.length >= 4 && pw.includes(attr);
    })
    .map(([, message]) => message);
}

/** Primer requisito que no se cumple, o null si la contraseña es válida. */
export function passwordError(password: string, context: PasswordContext = {}): string | null {
  const rule = PASSWORD_RULES.find((r) => !r.test(password));
  if (rule) return `La contraseña necesita: ${rule.label.toLowerCase()}`;
  return passwordAttributeIssues(password, context)[0] ?? null;
}

export const loginSchema = z.object({
  email: z.string().trim().email("Ingresá un correo válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Ingresá un correo válido"),
    password: z.string(),
    fullName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
    organizationName: z.string().trim().min(2, "El nombre de la organización debe tener al menos 2 caracteres"),
  })
  .superRefine((data, ctx) => {
    const error = passwordError(data.password, data);
    if (error) ctx.addIssue({ code: "custom", path: ["password"], message: error });
  });

export const updatePasswordSchema = z.object({ password: z.string() });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
