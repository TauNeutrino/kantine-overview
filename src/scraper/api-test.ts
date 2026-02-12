
import { logger } from '../utils/logger.js';

async function runApiTest() {
    logger.info('Starting API Test with cached token...');

    // Token from local_storage.json
    const cachedToken = 'dba7d86e83c7f462fd8af96521dea41c4facd8a5';

    // Date calculation
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // Try a few dates (sometimes today has no menu if it's late or weekend)
    // But let's stick to today or tomorrow.

    const venueId = 591;
    const menuId = 7;
    const apiUrl = `https://api.bessa.app/v1/venues/${venueId}/menu/${menuId}/${dateStr}/`;

    logger.info(`Testing API call to: ${apiUrl}`);
    logger.info(`Using Token: ${cachedToken.substring(0, 10)}...`);

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Token ${cachedToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
            }
        });

        logger.info(`Response Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const data = await response.json();
            logger.success('API Call Successful!');
            console.log(JSON.stringify(data, null, 2));
        } else {
            logger.error('API Call Failed.');
            const text = await response.text();
            console.log('Response Body:', text);
        }

    } catch (error) {
        logger.error('Fetch failed:', error);
    }
}

runApiTest();
