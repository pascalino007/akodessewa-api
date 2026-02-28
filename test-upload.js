const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

// Test the upload endpoint
async function testUpload() {
  try {
    // Create a simple test file
    const testContent = 'This is a test file for upload';
    fs.writeFileSync('test.txt', testContent);

    // Create form data
    const form = new FormData();
    form.append('files', fs.createReadStream('test.txt'), {
      filename: 'test.txt',
      contentType: 'text/plain'
    });

    // Make the request
    const response = await axios.post(
      'http://168.231.101.119:4045/api/v1/upload/multiple?folder=products',
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    console.log('✅ Upload successful!');
    console.log('Response:', response.data);

    // Clean up test file
    fs.unlinkSync('test.txt');
  } catch (error) {
    console.error('❌ Upload failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Test different endpoints
async function testEndpoints() {
  const endpoints = [
    'http://168.231.101.119:4045/api/v1/upload/multiple',
    'http://168.231.101.119:4045/api/v1/upload/batch',
    'http://168.231.101.119:4045/api/v1/upload/single'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n🔍 Testing: ${endpoint}`);
      const response = await axios.get(endpoint);
      console.log(`✅ ${endpoint} - ${response.status} (GET not supported, but endpoint exists)`);
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log(`❌ ${endpoint} - Not Found (404)`);
      } else if (error.response && error.response.status === 405) {
        console.log(`✅ ${endpoint} - Method Not Allowed (405) - Endpoint exists`);
      } else {
        console.log(`❌ ${endpoint} - Error: ${error.message}`);
      }
    }
  }
}

// Check if the server is running
async function checkServer() {
  try {
    const response = await axios.get('http://168.231.101.119:4045/api/v1/upload');
    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.log('❌ Server is not accessible');
    return false;
  }
}

async function main() {
  console.log('🧪 Testing Upload Endpoints\n');
  
  // Check if server is running
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.log('\n💡 Make sure the application is deployed and running on port 4045');
    console.log('💡 Check the deployment logs with: ssh root@168.231.101.119 "pm2 logs"');
    return;
  }

  // Test endpoints
  await testEndpoints();
  
  // Test actual upload
  console.log('\n📤 Testing actual file upload...');
  await testUpload();
}

main().catch(console.error);
