import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { config, isEmailJsConfigured } from "../config.js";
import { db } from "../db.js";
import { messages } from "../messages.js";
import { sendRegistrationCode } from "../email.js";
import { destroyImage } from "../cloudinary.js";

export const authRouter = Router();

const BEARER = /^Bearer\s+(\S+)\s*$/i;
const ALLOWED_EMAIL_DOMAIN_SUFFIXES = [".edu", ".edu.mm"];
const ALLOWED_EMAIL_DOMAINS = [
  "bu.ac.th",
  "dome.tu.ac.th",
  "rsu.ac.th",
  "stu.ac.th",
  "stu.pim.ac.th",
  "kbu.ac.th",
];

function isUniversityEmail(email: string): boolean {
  const [localPart, domain, ...extraParts] = email.split("@");
  if (!localPart || !domain || extraParts.length > 0 || /\s/.test(email)) return false;

  return (
    ALLOWED_EMAIL_DOMAINS.includes(domain) ||
    ALLOWED_EMAIL_DOMAIN_SUFFIXES.some((suffix) => domain.endsWith(suffix))
  );
}

function sessionUser(req: { headers: { authorization?: string } }) {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = BEARER.exec(header);
  if (!match) return null;
  const token = match[1];
  if (!token) return null;
  return db.getUserBySessionToken(token);
}

function bearerToken(req: { headers: { authorization?: string } }): string | undefined {
  const match = req.headers.authorization ? BEARER.exec(req.headers.authorization) : null;
  return match?.[1];
}

function matchesAdminPassword(provided: string, expected: string): boolean {
  const providedHash = createHash("sha256").update(provided).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

authRouter.post("/admin/login", async (req, res, next) => {
  try {
    if (!config.adminPassword) {
      res.status(503).json({ error: "Admin login is not configured on the server." });
      return;
    }

    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!matchesAdminPassword(password, config.adminPassword)) {
      res.status(401).json({ error: "The admin password is incorrect." });
      return;
    }

    const session = await db.createAdminSession();
    res.json({ token: session.token });
  } catch (error) {
    next(error);
  }
});

authRouter.use("/admin", async (req, res, next) => {
  try {
    const token = bearerToken(req);
    if (!token || !(await db.hasAdminSession(token))) {
      res.status(401).json({ error: "Admin sign-in required." });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
});

authRouter.get("/admin/stats", async (req, res, next) => {
  try {
    const [databaseCounts, messageCounts] = await Promise.all([
      db.getAdminCounts(),
      messages.getAdminCounts(),
    ]);
    res.json({ ...databaseCounts, ...messageCounts });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/admin/posts", async (_req, res, next) => {
  try {
    res.json(await db.listAdminPosts());
  } catch (error) {
    next(error);
  }
});

authRouter.get("/admin/users", async (_req, res, next) => {
  try {
    res.json(await db.listAdminUsers());
  } catch (error) {
    next(error);
  }
});

authRouter.post("/admin/users", async (req, res, next) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password.trim() : "";
    if (!name) {
      res.status(400).json({ error: "Enter the user's name." });
      return;
    }
    if (!isUniversityEmail(email)) {
      res.status(400).json({
        error: "Use a valid email address from an approved university domain.",
      });
      return;
    }
    if (password.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters." });
      return;
    }

    const result = await db.createAdminUser(name, email, password);
    if ("error" in result) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    res.status(201).json(result.user);
  } catch (error) {
    next(error);
  }
});

authRouter.patch("/admin/users/:id", async (req, res, next) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const passwordWasProvided = Object.hasOwn(req.body ?? {}, "password");
    const password =
      typeof req.body?.password === "string" ? req.body.password.trim() : "";
    if (!name) {
      res.status(400).json({ error: "Enter the user's name." });
      return;
    }
    if (!isUniversityEmail(email)) {
      res.status(400).json({
        error: "Use a valid email address from an approved university domain.",
      });
      return;
    }
    if (passwordWasProvided && req.body.password !== "" && password.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters." });
      return;
    }

    const result = await db.updateAdminUser(
      req.params.id,
      name,
      email,
      password || undefined,
    );
    if ("error" in result) {
      if (result.error === "duplicate") {
        res.status(409).json({ error: "An account with this email already exists." });
      } else {
        res.status(404).json({ error: "User not found." });
      }
      return;
    }
    res.json(result.user);
  } catch (error) {
    next(error);
  }
});

