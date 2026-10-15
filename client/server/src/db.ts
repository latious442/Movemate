import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import { fetchRawJson, uploadRawJson } from "./cloudinary.js";
import { hashPassword, verifyPassword } from "./password.js";

export interface Item {
  id: string;
  ownerId?: string;
  name: string;
  category: string;
  quantity: number;
  notes: string;
  price: number;
  condition: string;
  university: string;
  campusPickup: boolean;
  localDelivery: boolean;
  photoUrl: string | null;
  photoPublicId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  favoriteItemIds: string[];
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
}

export interface Database {
  items: Item[];
  users: User[];
  sessions: Session[];
}

const EMPTY: Database = { items: [], users: [], sessions: [] };

function normalizeDb(parsed: Partial<Database>): Database {
  return {
    items: Array.isArray(parsed.items) ? parsed.items : [],
    users: Array.isArray(parsed.users)
      ? parsed.users.map((user) => ({
          ...user,
          favoriteItemIds: Array.isArray(user.favoriteItemIds)
            ? [...new Set(user.favoriteItemIds.filter((id) => typeof id === "string"))]
            : [],
        }))
      : [],
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
  };
}

function normalizeItem(raw: Item): Item {
  return {
    ...raw,
    price: typeof raw.price === "number" ? raw.price : 0,
    condition: raw.condition || "Good",
    university: raw.university || "",
    campusPickup: raw.campusPickup === true,
    localDelivery: raw.localDelivery === true,
  };
}

export interface Store {
  read(): Promise<Database>;
  write(db: Database): Promise<void>;
}

class FileStore implements Store {
  constructor(private readonly file: string) {}

  async read(): Promise<Database> {
    try {
      const raw = await fs.readFile(this.file, "utf8");
      const parsed = JSON.parse(raw) as Partial<Database>;
      return normalizeDb(parsed);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return structuredClone(EMPTY);
      }
      throw error;
    }
  }

  async write(db: Database): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, `${JSON.stringify(db, null, 2)}\n`, "utf8");
  }
}

class CloudinaryStore implements Store {
  private readonly publicId: string;

  constructor(folder: string) {
    this.publicId = `${folder}/db.json`;
  }

  async read(): Promise<Database> {
    const db = await fetchRawJson<Partial<Database>>(this.publicId);
    return db ? normalizeDb(db) : structuredClone(EMPTY);
  }

  async write(db: Database): Promise<void> {
    await uploadRawJson(this.publicId, Buffer.from(JSON.stringify(db), "utf8"));
  }
}

export function createStore(): Store {
  return config.storageDriver === "cloudinary"
    ? new CloudinaryStore(config.cloudinary.folder)
    : new FileStore(config.dataFile);
}

/**
 * Serializes read/modify/write cycles through a single promise chain so
 * concurrent requests cannot clobber each other (important for the JSON file
 * and the remote Cloudinary-backed store alike).
 */
