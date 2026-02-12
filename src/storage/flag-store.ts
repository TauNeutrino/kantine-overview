
import fs from 'fs/promises';
import { join } from 'path';
import { logger } from '../utils/logger.js';

export interface FlaggedItem {
    id: string; // composite: date_articleId
    date: string;
    articleId: number;
    userId: string; // Who flagged it (first user)
    cutoff: string; // ISO date string
    createdAt: string;
    description?: string; // Optional: Store name/desc for notifications
    name?: string;
}

export class FlagStore {
    private filePath: string;
    private flags: Map<string, FlaggedItem> = new Map();
    private initialized: boolean = false;

    constructor(dataDir: string) {
        this.filePath = join(dataDir, 'flags.json');
    }

    async init(): Promise<void> {
        if (this.initialized) return;

        try {
            const data = await fs.readFile(this.filePath, 'utf-8');
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                parsed.forEach((item: FlaggedItem) => {
                    this.flags.set(item.id, item);
                });
            }
            logger.info(`Loaded ${this.flags.size} flags from storage.`);
        } catch (error) {
            // If file doesn't exist, start empty
            logger.info('No existing flags found, starting with empty store.');
        }

        this.initialized = true;
    }

    async save(): Promise<void> {
        try {
            const data = Array.from(this.flags.values());
            await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
        } catch (error) {
            logger.error(`Failed to save flags: ${error}`);
        }
    }

    async addFlag(item: FlaggedItem): Promise<boolean> {
        if (!this.initialized) await this.init();

        if (this.flags.has(item.id)) {
            return false; // Already exists
        }

        this.flags.set(item.id, item);
        await this.save();
        return true;
    }

    async removeFlag(id: string): Promise<boolean> {
        if (!this.initialized) await this.init();

        if (this.flags.has(id)) {
            this.flags.delete(id);
            await this.save();
            return true;
        }
        return false;
    }

    async getFlag(id: string): Promise<FlaggedItem | undefined> {
        if (!this.initialized) await this.init();
        return this.flags.get(id);
    }

    async getAllFlags(): Promise<FlaggedItem[]> {
        if (!this.initialized) await this.init();
        return Array.from(this.flags.values());
    }

    async pruneExpiredFlags(): Promise<number> {
        if (!this.initialized) await this.init();

        const now = new Date();
        let pruned = 0;

        for (const [id, item] of this.flags.entries()) {
            const cutoff = new Date(item.cutoff);
            if (now > cutoff) {
                this.flags.delete(id);
                pruned++;
            }
        }

        if (pruned > 0) {
            await this.save();
            logger.info(`Pruned ${pruned} expired flags.`);
        }

        return pruned;
    }
}
