import fs from 'fs/promises';
import path from 'path';
import { MenuDatabase, WeeklyMenu } from '../types.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

/**
 * Load existing menu database from JSON file
 */
export async function loadMenus(): Promise<MenuDatabase> {
    try {
        const content = await fs.readFile(config.storage.menuFile, 'utf-8');
        return JSON.parse(content);
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            logger.info('No existing menus.json found, creating new database');
            return {
                lastUpdated: new Date().toISOString(),
                weeks: [],
            };
        }
        throw error;
    }
}

/**
 * Save menu database to JSON file
 */
export async function saveMenus(db: MenuDatabase): Promise<void> {
    // Ensure data directory exists
    await fs.mkdir(config.storage.dataDir, { recursive: true });

    // Update timestamp
    db.lastUpdated = new Date().toISOString();

    // Write with pretty formatting
    await fs.writeFile(
        config.storage.menuFile,
        JSON.stringify(db, null, 2),
        'utf-8'
    );

    logger.success(`Saved menu database to ${config.storage.menuFile}`);
}

/**
 * Merge a new weekly menu into the database
 * Replaces existing week if found, otherwise adds it
 */
export async function mergeWeeklyMenu(weeklyMenu: WeeklyMenu): Promise<void> {
    const db = await loadMenus();

    // Find and replace existing week, or add new one
    const existingIndex = db.weeks.findIndex(
        w => w.year === weeklyMenu.year && w.weekNumber === weeklyMenu.weekNumber
    );

    if (existingIndex >= 0) {
        db.weeks[existingIndex] = weeklyMenu;
        logger.info(`Updated existing week ${weeklyMenu.year}-W${weeklyMenu.weekNumber}`);
    } else {
        db.weeks.push(weeklyMenu);
        logger.info(`Added new week ${weeklyMenu.year}-W${weeklyMenu.weekNumber}`);
    }

    // Sort weeks by year and week number
    db.weeks.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.weekNumber - b.weekNumber;
    });

    await saveMenus(db);
}

/**
 * Get menu for a specific date
 */
export async function getMenuForDate(date: string): Promise<import('../types.js').DayMenu | null> {
    const db = await loadMenus();

    for (const week of db.weeks) {
        const day = week.days.find(d => d.date === date);
        if (day) return day;
    }

    return null;
}