authRouter.get("/admin/chatmessages", async (_req, res, next) => {
  try {
    const [users, allMessages] = await Promise.all([
      db.listAdminUsers(),
      messages.listAllForAdmin(),
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    res.json(
      allMessages.map((message) => ({
        ...message,
        senderName: usersById.get(message.senderId)?.name ?? "Unknown user",
        senderEmail: usersById.get(message.senderId)?.email ?? null,
        receiverName: usersById.get(message.receiverId)?.name ?? "Unknown user",
        receiverEmail: usersById.get(message.receiverId)?.email ?? null,
      })),
    );
  } catch (error) {
    next(error);
  }
});

authRouter.get("/admin/chatmessages/conversation", async (req, res, next) => {
  try {
    const firstAccountId =
      typeof req.query.firstAccountId === "string" ? req.query.firstAccountId : "";
    const secondAccountId =
      typeof req.query.secondAccountId === "string" ? req.query.secondAccountId : "";
    if (!firstAccountId || !secondAccountId) {
      res.status(400).json({ error: "Select two accounts." });
      return;
    }
    if (firstAccountId === secondAccountId) {
      res.status(400).json({ error: "Select two different users." });
      return;
    }

    const [users, conversation] = await Promise.all([
      db.listAdminUsers(),
      messages.listConversationForAdmin(firstAccountId, secondAccountId),
    ]);
    const usersById = new Map(users.map((user) => [user.id, user]));
    res.json(
      conversation.map((message) => ({
        ...message,
        senderName: usersById.get(message.senderId)?.name ?? "Unknown user",
        senderEmail: usersById.get(message.senderId)?.email ?? null,
        receiverName: usersById.get(message.receiverId)?.name ?? "Unknown user",
        receiverEmail: usersById.get(message.receiverId)?.email ?? null,
      })),
    );
  } catch (error) {
    next(error);
  }
});

authRouter.delete("/admin/posts/:id", async (req, res, next) => {
  try {
    const removed = await db.deleteAdminItem(req.params.id);
    if (!removed) {
      res.status(404).json({ error: "Post not found." });
      return;
    }
    if (removed.photoPublicId) await destroyImage(removed.photoPublicId);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

authRouter.delete("/admin/chatmessages/:id", async (req, res, next) => {
  try {
    const deleted = await messages.deleteForAdmin(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Chat message not found." });
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

authRouter.post("/admin/logout", async (req, res, next) => {
  try {
    const token = bearerToken(req);
    if (token) await db.deleteAdminSession(token);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

authRouter.get("/auth/me", async (req, res, next) => {
  try {
    const user = await sessionUser(req);
    if (!user) {
      res.status(401).json({ error: "Not signed in." });
      return;
    }
    res.json({ user: { id: user.id, name: user.name, email: user.email } });
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
    if (!isUniversityEmail(email)) {
      res.status(400).json({
        error: "Use a valid email address from an approved university domain.",
      });
      return;
    }
    if (password.length < 4) {
      res.status(400).json({ error: "Password must be at least 4 characters." });
      return;
    }

    if (!isEmailJsConfigured()) {
      res.status(503).json({ error: "Email verification is not configured on the server." });
      return;
    }

    const code = String(randomInt(100_000, 1_000_000));
    const challenge = await db.createRegistrationChallenge(name, email, password, code);
    if ("error" in challenge) {
      res.status(challenge.error.startsWith("Please wait") ? 429 : 409).json({
        error: challenge.error,
      });
      return;
    }

    try {
      await sendRegistrationCode(email, name, code);
    } catch (error) {
      await db.clearRegistrationChallenge(email);
      console.error("[auth] Failed to send registration verification email:", error);
      res.status(502).json({ error: "Could not send the verification email. Please try again." });
      return;
    }

    res.status(200).json({ message: "Verification code sent." });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/auth/register/verify", async (req, res, next) => {
  try {
    const email =
      typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";

    if (!isUniversityEmail(email)) {
      res.status(400).json({
        error: "Use a valid email address from an approved university domain.",
      });
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      res.status(400).json({ error: "Enter the 6-digit verification code." });
      return;
    }

    const verified = await db.verifyRegistrationChallenge(email, code);
    if ("error" in verified) {
      res.status(400).json({ error: verified.error });
      return;
    }

    const session = await db.createSession(verified.user.id);
    res.status(201).json({
      token: session.token,
      user: {
        id: verified.user.id,
        name: verified.user.name,
        email: verified.user.email,
      },
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
      user: { id: user.id, name: user.name, email: user.email },
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
