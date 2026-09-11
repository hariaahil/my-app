export function validateCredentials(email: string, password: string, mode: "signin" | "signup") {
  if (!email.trim() || !password) return "Enter email and password.";
  if (!email.includes("@")) return "Enter a valid email address.";
  if (mode === "signup" && password.length < 6) return "Password must be at least 6 characters.";
  return null;
}
