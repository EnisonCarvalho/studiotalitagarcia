export const RECOVERY_STORAGE_KEY = "studio-password-recovery";
export const MIN_PASSWORD_LENGTH = 8;

export function passwordValidation(password: string, repeat: string) {
  if (password.length < MIN_PASSWORD_LENGTH) return "Use uma senha com pelo menos 8 caracteres.";
  if (password !== repeat) return "As senhas precisam ser iguais.";
  return null;
}

export function recoveryAction(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  if (params.has("error") || params.has("error_code")) return null;
  const type = params.get("type");
  return type === "recovery" || type === "invite" ? type : null;
}