export class JsonDb {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly store: Store) {}

  private run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task, task);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  listItems(): Promise<Item[]> {
    return this.run(async () => (await this.store.read()).items.map(normalizeItem));
  }

  enrichItemsWithOwnerName(items: Item[]): Promise<(Item & { ownerName?: string })[]> {
    return this.run(async () => {
      const db = await this.store.read();
      return items.map((item) => {
        const user = item.ownerId
          ? db.users.find((u) => u.id === item.ownerId)
          : undefined;
        return { ...item, ownerName: user?.name };
      });
    });
  }

  getItem(id: string): Promise<Item | undefined> {
    return this.run(async () => {
      const item = (await this.store.read()).items.find((entry) => entry.id === id);
      return item ? normalizeItem(item) : undefined;
    });
  }

  createItem(
    input: Omit<Item, "id" | "createdAt" | "updatedAt" | "ownerId"> & { ownerId: string },
  ): Promise<Item> {
    return this.run(async () => {
      const db = await this.store.read();
      const now = new Date().toISOString();
      const item: Item = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      db.items.push(item);
      await this.store.write(db);
      return item;
    });
  }

  listItemsByOwner(ownerId: string): Promise<Item[]> {
    return this.run(async () =>
      (await this.store.read()).items
        .filter((entry) => entry.ownerId === ownerId)
        .map(normalizeItem),
    );
  }

  updateItem(
    id: string,
    ownerId: string,
    patch: Partial<Omit<Item, "id" | "createdAt" | "ownerId">>,
  ): Promise<Item | undefined> {
    return this.run(async () => {
      const db = await this.store.read();
      const item = db.items.find((entry) => entry.id === id);
      if (!item || item.ownerId !== ownerId) return undefined;
      Object.assign(item, patch, { updatedAt: new Date().toISOString() });
      await this.store.write(db);
      return item;
    });
  }

  deleteItem(id: string, ownerId: string): Promise<Item | undefined> {
    return this.run(async () => {
      const db = await this.store.read();
      const index = db.items.findIndex((entry) => entry.id === id);
      if (index === -1) return undefined;
      if (db.items[index]?.ownerId !== ownerId) return undefined;
      const [removed] = db.items.splice(index, 1);
      for (const user of db.users) {
        user.favoriteItemIds = user.favoriteItemIds.filter((favoriteId) => favoriteId !== id);
      }
      await this.store.write(db);
      return removed;
    });
  }

  listFavoriteItemIds(userId: string): Promise<string[]> {
    return this.run(async () => {
      const user = (await this.store.read()).users.find((entry) => entry.id === userId);
      return user ? [...user.favoriteItemIds] : [];
    });
  }

  setFavoriteItem(userId: string, itemId: string, favorite: boolean): Promise<boolean> {
    return this.run(async () => {
      const db = await this.store.read();
      const user = db.users.find((entry) => entry.id === userId);
      if (!user || !db.items.some((entry) => entry.id === itemId)) return false;

      const index = user.favoriteItemIds.indexOf(itemId);
      if (favorite && index === -1) {
        user.favoriteItemIds.push(itemId);
        await this.store.write(db);
      } else if (!favorite && index !== -1) {
        user.favoriteItemIds.splice(index, 1);
        await this.store.write(db);
      }
      return true;
    });
  }

  registerUser(
    name: string,
    email: string,
    password: string,
  ): Promise<{ user: User } | { error: string }> {
    return this.run(async () => {
      const db = await this.store.read();
      if (db.users.some((u) => u.email === email)) {
        return { error: "An account with this email already exists." };
      }
      const user: User = {
        id: crypto.randomUUID(),
        name,
        email,
        passwordHash: hashPassword(password),
        createdAt: new Date().toISOString(),
        favoriteItemIds: [],
      };
      db.users.push(user);
      await this.store.write(db);
      return { user };
    });
  }

  authenticateUser(email: string, password: string): Promise<User | undefined> {
    return this.run(async () => {
      const db = await this.store.read();
      const user = db.users.find((u) => u.email === email);
      if (!user || !verifyPassword(password, user.passwordHash)) return undefined;
      return user;
    });
  }

  createSession(userId: string): Promise<Session> {
    return this.run(async () => {
      const db = await this.store.read();
      const session: Session = {
        token: crypto.randomUUID(),
        userId,
        createdAt: new Date().toISOString(),
      };
      db.sessions.push(session);
      await this.store.write(db);
      return session;
    });
  }

  getUserBySessionToken(
    token: string,
  ): Promise<Pick<User, "id" | "name" | "email"> | undefined> {
    return this.run(async () => {
      const db = await this.store.read();
      const session = db.sessions.find((s) => s.token === token);
      if (!session) return undefined;
      const user = db.users.find((u) => u.id === session.userId);
      if (!user) return undefined;
      return { id: user.id, name: user.name, email: user.email };
    });
  }

  getUser(id: string): Promise<Pick<User, "id" | "name"> | undefined> {
    return this.run(async () => {
      const user = (await this.store.read()).users.find((entry) => entry.id === id);
      return user ? { id: user.id, name: user.name } : undefined;
    });
  }

  getUserIdBySessionToken(token: string): Promise<string | undefined> {
    return this.run(async () => {
      const db = await this.store.read();
      const session = db.sessions.find((entry) => entry.token === token);
      if (!session || !db.users.some((user) => user.id === session.userId)) return undefined;
      return session.userId;
    });
  }

  deleteSession(token: string): Promise<void> {
    return this.run(async () => {
      const db = await this.store.read();
      const index = db.sessions.findIndex((s) => s.token === token);
      if (index === -1) return;
      db.sessions.splice(index, 1);
      await this.store.write(db);
    });
  }
}

export const db = new JsonDb(createStore());
