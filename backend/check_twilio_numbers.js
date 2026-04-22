const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../backend/.env'), override: true });

const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkNumbers() {
    try {
        console.log("Checking numbers for account:", process.env.TWILIO_SID);
        const numbers = await client.incomingPhoneNumbers.list({limit: 20});
        console.log("Found numbers:");
        numbers.forEach(n => console.log(`- ${n.phoneNumber} (${n.friendlyName})`));
        
        if (numbers.length === 0) {
            console.log("No numbers found on this account.");
        }
    } catch (err) {
        console.error("Error checking numbers:", err.message);
    }
}

checkNumbers();
