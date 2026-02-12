// CSS Selectors based on screen documentation

export const SELECTORS = {
    // Cookie Consent (Screen #1)
    COOKIE_ACCEPT_ALL: 'button::-p-text(Accept all), button::-p-text(Alle akzeptieren), button::-p-text(Zustimmen), .cmpboxbtnyes',

    // Landing Page (Screen #2)
    PREORDER_MENU_BUTTON: 'button.order-type-button.button.high::-p-text(Pre-order menu)',

    // Login Modal (Screen #5)
    LOGIN_MODAL_CONTAINER: 'app-access-code-dialog, app-access-code-login',
    LOGIN_ACCESS_CODE: 'input[formcontrolname="accessCode"]',
    LOGIN_PASSWORD: 'input[formcontrolname="password"]',
    LOGIN_SUBMIT: 'button[bessa-button].base-button.button',
    LOGIN_ERROR_MESSAGE: '.mat-error, .toast-error, app-message, .error, [class*="error"]',

    // Day Selection Dialog (Screen #10, #11)
    DAY_SELECTION_DIALOG: 'app-canteen-dialog, app-bessa-select-day-dialog',
    WEEK_CHEVRON_NEXT: 'button[aria-label="next week"]',
    WEEK_CHEVRON_PREV: 'button[aria-label="previous week"]',
    WEEK_HEADER: 'h2, [class*="week-header"], .calendar-week',
    DAY_ROW: 'app-date-line',
    ADD_ORDER_LINK: 'div.clickable',

    // Menu Overview (Screen #14)
    MENU_CARD: '.menu-card, .dish-card, app-bessa-menu-card, [class*="menu-item"]',
    MENU_ITEM_TITLE: 'h3, .menu-title, [class*="title"]',
    MENU_ITEM_DESCRIPTION: 'p, .menu-description, [class*="description"]',
    MENU_ITEM_PRICE: '.price, [class*="price"], .amount',
    MENU_ITEM_ADD_BUTTON: 'button::-p-text(+), button.add-button',
    NOT_AVAILABLE_TEXT: '::-p-text(Not available), ::-p-text(Nicht verfügbar)',

    // Week/Date Display
    CALENDAR_WEEK_DISPLAY: '[class*="week"]',
    DATE_DISPLAY: '[class*="date"]',

    // Close/Back buttons
    CLOSE_BUTTON: 'button[aria-label="close"], .close-btn, button.close, mat-icon::-p-text(close)',
    BACK_BUTTON: 'button[aria-label="back"], .back-arrow, button.back, mat-icon::-p-text(arrow_back)',
    DONE_BUTTON: 'button::-p-text(Done), button::-p-text(Fertig)',
} as const;

export const URLS = {
    BASE: 'https://web.bessa.app/knapp-kantine',
    API_BASE: 'https://api.bessa.app/v1',
} as const;
