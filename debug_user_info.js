
const GUEST_TOKEN = 'c3418725e95a9f90e3645cbc846b4d67c7c66131';

// User credentials (I need the user's credentials to test this... wait, I don't have them in plain text, only the hardcoded token in previous steps)
// Verify if I have a valid username/password to test with.
// The user provided a token 'c3418725e...' which is the guest token.
// The user has a session token in local storage from previous steps: 'c3418725e95a9f90e3645cbc846b4d67c7c66131'
// Actually that looks like the GUEST_TOKEN.
// The user logs in with Employee ID and Password.
// I can't test login without credentials.

// However, I can check if there's a /users/me or /auth/me endpoint that returns user info given a token.
// Let's try fetching /api/v1/users/me with the token I have.

// Node 18+ has global fetch
// const fetch = require('node-fetch'); 

async function checkMe() {
    const token = 'c3418725e95a9f90e3645cbc846b4d67c7c66131'; // Using the token we have
    const url = 'https://api.bessa.app/v1/users/me/'; // Guessing the endpoint

    // Or maybe /auth/user/

    try {
        console.log('Testing /users/me/ ...');
        let res = await fetch('https://api.bessa.app/v1/users/me/', {
            headers: {
                'Authorization': `Token ${token}`,
                'Accept': 'application/json'
            }
        });
        if (res.ok) {
            console.log(await res.json());
            return;
        } else {
            console.log(`Failed: ${res.status}`);
        }

        console.log('Testing /auth/user/ ...');
        res = await fetch('https://api.bessa.app/v1/auth/user/', {
            headers: {
                'Authorization': `Token ${token}`,
                'Accept': 'application/json'
            }
        });
        if (res.ok) {
            console.log(await res.json());
            return;
        } else {
            console.log(`Failed: ${res.status}`);
        }

    } catch (e) {
        console.error(e);
    }
}

checkMe();
