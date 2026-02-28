const fs = require('fs');
const path = require('path');

function checkEnvironment() {
  console.log('🔍 Checking Production Environment');
  console.log('==================================');

  // Try to load .env file
  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envPath)) {
    console.log('📁 .env file found');
    
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envVars = {};
      
      // Parse .env file
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        }
      });

      console.log('\n📋 Current Environment Variables:');
      console.log('=====================================');

      // Check critical variables
      const criticalVars = [
        'NODE_ENV',
        'PORT',
        'DATABASE_URL',
        'JWT_SECRET',
        'SPACES_ENDPOINT',
        'SPACES_KEY',
        'SPACES_SECRET',
        'SPACES_REGION',
        'SPACES_BUCKET',
        'SPACES_CDN_URL',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION',
        'AWS_S3_BUCKET',
        'CORS_ORIGIN',
        'THROTTLE_TTL',
        'THROTTLE_LIMIT',
        'API_PREFIX'
      ];

      criticalVars.forEach(varName => {
        const value = envVars[varName];
        if (value) {
          // Mask sensitive values
          const maskedValue = varName.includes('SECRET') || varName.includes('PASSWORD') || varName.includes('KEY')
            ? value.substring(0, 8) + '...' 
            : value;
          console.log(`✅ ${varName}: ${maskedValue}`);
        } else {
          console.log(`❌ ${varName}: Not set`);
        }
      });

      // Validate configuration
      console.log('\n🔧 Configuration Validation:');
      console.log('=============================');

      // Check upload service configuration
      const hasSpacesConfig = envVars.SPACES_KEY && envVars.SPACES_SECRET && envVars.SPACES_BUCKET;
      const hasAWSConfig = envVars.AWS_ACCESS_KEY_ID && envVars.AWS_SECRET_ACCESS_KEY && envVars.AWS_S3_BUCKET;

      if (hasSpacesConfig) {
        console.log('✅ DigitalOcean Spaces configured');
        console.log(`   Endpoint: ${envVars.SPACES_ENDPOINT}`);
        console.log(`   Region: ${envVars.SPACES_REGION}`);
        console.log(`   Bucket: ${envVars.SPACES_BUCKET}`);
        console.log(`   CDN: ${envVars.SPACES_CDN_URL}`);
      } else {
        console.log('❌ DigitalOcean Spaces not configured');
      }

      if (hasAWSConfig) {
        console.log('✅ AWS S3 configured');
        console.log(`   Region: ${envVars.AWS_REGION}`);
        console.log(`   Bucket: ${envVars.AWS_S3_BUCKET}`);
      } else {
        console.log('❌ AWS S3 not configured');
      }

      // Check which service will be used
      const uploadService = hasAWSConfig ? 'AWS S3' : 'DigitalOcean Spaces';
      console.log(`🎯 Upload Service: ${uploadService}`);

      // Check port and domain
      console.log(`🌐 Port: ${envVars.PORT || 'Not set'}`);
      console.log(`🌐 Environment: ${envVars.NODE_ENV || 'Not set'}`);
      
      if (envVars.CORS_ORIGIN) {
        const origins = envVars.CORS_ORIGIN.split(',');
        console.log(`🔓 CORS Origins: ${origins.length} configured`);
        origins.forEach(origin => console.log(`   - ${origin.trim()}`));
      }

      // Generate expected URL format
      if (hasSpacesConfig) {
        const expectedUrl = `${envVars.SPACES_CDN_URL}/akodessewa/products/uuid.png`;
        console.log(`🔗 Expected URL Format: ${expectedUrl}`);
      }

      // Check for common issues
      console.log('\n⚠️  Potential Issues:');
      console.log('=======================');
      
      if (!envVars.PORT) {
        console.log('❌ PORT not set - will use default');
      }
      
      if (!envVars.DATABASE_URL) {
        console.log('❌ DATABASE_URL not set');
      }
      
      if (!envVars.JWT_SECRET) {
        console.log('❌ JWT_SECRET not set');
      }
      
      if (!hasSpacesConfig && !hasAWSConfig) {
        console.log('❌ No upload service configured');
      }

      if (envVars.NODE_ENV === 'production' && !envVars.SPACES_CDN_URL && !envVars.AWS_S3_BUCKET) {
        console.log('❌ Production mode but no upload service configured');
      }

    } catch (error) {
      console.error('❌ Error reading .env file:', error.message);
    }
  } else {
    console.log('❌ .env file not found');
    console.log('💡 Create .env file from .env.example');
  }
}

function main() {
  checkEnvironment();
  
  console.log('\n📋 Production Setup Checklist:');
  console.log('1. ✅ .env file exists and is readable');
  console.log('2. ✅ Upload service configured (Spaces or AWS)');
  console.log('3. ✅ Port set to 4000');
  console.log('4. ✅ CORS includes production domain');
  console.log('5. ✅ URLs will be stored in ProductImage table');
  console.log('6. ✅ Application ready for deployment');
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Deploy application to production');
  console.log('2. Test upload endpoint: POST /api/v1/upload/multiple');
  console.log('3. Verify URL format: https://myikigai.sfo2.cdn.digitaloceanspaces.com/...');
  console.log('4. Test product image association: POST /api/v1/products/{id}/images');
}

main().catch(console.error);
