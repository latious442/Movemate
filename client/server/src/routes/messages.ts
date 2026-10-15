import { Router } from "express";
import { db } from "../db";
import { messages } from "../messages";

export const messagesRouter = Router();

const BEARER = /^Bearer\s+(\S+)\s*$/i;

async function requestUserId(req: { headers: { authorization?: string } }) {
  const match = req.headers.authorization ? BEARER.exec(req.headers.authorization) : null;
  return match?.[1] ? db.getUserIdBySessionToken(match[1]) : undefined;
}

messagesRouter.get("/messages", async (req, res, next) => {
  try {
    const userId = await requestUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Sign in to view your messages." });
      return;
    }

    const userMessages = await messages.listForUser(userId);
    const latestByUser = new Map<string, (typeof userMessages)[number]>();
    for (const message of userMessages) {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      const current = latestByUser.get(otherUserId);
      if (!current || current.sentAt < message.sentAt) latestByUser.set(otherUserId, message);
    }

    const conversations = await Promise.all(
      [...latestByUser].map(async ([otherUserId, latestMessage]) => ({
        userId: otherUserId,
        name: (await db.getUser(otherUserId))?.name ?? "User",
        latestMessage,
      })),
    );
    conversations.sort((a, b) => b.latestMessage.sentAt.localeCompare(a.latestMessage.sentAt));
    res.json(conversations);
  } catch (error) {
    next(error);
  }
});

messagesRouter.get("/messages/:userId", async (req, res, next) => {
  try {
    const userId = await requestUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Sign in to view your messages." });
      return;
    }
    const participantId = req.params.userId;
    if (participantId === userId) {
      res.status(400).json({ error: "You cannot start a conversation with yourself." });
      return;
    }
    const participant = await db.getUser(participantId);
    if (!participant) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    const conversation = (await messages.listForUser(userId)).filter(
      (message) =>
        (message.senderId === userId && message.receiverId === participantId) ||
        (message.senderId === participantId && message.receiverId === userId),
    );
    res.json({ participant, messages: conversation });
  } catch (error) {
    next(error);
  }
});

messagesRouter.post("/messages", async (req, res, next) => {
  try {
    const senderId = await requestUserId(req);
    if (!senderId) {
      res.status(401).json({ error: "Sign in to send a message." });
      return;
    }
    const receiverId =
      typeof req.body?.receiverId === "string" ? req.body.receiverId.trim() : "";
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!receiverId) {
      res.status(400).json({ error: "A recipient is required." });
      return;
    }
    if (receiverId === senderId) {
      res.status(400).json({ error: "You cannot send a message to yourself." });
      return;
    }
    if (!text || text.length > 4000) {
      res.status(400).json({ error: "Messages must contain 1 to 4000 characters." });
      return;
    }
    if (!(await db.getUser(receiverId))) {
      res.status(404).json({ error: "Recipient not found." });
      return;
    }

    res.status(201).json(await messages.create(senderId, receiverId, text));
  } catch (error) {
    next(error);
  }
});

messagesRouter.delete("/messages/:messageId", async (req, res, next) => {
  try {
    const senderId = await requestUserId(req);
    if (!senderId) {
      res.status(401).json({ error: "Sign in to delete a message." });
      return;
    }
    const deleted = await messages.deleteSentMessage(req.params.messageId, senderId);
    if (!deleted) {
      res.status(404).json({ error: "Message not found or you cannot delete it." });
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
