require('dotenv').config();

const fs = require('fs');
const path = require('path');

// Read the template file
const templatePath = path.join(__dirname, '../js/config.js.template');
const outputPath = path.join(__dirname, '../js/config.js');

let template = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders with environment variables
template = template.replace('{{API_KEY}}', process.env.API_KEY || 'DEMO_KEY');
template = template.replace('{{AUTH_DOMAIN}}', process.env.AUTH_DOMAIN || 'demo-app.firebaseapp.com');
template = template.replace('{{DATABASE_URL}}', process.env.DATABASE_URL || 'https://demo-app.firebaseio.com');
template = template.replace('{{PROJECT_ID}}', process.env.PROJECT_ID || 'demo-app');
template = template.replace('{{STORAGE_BUCKET}}', process.env.STORAGE_BUCKET || 'demo-app.appspot.com');
template = template.replace('{{MESSAGING_SENDER_ID}}', process.env.MESSAGING_SENDER_ID || '000000000000');

// Write the generated config file
fs.writeFileSync(outputPath, template);

console.log('Config file generated successfully!');