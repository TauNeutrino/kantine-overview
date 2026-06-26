package at.kaufi.kantine.domain.splitter

/**
 * Cross-lingual food loanwords that appear (often capitalized) in BOTH German and
 * English menu descriptions and may score "German-ish" on the trigram model.
 */
object Loanwords {
    private val LOANWORDS = setOf(
        "gnocchi", "risotto", "tiramisu", "ravioli", "lasagne", "lasagna", "pasta", "penne",
        "spaghetti", "pesto", "ratatouille", "stifado", "gulasch", "goulash", "couscous",
        "bulgur", "falafel", "hummus", "masala", "chana", "ravaya", "yakitori", "donut",
        "muffin", "parmesan", "mozzarella", "feta", "focaccia", "baguette", "panini",
        "gyros", "baklava", "wrap", "bowl", "dip", "wok", "sushi", "curry", "chili",
        "nachos", "tacos", "burrito", "kebab", "doner", "quiche", "wedges", "polenta",
        "ciabatta", "bruschetta", "antipasti", "carpaccio",
    )

    fun isLoanword(token: String?): Boolean {
        if (token.isNullOrBlank()) return false
        val w = token.lowercase().replace(Regex("[^a-zäöüß]"), "")
        return w.length > 0 && w in LOANWORDS
    }
}
