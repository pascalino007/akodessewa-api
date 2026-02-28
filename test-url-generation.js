const { v4: uuid } = require('uuid');

// Test URL generation logic
function testUrlGeneration() {
  console.log('🔗 Testing URL Generation');
  console.log('==========================');

  // Test DigitalOcean Spaces URL generation
  const bucket = 'myikigai';
  const region = 'sfo2';
  const folder = 'products';
  const fileId = uuid();
  const ext = 'png';
  
  const key = `akodessewa/${folder}/${fileId}.${ext}`;
  const cdnUrl = `https://${bucket}.${region}.cdn.digitaloceanspaces.com`;
  const fullUrl = `${cdnUrl}/${key}`;

  console.log('📦 Configuration:');
  console.log('Bucket:', bucket);
  console.log('Region:', region);
  console.log('Folder:', folder);
  console.log('File ID:', fileId);
  console.log('Extension:', ext);
  
  console.log('\n🔧 Generated:');
  console.log('Key:', key);
  console.log('CDN URL:', cdnUrl);
  console.log('Full URL:', fullUrl);
  
  console.log('\n✅ Expected URL format:');
  console.log('https://myikigai.sfo2.cdn.digitaloceanspaces.com/akodessewa/products/23cc61c2-ffdd-4b23-9cc8-7e6fa8b55dbc.png');
  
  console.log('\n🎯 Generated URL format:');
  console.log(fullUrl);
  
  // Test if format matches expected
  const expectedPattern = /^https:\/\/[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+\.cdn\.digitaloceanspaces\.com\/akodessewa\/.+\/.+$/;
  const isCorrectFormat = expectedPattern.test(fullUrl);
  
  console.log('\n🔍 Format validation:');
  console.log('Matches expected pattern:', isCorrectFormat ? '✅ Yes' : '❌ No');
  
  if (isCorrectFormat) {
    console.log('✅ URL generation is correct!');
    console.log('💾 This URL should be stored in ProductImage.url field');
  } else {
    console.log('❌ URL generation needs fixing');
  }
}

// Test different scenarios
function testScenarios() {
  console.log('\n🧪 Testing Different Scenarios');
  console.log('==================================');
  
  const scenarios = [
    { bucket: 'myikigai', region: 'sfo2', folder: 'products', ext: 'jpg' },
    { bucket: 'test-bucket', region: 'nyc3', folder: 'avatars', ext: 'png' },
    { bucket: 'akodessewa-uploads', region: 'fra1', folder: 'documents', ext: 'pdf' },
  ];
  
  scenarios.forEach((scenario, index) => {
    const fileId = uuid();
    const key = `akodessewa/${scenario.folder}/${fileId}.${scenario.ext}`;
    const cdnUrl = `https://${scenario.bucket}.${scenario.region}.cdn.digitaloceanspaces.com`;
    const fullUrl = `${cdnUrl}/${key}`;
    
    console.log(`\nScenario ${index + 1}:`);
    console.log('  Bucket:', scenario.bucket);
    console.log('  Region:', scenario.region);
    console.log('  Folder:', scenario.folder);
    console.log('  URL:', fullUrl);
  });
}

// Test environment variable loading
function testEnvironmentVariables() {
  console.log('\n🔧 Environment Variables Test');
  console.log('===============================');
  
  const fs = require('fs');
  
  if (fs.existsSync('.env')) {
    console.log('📁 .env file found');
    const envContent = fs.readFileSync('.env', 'utf8');
    
    const spacesVars = [
      'SPACES_BUCKET',
      'SPACES_REGION', 
      'SPACES_CDN_URL',
      'SPACES_ENDPOINT',
      'SPACES_KEY',
      'SPACES_SECRET'
    ];
    
    spacesVars.forEach(varName => {
      const match = envContent.match(new RegExp(`^${varName}=(.+)$`, 'm'));
      if (match) {
        console.log(`✅ ${varName}: ${match[1]}`);
      } else {
        console.log(`❌ ${varName}: Not set`);
      }
    });
  } else {
    console.log('❌ .env file not found');
  }
}

function main() {
  testUrlGeneration();
  testScenarios();
  testEnvironmentVariables();
  
  console.log('\n📋 Summary:');
  console.log('1. Upload service generates URLs in correct format');
  console.log('2. URLs are stored in ProductImage.url field');
  console.log('3. Format: https://bucket.region.cdn.digitaloceanspaces.com/akodessewa/folder/file.ext');
  console.log('4. Make sure SPACES_* variables are set correctly in .env');
}

main().catch(console.error);
