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

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  favoriteCount: number;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
}

export interface AdminSession {
  token: string;
  createdAt: string;
}

export interface RegistrationChallenge {
  name: string;
  email: string;
  passwordHash: string;
  codeHash: string;
  expiresAt: string;
  attemptsRemaining: number;
  lastSentAt: string;
}

export interface Database {
  items: Item[];
  users: User[];
  sessions: Session[];
  adminSessions: AdminSession[];
  registrationChallenges: RegistrationChallenge[];
}

const EMPTY: Database = {
  items: [],
  users: [],
  sessions: [],
  adminSessions: [],
  registrationChallenges: [],
};

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
    adminSessions: Array.isArray(parsed.adminSessions) ? parsed.adminSessions : [],
    registrationChallenges: Array.isArray(parsed.registrationChallenges)
      ? parsed.registrationChallenges
      : [],
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

  getAdminCounts(): Promise<{ posts: number; users: number }> {
    return this.run(async () => {
      const db = await this.store.read();
      return { posts: db.items.length, users: db.users.length };
    });
  }

  listAdminPosts(): Promise<
    (Item & { ownerName: string | null; ownerEmail: string | null })[]
  > {
    return this.run(async () => {
      const db = await this.store.read();
      return db.items.map((rawItem) => {
        const owner = db.users.find((user) => user.id === rawItem.ownerId);
        return {
          ...normalizeItem(rawItem),
          ownerName: owner?.name ?? null,
          ownerEmail: owner?.email ?? null,
        };
      });
    });
  }

  listAdminUsers(): Promise<
    AdminUserRecord[]
  > {
    return this.run(async () =>
      (await this.store.read()).users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        favoriteCount: user.favoriteItemIds.length,
      })),
    );
  }

  createAdminUser(
    name: string,
    email: string,
    password: string,
  ): Promise<{ user: AdminUserRecord } | { error: "duplicate" }> {
    return this.run(async () => {
      const db = await this.store.read();
      if (db.users.some((user) => user.email === email)) return { error: "duplicate" };

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
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          favoriteCount: 0,
        },
      };
    });
  }

  updateAdminUser(
    id: string,
    name: string,
    email: string,
    password?: string,
  ): Promise<
    { user: AdminUserRecord } | { error: "duplicate" } | { error: "not_found" }
  > {
    return this.run(async () => {
      const db = await this.store.read();
      const user = db.users.find((entry) => entry.id === id);
      if (!user) return { error: "not_found" };
      if (db.users.some((entry) => entry.id !== id && entry.email === email)) {
        return { error: "duplicate" };
      }

      user.name = name;
      user.email = email;
      if (password) {
        user.passwordHash = hashPassword(password);
        db.sessions = db.sessions.filter((session) => session.userId !== id);
      }
      await this.store.write(db);
      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          favoriteCount: user.favoriteItemIds.length,
        },
      };
    });
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

  deleteAdminItem(id: string): Promise<Item | undefined> {
    return this.run(async () => {
      const db = await this.store.read();
      const index = db.items.findIndex((entry) => entry.id === id);
      if (index === -1) return undefined;
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

  createRegistrationChallenge(
    name: string,
    email: string,
    password: string,
    code: string,
  ): Promise<{ ok: true } | { error: string }> {
    return this.run(async () => {
      const db = await this.store.read();
      if (db.users.some((user) => user.email === email)) {
        return { error: "An account with this email already exists." };
      }

      const existing = db.registrationChallenges.find((challenge) => challenge.email === email);
      const now = Date.now();
      if (existing && now - Date.parse(existing.lastSentAt) < 60_000) {
        return { error: "Please wait a minute before requesting another code." };
      }

      db.registrationChallenges = db.registrationChallenges.filter(
        (challenge) => challenge.email !== email,
      );
      db.registrationChallenges.push({
        name,
        email,
        passwordHash: hashPassword(password),
        codeHash: hashPassword(code),
        expiresAt: new Date(now + 10 * 60_000).toISOString(),
        attemptsRemaining: 5,
        lastSentAt: new Date(now).toISOString(),
      });
      await this.store.write(db);
      return { ok: true };
    });
  }

  clearRegistrationChallenge(email: string): Promise<void> {
    return this.run(async () => {
      const db = await this.store.read();
      const next = db.registrationChallenges.filter((challenge) => challenge.email !== email);
      if (next.length !== db.registrationChallenges.length) {
        db.registrationChallenges = next;
        await this.store.write(db);
      }
    });
  }

  verifyRegistrationChallenge(
    email: string,
    code: string,
  ): Promise<{ user: User } | { error: string }> {
    return this.run(async () => {
      const db = await this.store.read();
      const challenge = db.registrationChallenges.find((entry) => entry.email === email);
      if (!challenge) return { error: "Request a new verification code." };

      if (Date.parse(challenge.expiresAt) <= Date.now()) {
        db.registrationChallenges = db.registrationChallenges.filter(
          (entry) => entry.email !== email,
        );
        await this.store.write(db);
        return { error: "This verification code has expired. Request a new one." };
      }

      if (!verifyPassword(code, challenge.codeHash)) {
        challenge.attemptsRemaining -= 1;
        if (challenge.attemptsRemaining <= 0) {
          db.registrationChallenges = db.registrationChallenges.filter(
            (entry) => entry.email !== email,
          );
        }
        await this.store.write(db);
        return {
          error:
            challenge.attemptsRemaining <= 0
              ? "Too many incorrect attempts. Request a new code."
              : "That verification code is incorrect.",
        };
      }

      if (db.users.some((user) => user.email === email)) {
        db.registrationChallenges = db.registrationChallenges.filter(
          (entry) => entry.email !== email,
        );
        await this.store.write(db);
        return { error: "An account with this email already exists." };
      }

      const user: User = {
        id: crypto.randomUUID(),
        name: challenge.name,
        email: challenge.email,
        passwordHash: challenge.passwordHash,
        createdAt: new Date().toISOString(),
        favoriteItemIds: [],
      };
      db.users.push(user);
      db.registrationChallenges = db.registrationChallenges.filter(
        (entry) => entry.email !== email,
      );
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

  createAdminSession(): Promise<AdminSession> {
    return this.run(async () => {
      const db = await this.store.read();
      const session: AdminSession = {
        token: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      db.adminSessions.push(session);
      await this.store.write(db);
      return session;
    });
  }

  hasAdminSession(token: string): Promise<boolean> {
    return this.run(async () => {
      const session = (await this.store.read()).adminSessions.find(
        (entry) => entry.token === token,
      );
      if (!session) return false;
      const age = Date.now() - Date.parse(session.createdAt);
      return Number.isFinite(age) && age >= 0 && age < 30 * 24 * 60 * 60 * 1000;
    });
  }

  deleteAdminSession(token: string): Promise<void> {
    return this.run(async () => {
      const db = await this.store.read();
      const index = db.adminSessions.findIndex((session) => session.token === token);
      if (index === -1) return;
      db.adminSessions.splice(index, 1);
      await this.store.write(db);
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
