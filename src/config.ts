// Configuration for scraper

import dotenv from 'dotenv';
dotenv.config();

export const config = {
    // Credentials from environment
    credentials: {
        employeeNumber: process.env.BESSA_EMPLOYEE_NUMBER || '',
        password: process.env.BESSA_PASSWORD || '',
    },

    // Puppeteer settings
    puppeteer: {
        headless: process.env.PUPPETEER_HEADLESS !== 'false',
        defaultTimeout: 30000,
        navigationTimeout: 60000,
    },

    // Scraper settings
    scraper: {
        waitAfterClick: 1000,
        waitAfterNavigation: 2000,
        maxRetries: 3,
    },

    // Storage
    storage: {
        dataDir: './data',
        menuFile: './data/menus.json',
    },
} as const;

// Validation
export function validateConfig(): void {
    if (!config.credentials.employeeNumber) {
        throw new Error('BESSA_EMPLOYEE_NUMBER is required in .env file');
    }
    if (!config.credentials.password) {
        throw new Error('BESSA_PASSWORD is required in .env file');
    }
}
