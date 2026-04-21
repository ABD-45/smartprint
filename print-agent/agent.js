const io = require('socket.io-client');
const ptp = require("pdf-to-printer");
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os');

// Configuration - Change this to your server URL
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';
const SHOP_ID = process.env.SHOP_ID || 'shop-001';

console.log(`==========================================`);
console.log(`🚀 SmartPrint Zero-Touch Agent`);
console.log(`==========================================`);
console.log(`📍 Server: ${SERVER_URL}`);
console.log(`🆔 Shop ID: ${SHOP_ID}`);
console.log(`💡 TIP: No physical printer? Set "Microsoft Print to PDF"`);
console.log(`   as your default printer to test the flow!`);
console.log(`==========================================\n`);
const socket = io(SERVER_URL, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
});

socket.on('connect', () => {
    console.log('✅ Connected to Cloud Server');
    // Register this shop so the server knows where to send jobs
    socket.emit('register_shop', { shopId: SHOP_ID });
});

socket.on('disconnect', () => {
    console.warn('❌ Disconnected from server. Reconnecting...');
});

socket.on('incoming_print_job', async (jobData) => {
    console.log(`📥 Incoming Job: ${jobData.jobId} - ${jobData.originalName}`);
    
    const tempDir = path.join(os.tmpdir(), 'smartprint-jobs');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    
    const tempFilePath = path.join(tempDir, `job_${jobData.jobId}.pdf`);
    
    try {
        // 1. Download the file
        console.log(`⏳ Downloading: ${jobData.originalName}`);
        const response = await axios({
            method: 'get',
            url: jobData.fileUrl,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        writer.on('finish', async () => {
            try {
                console.log(`🖨️  Printing: ${jobData.originalName}`);
                
                // 2. Silent Print Settings
                const options = {
                    printer: jobData.settings?.printerName, // Uses default if null
                    copies: jobData.settings?.copies || 1,
                    monochrome: !jobData.settings?.color,
                    paperSize: jobData.settings?.paperSize || 'A4',
                    orientation: jobData.settings?.orientation || 'portrait'
                };

                // 3. Send to Hardware Spooler
                await ptp.print(tempFilePath, options);
                console.log(`✅ Print Successful: ${jobData.jobId}`);
                
                // 4. Update status back to server
                socket.emit('job_status', { 
                    jobId: jobData.jobId, 
                    status: 'printing_started',
                    note: 'Sent to hardware spooler'
                });

                // 5. Hardcopy only: Delete the digital file immediately
                fs.unlinkSync(tempFilePath);
                console.log(`🗑️  Digital trace removed.`);

            } catch (printErr) {
                console.error('❌ Hardware Print Error:', printErr);
                socket.emit('job_status', { 
                    jobId: jobData.jobId, 
                    status: 'failed', 
                    reason: printErr.message 
                });
                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            }
        });

        writer.on('error', (err) => {
            console.error('❌ Download Stream Error:', err);
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        });

    } catch (error) {
        console.error('❌ Network/Download Error:', error);
        socket.emit('job_status', { 
            jobId: jobData.jobId, 
            status: 'failed', 
            reason: 'File download failed' 
        });
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    }
});
