// Script to setup .env file for in-memory mode
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envSamplePath = path.join(__dirname, 'env.sample');

let envContent = `PORT=3000
USE_IN_MEMORY=true

# MongoDB Atlas connection string (optional - only needed if USE_IN_MEMORY=false)
# To use MongoDB, set USE_IN_MEMORY=false and configure MONGODB_URI below
# MONGODB_URI=mongodb+srv://cse470_database:YOUR_PASSWORD@cluster0.nqxbtl9.mongodb.net/virtual_campus?retryWrites=true&w=majority&appName=Cluster0

# JWT Secret for authentication
JWT_SECRET=virtual-campus-secret-key-change-in-production-2024
`;

try {
  if (fs.existsSync(envPath)) {
    const existing = fs.readFileSync(envPath, 'utf8');
    // Only update if USE_IN_MEMORY is not set or is false
    if (!existing.includes('USE_IN_MEMORY=true')) {
      // Update USE_IN_MEMORY to true
      const updated = existing.replace(/USE_IN_MEMORY=false/g, 'USE_IN_MEMORY=true');
      if (!updated.includes('USE_IN_MEMORY=')) {
        // Add USE_IN_MEMORY if it doesn't exist
        const lines = updated.split('\n');
        lines.splice(1, 0, 'USE_IN_MEMORY=true');
        fs.writeFileSync(envPath, lines.join('\n'));
        console.log('✅ Updated .env file: Set USE_IN_MEMORY=true');
      } else {
        fs.writeFileSync(envPath, updated);
        console.log('✅ Updated .env file: Set USE_IN_MEMORY=true');
      }
    } else {
      console.log('✅ .env file already configured for in-memory mode');
    }
  } else {
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file with in-memory mode enabled');
  }
  console.log('\n📝 Your .env file is now configured for in-memory mode.');
  console.log('💡 This means the app will work without MongoDB!');
  console.log('   (Data resets on server restart, but perfect for testing)\n');
} catch (error) {
  console.error('❌ Error setting up .env file:', error.message);
  console.log('\n📝 Please manually create .env file with:');
  console.log('   USE_IN_MEMORY=true\n');
}

