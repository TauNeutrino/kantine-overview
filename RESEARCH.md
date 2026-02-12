# Bessa API Authentication Research

This document describes the authentication flow for the Bessa Web App (`web.bessa.app/knapp-kantine`).

## Overview

The authentication process follows a multi-step flow involving a guest token and user credentials.

### 1. Initial Guest Session
When the page first loads, it initializes a guest session. This session is associated with a guest token.

*   **Identified Guest Token:** `c3418725e95a9f90e3645cbc846b4d67c7c66131`
*   **Usage:** Mandatory for the login request itself.

### 2. User Login
The login request is sent to the `/auth/login/` endpoint.

*   **Endpoint:** `POST https://api.bessa.app/v1/auth/login/`
*   **Headers:**
    *   `Authorization`: `Token <Guest_Token>`
    *   `Content-Type`: `application/json`
    *   `Accept`: `application/json`
    *   `X-Client-Version`: `1.7.0_prod/2026-01-26` (Example)
*   **Request Body:**
    ```json
    {
      "email": "knapp-<EMPLOYEE_NUMBER>@bessa.app",
      "password": "<PASSWORD>"
    }
    ```
    > [!NOTE]
    > The employee number entered in the UI is automatically transformed into an email format: `knapp-<number>@bessa.app`.

### 3. Authentication Result
A successful login returns a session key.

*   **Response (200 OK):**
    ```json
    {
      "key": "dba7d86e83c7f462fd8af96521dea41c4facd8a5"
    }
    ```
*   **Usage:** This `key` MUST be used in the `Authorization` header for all subsequent API requests.
*   **Header Format:** `Authorization: Token dba7d86e83c7f462fd8af96521dea41c4facd8a5`

### 4. Token Persistence
*   The token is stored in the browser's `localStorage` under the key `AkitaStores`.
*   Path: `AkitaStores.auth.token`

## Implementation Considerations

For the wrapper implementation:
1.  **In-Memory Storage**: The token should be handled purely in-memory (e.g., in the user session) to ensure security and follow privacy guidelines.
2.  **No Persistence**: Credentials or tokens should never be written to disk in a production environment.
3.  **Automatic Email Transformation**: The login handler should automatically prepend `knapp-` and append `@bessa.app` to the provided employee number to mimic the official app's behavior.
