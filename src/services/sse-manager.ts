
import { Response } from 'express';
import { logger } from '../utils/logger.js';
import { randomUUID } from 'crypto';

interface ConnectedClient {
    id: string;
    res: Response;
    userId?: string; // If authenticated
}

export class SseManager {
    private clients: Map<string, ConnectedClient> = new Map();

    addClient(res: Response, userId?: string): string {
        const id = randomUUID();
        const client: ConnectedClient = { id, res, userId };
        this.clients.set(id, client);

        // Remove client on connection close
        res.on('close', () => {
            this.clients.delete(id);
            logger.info(`SSE Client disconnected: ${id}`);
        });

        logger.info(`SSE Client connected: ${id} (User: ${userId || 'Guest'})`);
        return id;
    }

    removeClient(id: string): void {
        const client = this.clients.get(id);
        if (client) {
            client.res.end();
            this.clients.delete(id);
        }
    }

    sendToClient(clientId: string, event: string, data: any): boolean {
        const client = this.clients.get(clientId);
        if (!client) return false;

        client.res.write(`event: ${event}\n`);
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
        return true;
    }

    broadcast(event: string, data: any): void {
        this.clients.forEach(client => {
            client.res.write(`event: ${event}\n`);
            client.res.write(`data: ${JSON.stringify(data)}\n\n`);
        });
    }

    getActiveClientCount(): number {
        return this.clients.size;
    }

    getAllClientIds(): string[] {
        return Array.from(this.clients.keys());
    }

    // Helper to get a random client for load balancing
    getRandomClient(): string | null {
        const keys = Array.from(this.clients.keys());
        if (keys.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * keys.length);
        return keys[randomIndex];
    }
}
