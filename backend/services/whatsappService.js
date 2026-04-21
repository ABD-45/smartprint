/**
 * WhatsApp Notification Service
 * 
 * In a real production app, you would use Twilio, Gupshup, or Meta WhatsApp Business API.
 * For now, this service logs to the console and simulates the notification flow.
 */

const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), override: true });

// Initialize Twilio Client
let twilioClient = null;
if (process.env.TWILIO_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
}

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!twilioClient;

/**
 * Send a WhatsApp message
 * @param {string} phone - Recipient phone number (with country code)
 * @param {string} message - Message body
 */
const sendWhatsAppMessage = async (phone, message) => {
    try {
        // Basic phone cleanup (ensure it has country code if missing)
        let cleanPhone = phone.replace(/\D/g, '');
        // If 10 digits, prefix with 91 (India)
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

        console.log(`\n--- 📱 WHATSAPP NOTIFICATION ---`);
        console.log(`To: ${cleanPhone}`);
        console.log(`Message: ${message}`);
        console.log(`----------------------------------\n`);

        if (twilioClient) {
            await twilioClient.messages.create({
                from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
                body: message,
                to: `whatsapp:+${cleanPhone}`
            });
            console.log(`✅ Twilio: Message sent to +${cleanPhone}`);
        }

        return { success: true, timestamp: new Date() };
    } catch (err) {
        console.error('❌ WhatsApp Service Error:', err.message);
        return { success: false, error: err.message };
    }
};

/**
 * Send OTP for Phone Verification
 */
const sendVerificationOTP = async (phone, otp) => {
    const message = `*SmartPrint Verification*\n\nYour verification code is: *${otp}*.\n\nPlease enter this code to verify your mobile number and create your account.`;
    return await sendWhatsAppMessage(phone, message);
};

/**
 * Send Job Ready Notification with Pickup OTP
 */
const sendJobReadyNotification = async (phone, jobName, otp) => {
    const message = `*🖨️ SmartPrint: Your Prints are Ready!*\n\nHello! Your print job *${jobName}* has been completed and is ready for pickup.\n\n🔑 *Pickup OTP:* ${otp}\n\nPlease show this code at the counter to collect your documents.\n\nThank you for using SmartPrint! ✨`;
    return await sendWhatsAppMessage(phone, message);
};

/**
 * Send Job Queued Notification (after payment)
 */
const sendJobQueuedNotification = async (phone, jobName, position, eta) => {
    const message = `*✅ SmartPrint: Payment Successful!*\n\nYour job *${jobName}* has been added to the priority queue.\n\n*Position:* #${position}\n*Estimated Wait:* ${eta} mins\n\nWe'll notify you when it's ready for pickup.`;
    return await sendWhatsAppMessage(phone, message);
};

/**
 * Send Job Failed Notification
 */
const sendJobFailedNotification = async (phone, jobName, reason) => {
    const message = `*❌ SmartPrint: Print Job Failed*\n\n*File:* ${jobName}\n*Reason:* ${reason}\n\nPlease check the dashboard or visit the shop for more details. Your amount will be refunded if applicable.`;
    return await sendWhatsAppMessage(phone, message);
};

module.exports = {
    sendWhatsAppMessage,
    sendVerificationOTP,
    sendJobReadyNotification,
    sendJobQueuedNotification,
    sendJobFailedNotification
};
