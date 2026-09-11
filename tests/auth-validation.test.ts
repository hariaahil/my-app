import { describe, expect, it } from "vitest";
import { validateCredentials } from "../lib/auth-validation";

describe("validateCredentials", () => {
  it("rejects empty credentials", () => expect(validateCredentials("", "", "signin")).toBe("Enter email and password."));
  it("rejects invalid email", () => expect(validateCredentials("hari", "secret123", "signin")).toBe("Enter a valid email address."));
  it("requires six characters for signup passwords", () => expect(validateCredentials("hari@example.com", "12345", "signup")).toBe("Password must be at least 6 characters."));
  it("accepts valid signin credentials", () => expect(validateCredentials("hari@example.com", "secret123", "signin")).toBeNull());
});
