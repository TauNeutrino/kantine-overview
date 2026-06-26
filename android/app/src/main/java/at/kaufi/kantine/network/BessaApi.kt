package at.kaufi.kantine.network

import at.kaufi.kantine.network.dto.DailyMenuResponse
import at.kaufi.kantine.network.dto.LoginRequest
import at.kaufi.kantine.network.dto.LoginResponse
import at.kaufi.kantine.network.dto.MenuDateResponse
import at.kaufi.kantine.network.dto.OrderRequest
import at.kaufi.kantine.network.dto.PlaceholderOrderResponse
import at.kaufi.kantine.network.dto.UserResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface BessaApi {

    @POST("auth/login/")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @GET("auth/user/")
    suspend fun getUser(): UserResponse

    @GET("venues/{venueId}/menu/dates/")
    suspend fun getMenuDates(
        @Path("venueId") venueId: Int = 591,
    ): MenuDateResponse

    @GET("venues/{venueId}/menu/{menuId}/{date}/")
    suspend fun getDailyMenu(
        @Path("venueId") venueId: Int = 591,
        @Path("menuId") menuId: Int = 7,
        @Path("date") date: String,
    ): DailyMenuResponse

    /** Placeholder — order placement is not available in MVP. */
    @POST("user/orders/")
    suspend fun placeOrder(@Body request: OrderRequest): PlaceholderOrderResponse

    /** Placeholder — order cancellation is not available in MVP. */
    @POST("user/orders/{id}/cancel/")
    suspend fun cancelOrder(@Path("id") orderId: Int): PlaceholderOrderResponse
}
