// TypeScript type definitions for menu data structures

export interface MenuItem {
    id: string;           // e.g., "2026-02-03_M1_Herzhaftes" (date + menu ID for uniqueness)
    name: string;         // e.g., "M1 Herzhaftes"
    description: string;  // Zutaten + Allergen-Codes
    price: number;        // 5.50
    available: boolean;
}

export interface DayMenu {
    date: string;         // ISO format: "2026-02-03"
    weekday: string;      // "Monday", "Tuesday", ...
    items: MenuItem[];
}

export interface WeeklyMenu {
    year: number;         // 2026 (year before week for readability)
    weekNumber: number;   // 6
    days: DayMenu[];
    scrapedAt: string;    // ISO timestamp
}

export interface MenuDatabase {
    lastUpdated: string;  // ISO timestamp
    weeks: WeeklyMenu[];
}
