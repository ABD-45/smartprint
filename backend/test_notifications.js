const dotenv = require('dotenv');
const path = require('path');

// Load .env from backend
dotenv.config({ path: path.join(__dirname, '../backend/.env'), override: true });

console.log(`DEBUG: SID=${process.env.TWILIO_SID ? process.env.TWILIO_SID.substring(0, 5) + '...' : 'MISSING'}`);
console.log(`DEBUG: Token=${process.env.TWILIO_AUTH_TOKEN ? 'EXISTS' : 'MISSING'}`);
console.log(`DEBUG: Number=${process.env.TWILIO_PHONE_NUMBER}`);

const { 
    sendVerificationOTP, 
    sendJobReadyNotification, 
    sendJobQueuedNotification,
    sendJobFailedNotification 
} = require('../backend/services/notificationService');

async function testSMS() {
    const testPhone = '918610503706'; // Recipient number
    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    
    console.log('🧪 Testing SMS Notifications...');
    
    // 1. Test Verification OTP
    console.log('\n1. Sending Verification OTP...');
    await sendVerificationOTP(testPhone, '625576');
    await delay(2000);
    
    // 2. Test Job Queued
    console.log('\n2. Sending Job Queued Notification...');
    await sendJobQueuedNotification(testPhone, 'Lecture_Notes.pdf', 3, 15);
    await delay(2000);
    
    // 3. Test Job Ready
    console.log('\n3. Sending Job Ready Notification...');
    await sendJobReadyNotification(testPhone, 'Project_Final.docx', '654321');
    await delay(2000);
    
    // 4. Test Job Failed
    console.log('\n4. Sending Job Failed Notification...');
    await sendJobFailedNotification(testPhone, 'Photo_HighRes.jpg', 'File too large for printer buffer');
    
    console.log('\n✅ Test sequence complete. Check your phone!');
}

testSMS();
