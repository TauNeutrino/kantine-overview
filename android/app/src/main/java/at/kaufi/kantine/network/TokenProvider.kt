package at.kaufi.kantine.network

interface TokenProvider {
    fun getToken(): String?
}
