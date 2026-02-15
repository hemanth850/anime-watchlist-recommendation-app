import type { StoredUser } from "../auth/store.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: StoredUser;
    }
  }
}

export {};

