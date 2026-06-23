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
    'nachos', 'tacos', 'burrito', 'kebab', 'doner', 'quiche', 'wedges', 'polenta',
    'ciabatta', 'bruschetta', 'antipasti', 'carpaccio'
]);

export function isLoanword(token) {
    if (!token) return false;
    const w = String(token).toLowerCase().replace(/[^a-zäöüß]/g, '');
    return w.length > 0 && LOANWORDS.has(w);
}
