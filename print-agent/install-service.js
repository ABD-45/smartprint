const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'SmartPrintAgent',
  description: 'Automated background print agent for Zero-Touch printing.',
  script: path.join(__dirname, 'agent.js'),
  env: [
    {
      name: "SERVER_URL",
      value: "http://localhost:5000" // Change this to your production URL
    },
    {
      name: "SHOP_ID",
      value: "shop-001"
    }
  ]
});

const action = process.argv[2];

svc.on('install', () => {
  console.log('✅ Service Installed Successfully.');
  svc.start();
});

svc.on('uninstall', () => {
  console.log('🗑️  Service Uninstalled Successfully.');
});

svc.on('alreadyinstalled', () => {
  console.log('ℹ️  Service is already installed.');
});

svc.on('start', () => {
  console.log('🚀 Service Started.');
});

if (action === '--install') {
  svc.install();
} else if (action === '--uninstall') {
  svc.uninstall();
} else {
  console.log('Usage: node install-service.js [--install | --uninstall]');
}
