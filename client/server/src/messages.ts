import { promises as fs } from "node:fs";
import path from "node:path";
import { config } from "./config";
import { fetchRawJson, uploadRawJson } from "./cloudinary";

export interface ChatMessage {
  id: string;
  sentAt: string;
  text: string;
  senderId: string;
  receiverId: string;
}

type MessageStoreData = { messages: ChatMessage[] };
const EMPTY: MessageStoreData = { messages: [] };

function normalize(raw: Partial<MessageStoreData> | null): MessageStoreData {
  return {
    messages: Array.isArray(raw?.messages)
      ? raw.messages.filter(
          (message): message is ChatMessage =>
            typeof message?.id === "string" &&
            typeof message?.sentAt === "string" &&
            typeof message?.text === "string" &&
            typeof message?.senderId === "string" &&
            typeof message?.receiverId === "string",
        )
      : [],
  };
}

class MessageStore {
  private queue: Promise<unknown> = Promise.resolve();

  private run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task, task);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }

  private async read(): Promise<MessageStoreData> {
    if (config.storageDriver === "cloudinary") {
      return normalize(await fetchRawJson<MessageStoreData>(`${config.cloudinary.folder}/messages.json`));
    }
    try {
      const contents = await fs.readFile(config.messagesDataFile, "utf8");
      return normalize(JSON.parse(contents) as Partial<MessageStoreData>);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return structuredClone(EMPTY);
      throw error;
    }
  }

  private async write(data: MessageStoreData): Promise<void> {
    const contents = Buffer.from(`${JSON.stringify(data, null, 2)}\n`, "utf8");
    if (config.storageDriver === "cloudinary") {
      await uploadRawJson(`${config.cloudinary.folder}/messages.json`, contents);
      return;
    }
    await fs.mkdir(path.dirname(config.messagesDataFile), { recursive: true });
    await fs.writeFile(config.messagesDataFile, contents, "utf8");
  }

  listForUser(userId: string): Promise<ChatMessage[]> {
    return this.run(async () =>
      (await this.read()).messages
        .filter((message) => message.senderId === userId || message.receiverId === userId)
        .sort((a, b) => a.sentAt.localeCompare(b.sentAt)),
    );
  }

  create(senderId: string, receiverId: string, text: string): Promise<ChatMessage> {
    return this.run(async () => {
      const data = await this.read();
      const message: ChatMessage = {
        id: crypto.randomUUID(),
        sentAt: new Date().toISOString(),
        text,
        senderId,
        receiverId,
      };
      data.messages.push(message);
      await this.write(data);
      return message;
    });
  }

  deleteSentMessage(messageId: string, senderId: string): Promise<boolean> {
    return this.run(async () => {
      const data = await this.read();
      const index = data.messages.findIndex(
        (message) => message.id === messageId && message.senderId === senderId,
      );
      if (index === -1) return false;
      data.messages.splice(index, 1);
      await this.write(data);
      return true;
    });
  }
}

export const messages = new MessageStore();
