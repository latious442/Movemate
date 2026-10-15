import { Router } from "express";
import { db } from "../db";

export const authRouter = Router();

const BEARER = /^Bearer\s+(\S+)\s*$/i;

function sessionUser(req: { headers: { authorization?: string } }) {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = BEARER.exec(header);
  if (!match) return null;
  const token = match[1];
  if (!token) return null;
  return db.getUserBySessionToken(token);
}

authRouter.get("/auth/me", async (req, res, next) => {
  try {
    const user = await sessionUser(req);
    if (!user) {
      res.status(401).json({ error: "Not signed in." });
      return;
    }
    res.json({ user: { name: user.name, email: user.email } });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/register", async (req, res, next) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password.trim() : "";

    if (!name) {
      res.status(400).json({ error: "Enter your name." });
      return;
    }
    if (!email.includes("@")) {
      res.status(400).json({ error: "Enter a valid email." });
      return;
    }
    if (password.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters." });
      return;
    }

    const created = await db.registerUser(name, email, password);
    if ("error" in created) {
      res.status(409).json({ error: created.error });
      return;
    }

    const session = await db.createSession(created.user.id);
    res.status(201).json({
      token: session.token,
      user: { name: created.user.name, email: created.user.email },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/login", async (req, res, next) => {
  try {
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password.trim() : "";

    const user = await db.authenticateUser(email, password);
    if (!user) {
      res.status(401).json({ error: "Email or password is incorrect." });
      return;
    }

    const session = await db.createSession(user.id);
    res.json({
      token: session.token,
      user: { name: user.name, email: user.email },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/logout", async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    const match = header ? BEARER.exec(header) : null;
    if (match?.[1]) await db.deleteSession(match[1]);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
