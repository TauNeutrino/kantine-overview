
const SESS_KEY = 'c3418725e95a9f90e3645cbc846b4d67c7c66131';
const URL = 'https://web.bessa.app/api/v1/venues/591/menu/7/2026-02-13/';

async function run() {
    try {
        const response = await fetch(URL, {
            headers: {
                'Authorization': `Token ${SESS_KEY}`,
                'Accept': 'application/json',
                'X-Client-Version': '3.10.2'
            }
        });
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

run();
