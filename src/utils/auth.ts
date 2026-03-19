import { hash, compare } from "@node-rs/bcrypt";
import { SignJWT, jwtVerify } from "jose";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET não configurado");

const secret = new TextEncoder().encode(JWT_SECRET);

export const hashPassword = (password: string) => hash(password, 10);

export const comparePassword = (password: string, hashed: string) =>
  compare(password, hashed);

export const generateToken = async (payload: {
  id_usuario: number;
  email: string;
  tipo_usuario: string;
}): Promise<string> => {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret);
};

export const verifyToken = async (
  token: string,
): Promise<{ id_usuario: number; email: string; tipo_usuario: string }> => {
  const { payload } = await jwtVerify(token, secret);
  return payload as { id_usuario: number; email: string; tipo_usuario: string };
};

export const generateResetToken = () =>
  crypto.randomBytes(32).toString("hex");

export const hashResetToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");
