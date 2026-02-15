import type { NextFunction, Request, Response } from "express";
import { findUserById } from "./store.js";
import { verifySessionToken } from "./session.js";

function authRequired(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing bearer token" });
    return;
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const payload = verifySessionToken(token);
  if (!payload) {
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }

  const user = findUserById(payload.sub);
  if (!user) {
    res.status(401).json({ message: "Session user not found" });
    return;
  }

  req.authUser = user;
  next();
}

export { authRequired };

