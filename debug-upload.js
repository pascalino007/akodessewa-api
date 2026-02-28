const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');

// Test upload configuration
async function debugUpload() {
  console.log('🔍 Debugging Upload Configuration');
  console.log('==================================');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Not set');
  console.log('AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Not set');
  console.log('AWS_REGION:', process.env.AWS_REGION || '❌ Not set');
  console.log('AWS_S3_BUCKET:', process.env.AWS_S3_BUCKET || '❌ Not set');
  
  console.log('\nDigitalOcean Spaces (fallback):');
  console.log('SPACES_KEY:', process.env.SPACES_KEY ? '✅ Set' : '❌ Not set');
  console.log('SPACES_SECRET:', process.env.SPACES_SECRET ? '✅ Set' : '❌ Not set');
  console.log('SPACES_REGION:', process.env.SPACES_REGION || '❌ Not set');
  console.log('SPACES_BUCKET:', process.env.SPACES_BUCKET || '❌ Not set');

  // Determine which service to use
  const isAWS = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
  const service = isAWS ? 'AWS S3' : 'DigitalOcean Spaces';
  console.log(`\n🎯 Using: ${service}`);

  let s3Config;
  if (isAWS) {
    s3Config = {
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    };
    console.log('📦 AWS S3 Config:', {
      region: s3Config.region,
      bucket: process.env.AWS_S3_BUCKET,
    });
  } else {
    s3Config = {
      endpoint: process.env.SPACES_ENDPOINT || 'https://sfo2.digitaloceanspaces.com',
      region: process.env.SPACES_REGION || 'fra1',
      credentials: {
        accessKeyId: process.env.SPACES_KEY,
        secretAccessKey: process.env.SPACES_SECRET,
      },
    };
    console.log('📦 DO Spaces Config:', {
      endpoint: s3Config.endpoint,
      region: s3Config.region,
      bucket: process.env.SPACES_BUCKET,
    });
  }

  try {
    // Create S3 client
    const s3 = new S3Client(s3Config);
    console.log('✅ S3 client created successfully');

    // Test bucket access
    const bucket = process.env.AWS_S3_BUCKET || process.env.SPACES_BUCKET;
    if (!bucket) {
      console.log('❌ No bucket configured');
      return;
    }

    // Create test file
    const testContent = 'Test upload content';
    const testKey = `test/debug-${Date.now()}.txt`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
      ACL: 'public-read',
    });

    console.log(`📤 Uploading test file to: ${bucket}/${testKey}`);
    const result = await s3.send(command);
    console.log('✅ Upload successful!');
    console.log('ETag:', result.ETag);

    // Generate URL
    const cdnUrl = process.env.AWS_CDN_URL || 
      process.env.SPACES_CDN_URL || 
      `https://${bucket}.${isAWS ? 's3.' + s3Config.region + '.amazonaws.com' : s3Config.endpoint.replace('https://', '')}`;
    
    const fileUrl = `${cdnUrl}/${testKey}`;
    console.log('🔗 File URL:', fileUrl);

    // Test if URL is accessible
    const https = require('https');
    const http = require('http');
    const client = cdnUrl.startsWith('https:') ? https : http;
    
    client.get(fileUrl, (res) => {
      console.log(`🌐 URL Status: ${res.statusCode}`);
      if (res.statusCode === 200) {
        console.log('✅ File is publicly accessible');
      } else {
        console.log('❌ File is not accessible (check bucket permissions)');
      }
    }).on('error', (err) => {
      console.log('❌ Error accessing URL:', err.message);
    });

  } catch (error) {
    console.log('❌ Upload failed:', error.message);
    if (error.Code === 'NoSuchBucket') {
      console.log('💡 Bucket does not exist - create it first');
    } else if (error.Code === 'AccessDenied') {
      console.log('💡 Access denied - check credentials and permissions');
    } else if (error.Code === 'InvalidAccessKeyId') {
      console.log('💡 Invalid access key - check AWS/Spaces credentials');
    }
  }
}

// Load environment variables
if (fs.existsSync('.env')) {
  console.log('📁 Loading .env file...');
  const envContent = fs.readFileSync('.env', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

debugUpload().catch(console.error);
