
import { FlagStore, FlaggedItem } from '../storage/flag-store.js';
import { SseManager } from './sse-manager.js';
import { logger } from '../utils/logger.js';

export class PollingOrchestrator {
    private flagStore: FlagStore;
    private sseManager: SseManager;
    private intervalId: NodeJS.Timeout | null = null;
    private intervalMs: number = 5 * 60 * 1000; // 5 minutes

    constructor(flagStore: FlagStore, sseManager: SseManager) {
        this.flagStore = flagStore;
        this.sseManager = sseManager;
    }

    start(): void {
        if (this.intervalId) return;

        logger.info('Starting Polling Orchestrator...');
        // Run immediately then interval
        this.distributeTasks();
        this.intervalId = setInterval(() => this.distributeTasks(), this.intervalMs);
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    async distributeTasks(): Promise<void> {
        const clients = this.sseManager.getAllClientIds();
        if (clients.length === 0) {
            logger.info('No active clients to poll. Skipping cycle.');
            return;
        }

        // Clean up expired flags first
        await this.flagStore.pruneExpiredFlags();

        const flags = await this.flagStore.getAllFlags();
        if (flags.length === 0) return;

        logger.info(`Distributing ${flags.length} polling tasks across ${clients.length} clients.`);

        // Simple Load Balancing: Round Robin
        let clientIndex = 0;

        for (const flag of flags) {
            const clientId = clients[clientIndex];

            // Send poll request to client
            this.sseManager.sendToClient(clientId, 'poll_request', {
                flagId: flag.id,
                date: flag.date,
                articleId: flag.articleId,
                name: flag.name
            });

            logger.info(`Assigned flag ${flag.id} to client ${clientId}`);

            // Move to next client
            clientIndex = (clientIndex + 1) % clients.length;
        }
    }

    async handlePollResult(flagId: string, isAvailable: boolean): Promise<void> {
        if (!isAvailable) return;

        const flag = await this.flagStore.getFlag(flagId);
        if (!flag) return; // Flag might have been removed

        logger.success(`Item ${flag.name} (${flag.id}) is now AVAILABLE! Broadcasting...`);

        // Notify ALL clients
        this.sseManager.broadcast('item_update', {
            flagId: flag.id,
            status: 'available',
            name: flag.name,
            date: flag.date,
            articleId: flag.articleId
        });

        // Remove flag since it's now available? 
        // Or keep it until cutoff? Requirement says "remove when cutoff reached"
        // But if it becomes available, we might want to keep checking if it becomes unavailable again?
        // Let's keep it for now, user can manually remove or it expires.
        // Actually, if user orders it, they should likely unflag it.
    }
}
