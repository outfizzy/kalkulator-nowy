
import fetch from 'node-fetch';

const VAPI_PRIVATE_KEY = '6e28ccda-fee2-4159-b761-dd1e927d721c';

async function getVapiCalls() {
    console.log('Fetching last 5 calls from Vapi...');

    try {
        const response = await fetch('https://api.vapi.ai/call?limit=5', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${VAPI_PRIVATE_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Vapi API Error:', response.status, response.statusText);
            const text = await response.text();
            console.error('Body:', text);
            return;
        }

        const calls = await response.json();

        console.log('\n--- Recent Vapi Calls ---');
        calls.forEach((call: any) => {
            console.log(`\nID: ${call.id}`);
            console.log(`Created: ${call.createdAt}`);
            console.log(`Status: ${call.status}`);
            console.log(`Ended Reason: ${call.endedReason}`);
            console.log(`Customer Phone: ${call.customer?.number}`);
            console.log(`Metadata:`, JSON.stringify(call.metadata));
            if (call.analysis) {
                console.log(`Summary: ${call.analysis.summary}`);
            }
        });

    } catch (error) {
        console.error('Exception:', error);
    }
}

getVapiCalls();
