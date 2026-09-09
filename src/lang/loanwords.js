// Cross-lingual food loanwords that appear (often capitalized) in BOTH German and
// English menu descriptions and may score "German-ish" on the trigram model.
//
// Used for two purposes:
//  1. dishes.js  — avoid mistaking a loanword inside an English dish name for the
//                  start of the next German dish (small tie-breaker penalty).
//  2. score.js   — exempt these from the asymmetric "German-word-inside-English"
//                  purity penalty, so a legit English dish name isn't punished.
export const LOANWORDS = new Set([
    'gnocchi', 'risotto', 'tiramisu', 'ravioli', 'lasagne', 'lasagna', 'pasta', 'penne',
    'spaghetti', 'pesto', 'ratatouille', 'stifado', 'gulasch', 'goulash', 'couscous',
    'bulgur', 'falafel', 'hummus', 'masala', 'chana', 'ravaya', 'yakitori', 'donut',
    'muffin', 'parmesan', 'mozzarella', 'feta', 'focaccia', 'baguette', 'panini',
    'gyros', 'baklava', 'wrap', 'bowl', 'dip', 'wok', 'sushi', 'curry', 'chili',
    'con', 'sin', 'carne', 'nachos', 'tacos', 'burrito', 'kebab', 'doner', 'quiche', 'wedges', 'polenta',
    'ciabatta', 'bruschetta', 'antipasti', 'olive', 'olives', 'oliven', 'carpaccio', 'bolognese', 'pomodoro',
    'tagliatelle', 'carbonara', 'arrabiata', 'arabiata', 'arrabbiata',
    'fusilli', 'farfalle', 'tortellini', 'tortelloni', 'macaroni', 'linguine',
    'fettuccine', 'rigatoni', 'orecchiette', 'pappardelle', 'cannelloni',
    'conchiglie', 'bucatini', 'jambalaya',
    'schnitzel', 'schöberl', 'backerbsen', 'strudel', 'spätzle', 'spaetzle',
    'pizza', 'zucchini', 'minestrone', 'cheddar', 'tofu', 'croutons', 'quinoa',
    'harissa', 'prosciutto', 'steak', 'burger'
]);

export function isLoanword(token) {
    if (!token) return false;
    const w = String(token).toLowerCase().replace(/[^a-zäöüß]/g, '');
    if (w.length === 0) return false;
    if (LOANWORDS.has(w)) return true;
    // German compounds ending in a cross-lingual food word ("Linsenlasagne",
    // "Spinatlasagne", "Himbeerstrudel") inherit its ambiguity — a trigram
    // model misreads them as English and findDishBoundary would cut the dish
    // name off its own side. Suffix must be a full loanword (>= 4 chars).
    for (const loan of LOANWORDS) {
        if (loan.length >= 4 && w.length > loan.length && w.endsWith(loan)) return true;
    }
    return false;
}
