const twilio = require('twilio');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

async function singleTest() {
    console.log('🚀 Running SINGLE test...');
    console.log(`From: whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`);
    console.log(`To: whatsapp:+919787361318`);
    
    try {
        const msg = await client.messages.create({
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: 'whatsapp:+919787361318',
            body: 'SmartPrint: Final verification test. If you see this, it works!'
        });
        console.log('✅ TEST SUCCESS! Message SID:', msg.sid);
    } catch (err) {
        console.error('❌ TEST FAILED:', err.message);
    }
}

singleTest();
