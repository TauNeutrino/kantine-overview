#!/usr/bin/env node
import { MenuScraper } from './scraper/menu-scraper.js';
import { mergeWeeklyMenu } from './storage/menu-store.js';
import { config, validateConfig } from './config.js';
import { logger } from './utils/logger.js';

/**
 * Main entry point for the scraper
 */
async function main() {
    try {
        // Validate configuration
        logger.info('Validating configuration...');
        validateConfig();

        // Initialize scraper
        const scraper = new MenuScraper();
        await scraper.init();

        try {
            // Scrape menus
            logger.info('Starting scrape of menus (multi-week)...');
            const weeklyMenu = await scraper.scrapeMenus();

            // Save to storage
            logger.info('Saving scraped data...');
            await mergeWeeklyMenu(weeklyMenu);

            // Print summary
            logger.success('\\n=== Scraping Complete ===');
            logger.info(`Week: ${weeklyMenu.year}-W${weeklyMenu.weekNumber}`);
            logger.info(`Days scraped: ${weeklyMenu.days.length}`);

            for (const day of weeklyMenu.days) {
                logger.info(`  ${day.weekday}: ${day.items.length} items`);
            }

            const totalItems = weeklyMenu.days.reduce((sum, day) => sum + day.items.length, 0);
            logger.success(`Total menu items: ${totalItems}`);

        } finally {
            // Always close browser
            await scraper.close();
        }

    } catch (error) {
        logger.error('Scraping failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { main };
