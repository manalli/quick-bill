import { compare, hash } from "bcryptjs"

const BCRYPT_COST = 12

export async function hashPassword(password: string) {
  return hash(password, BCRYPT_COST)
}

export async function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash)
}
