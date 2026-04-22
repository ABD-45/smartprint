/**
 * Notification Service (SMS via Twilio)
 * 
 * Replaces the WhatsApp notification system with standard SMS.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });

// Initialize Twilio Client
let twilioClient = null;
if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * Send an SMS message
 * @param {string} phone - Recipient phone number (with country code)
 * @param {string} message - Message body
 */
const sendSMS = async (phone, message) => {
    try {
        // Basic phone cleanup (ensure it has country code if missing)
        let cleanPhone = phone.replace(/\D/g, '');
        // If 10 digits, prefix with 91 (India)
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
        // Ensure + prefix for Twilio
        const formattedPhone = `+${cleanPhone}`;

        console.log(`\n--- 📱 SMS NOTIFICATION ---`);
        console.log(`To: ${formattedPhone}`);
        console.log(`Message: ${message}`);
        console.log(`---------------------------\n`);

        if (twilioClient) {
            await twilioClient.messages.create({
                from: process.env.TWILIO_PHONE_NUMBER,
                body: message,
                to: formattedPhone
            });
            console.log(`✅ Twilio: SMS sent to ${formattedPhone}`);
        } else {
            console.log(`ℹ️ Twilio client not initialized. SMS simulation only.`);
        }

        return { success: true, timestamp: new Date() };
    } catch (err) {
        console.error('❌ SMS Service Error:', err.message);
        return { success: false, error: err.message };
    }
};

/**
 * Send OTP for Phone Verification
 */
const sendVerificationOTP = async (phone, otp) => {
    const message = `SmartPrint Verification: Your code is ${otp}. Valid for 10 minutes.`;
    return await sendSMS(phone, message);
};

/**
 * Send Job Ready Notification with Pickup OTP
 */
const sendJobReadyNotification = async (phone, jobName, otp) => {
    const message = `SmartPrint: Your prints for "${jobName}" are ready! Pickup OTP: ${otp}.`;
    return await sendSMS(phone, message);
};

/**
 * Send Job Queued Notification (after payment)
 */
const sendJobQueuedNotification = async (phone, jobName, position, eta) => {
    const message = `SmartPrint: Payment successful for "${jobName}". Queue Position: #${position}. Est. Wait: ${eta} mins.`;
    return await sendSMS(phone, message);
};

/**
 * Send Job Failed Notification
 */
const sendJobFailedNotification = async (phone, jobName, reason) => {
    const message = `SmartPrint: Job "${jobName}" failed. Reason: ${reason}. Please check the dashboard.`;
    return await sendSMS(phone, message);
};

module.exports = {
    sendSMS,
    sendVerificationOTP,
    sendJobReadyNotification,
    sendJobQueuedNotification,
    sendJobFailedNotification
};
