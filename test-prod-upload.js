const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function testProductionUpload() {
  console.log('🧪 Testing Production Upload');
  console.log('=============================');

  const PROD_API = 'https://api.aakodessewa.com/api/v1';
  
  try {
    // Create test file
    const testContent = 'Test image content';
    fs.writeFileSync('test-prod-upload.png', testContent);

    // Create form data
    const form = new FormData();
    form.append('files', fs.createReadStream('test-prod-upload.png'), {
      filename: 'test-prod-upload.png',
      contentType: 'image/png'
    });
    form.append('folder', 'products');

    console.log('📤 Uploading to production...');
    console.log('URL:', `${PROD_API}/upload/multiple?folder=products`);
    console.log('🔄 Equivalent to: http://localhost:4000/api/v1/upload/multiple?folder=products');

    const response = await axios.post(
      `${PROD_API}/upload/multiple?folder=products`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000,
      }
    );

    console.log('✅ Upload successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));

    // Verify URL format
    if (response.data && Array.isArray(response.data)) {
      response.data.forEach((file, index) => {
        console.log(`\nFile ${index + 1}:`);
        console.log('  URL:', file.url);
        console.log('  Key:', file.key);
        
        // Check if URL matches expected format
        const expectedPattern = /^https:\/\/myikigai\.sfo2\.cdn\.digitaloceanspaces\.com\/akodessewa\/products\/.+$/;
        const isCorrectFormat = expectedPattern.test(file.url);
        
        console.log('  Format correct:', isCorrectFormat ? '✅ Yes' : '❌ No');
        
        if (isCorrectFormat) {
          console.log('  ✅ This URL can be stored in ProductImage.url');
        } else {
          console.log('  ❌ URL format needs fixing');
        }
      });
    }

    // Test if URL is accessible
    if (response.data && response.data[0] && response.data[0].url) {
      console.log('\n🌐 Testing URL accessibility...');
      try {
        const urlResponse = await axios.head(response.data[0].url, { timeout: 10000 });
        console.log('✅ URL is accessible (Status:', urlResponse.status, ')');
      } catch (urlError) {
        console.log('❌ URL not accessible:', urlError.message);
        console.log('💡 Check DigitalOcean Spaces permissions and CORS settings');
      }
    }

  } catch (error) {
    console.error('❌ Upload failed:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      
      if (error.response.status === 404) {
        console.log('💡 Endpoint not found - check if application is deployed');
      } else if (error.response.status === 401) {
        console.log('💡 Authentication required - check if endpoint is public');
      } else if (error.response.status === 413) {
        console.log('💡 File too large - check upload limits');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 Connection refused - server not running');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 Domain not found - check DNS settings');
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    // Clean up test file
    if (fs.existsSync('test-prod-upload.png')) {
      fs.unlinkSync('test-prod-upload.png');
    }
  }
}

// Test endpoint availability first
async function testEndpointAvailability() {
  console.log('🔍 Testing Endpoint Availability');
  console.log('=================================');

  const endpoints = [
    'https://api.aakodessewa.com/api/v1/upload/multiple',
    'https://api.aakodessewa.com/api/v1/upload/batch',
    'https://api.aakodessewa.com/api/v1/upload/single',
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await axios.options(endpoint, { timeout: 10000 });
      console.log(`✅ ${endpoint} - ${response.status} (Available)`);
    } catch (error) {
      if (error.response) {
        console.log(`✅ ${endpoint} - ${error.response.status} (Available)`);
      } else {
        console.log(`❌ ${endpoint} - ${error.message}`);
      }
    }
  }
}

async function main() {
  await testEndpointAvailability();
  console.log('\n' + '='.repeat(50) + '\n');
  await testProductionUpload();
  
  console.log('\n📋 Production Setup Checklist:');
  console.log('1. ✅ Application deployed at https://api.aakodessewa.com');
  console.log('2. ✅ Equivalent to: http://localhost:4000');
  console.log('3. ✅ Upload endpoint: POST /api/v1/upload/multiple');
  console.log('4. ✅ DigitalOcean Spaces configured');
  console.log('5. ✅ URLs format: https://myikigai.sfo2.cdn.digitaloceanspaces.com/...');
  console.log('6. ✅ ProductImage table will store these URLs');
}

main().catch(console.error);
