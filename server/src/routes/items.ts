import { Router } from "express";
import { db } from "../db";
import { destroyImage } from "../cloudinary";
import { promises as fs } from "node:fs";
import path from "node:path";

export const itemsRouter = Router();

const BEARER = /^Bearer\s+(\S+)\s*$/i;

async function requestOwnerId(req: { headers: { authorization?: string } }) {
  const match = req.headers.authorization ? BEARER.exec(req.headers.authorization) : null;
  return match?.[1] ? db.getUserIdBySessionToken(match[1]) : undefined;
}

interface ItemBody {
  name?: unknown;
  category?: unknown;
  quantity?: unknown;
  notes?: unknown;
  price?: unknown;
  condition?: unknown;
  university?: unknown;
  campusPickup?: unknown;
  localDelivery?: unknown;
  photoUrl?: unknown;
  photoPublicId?: unknown;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validate(body: ItemBody) {
  const name = asString(body.name);
  if (!name) return { error: "name is required" as const };

  const quantityRaw = body.quantity;
  const quantity =
    quantityRaw === undefined || quantityRaw === null || quantityRaw === ""
      ? 1
      : Number(quantityRaw);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { error: "quantity must be a positive number" as const };
  }

  const photoUrl = asString(body.photoUrl);
  const photoPublicId = asString(body.photoPublicId);

  const priceRaw = body.price;
  const price =
    priceRaw === undefined || priceRaw === null || priceRaw === ""
      ? 0
      : Number(priceRaw);
  if (!Number.isFinite(price) || price < 0) {
    return { error: "price must be a non-negative number" as const };
  }

  return {
    value: {
      name,
      category: asString(body.category),
      quantity: Math.floor(quantity),
      notes: asString(body.notes),
      price,
      condition: asString(body.condition) || "Good",
      university: asString(body.university),
      campusPickup: body.campusPickup === true,
      localDelivery: body.localDelivery === true,
      photoUrl: photoUrl || null,
      photoPublicId: photoPublicId || null,
    },
  };
}

itemsRouter.get("/items", async (_req, res, next) => {
  try {
    const items = await db.listItems();
    const enriched = await db.enrichItemsWithOwnerName(items);
    res.json(enriched);
  } catch (error) {
    next(error);
  }
});

itemsRouter.get("/favorites", async (req, res, next) => {
  try {
    const userId = await requestOwnerId(req);
    if (!userId) {
      res.status(401).json({ error: "Sign in to view your favorites." });
      return;
    }
    res.json(await db.listFavoriteItemIds(userId));
  } catch (error) {
    next(error);
  }
});

itemsRouter.put("/favorites/:itemId", async (req, res, next) => {
  try {
    const userId = await requestOwnerId(req);
    if (!userId) {
      res.status(401).json({ error: "Sign in to save favorites." });
      return;
    }
    const saved = await db.setFavoriteItem(userId, req.params.itemId, true);
    if (!saved) {
      res.status(404).json({ error: "Item not found." });
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

itemsRouter.delete("/favorites/:itemId", async (req, res, next) => {
  try {
    const userId = await requestOwnerId(req);
    if (!userId) {
      res.status(401).json({ error: "Sign in to manage your favorites." });
      return;
    }
    const saved = await db.setFavoriteItem(userId, req.params.itemId, false);
    if (!saved) {
      res.status(404).json({ error: "Item not found." });
      return;
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

itemsRouter.get("/items/mine", async (req, res, next) => {
  try {
    const ownerId = await requestOwnerId(req);
    if (!ownerId) {
      res.status(401).json({ error: "Sign in to view your listings." });
      return;
    }
    res.json(await db.listItemsByOwner(ownerId));
  } catch (error) {
    next(error);
  }
});

itemsRouter.get("/items/:id", async (req, res, next) => {
  try {
    const item = await db.getItem(req.params.id);
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
});

itemsRouter.post("/items", async (req, res, next) => {
  try {
    const ownerId = await requestOwnerId(req);
    if (!ownerId) {
      res.status(401).json({ error: "Sign in to create a listing." });
      return;
    }
    const parsed = validate(req.body as ItemBody);
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const created = await db.createItem({ ...parsed.value, ownerId });
    // Persist sell post data to a separate JSON file for archival or external processing
    try {
      const postsDir = path.resolve(process.cwd(), "data", "posts");
      await fs.mkdir(postsDir, { recursive: true });
      const filePath = path.join(postsDir, `${created.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(created, null, 2), "utf8");
    } catch (fileErr) {
      console.error("Failed to write post JSON file:", fileErr);
    }
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

itemsRouter.patch("/items/:id", async (req, res, next) => {
  try {
    const ownerId = await requestOwnerId(req);
    if (!ownerId) {
      res.status(401).json({ error: "Sign in to edit your listings." });
      return;
    }
    const existing = await db.getItem(req.params.id);
    if (!existing || existing.ownerId !== ownerId) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    const parsed = validate({ ...existing, ...(req.body as ItemBody) });
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const updated = await db.updateItem(req.params.id, ownerId, parsed.value);
    if (!updated) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    if (existing.photoPublicId && existing.photoPublicId !== updated.photoPublicId) {
      await destroyImage(existing.photoPublicId);
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

itemsRouter.delete("/items/:id", async (req, res, next) => {
  try {
    const ownerId = await requestOwnerId(req);
    if (!ownerId) {
      res.status(401).json({ error: "Sign in to delete your listings." });
      return;
    }
    const removed = await db.deleteItem(req.params.id, ownerId);
    if (!removed) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    if (removed.photoPublicId) {
      await destroyImage(removed.photoPublicId);
    }
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
