import jwt from "jsonwebtoken";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-only-session-secret";
const SESSION_EXPIRES_IN = "7d";

type SessionPayload = {
  sub: string;
  email: string;
};

function signSessionToken(userId: string, email: string): string {
  return jwt.sign({ email }, SESSION_SECRET, {
    subject: userId,
    expiresIn: SESSION_EXPIRES_IN
  });
}

function verifySessionToken(token: string): SessionPayload | null {
  try {
    const payload = jwt.verify(token, SESSION_SECRET) as jwt.JwtPayload;
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email
    };
  } catch {
    return null;
  }
}

export { signSessionToken, verifySessionToken };

