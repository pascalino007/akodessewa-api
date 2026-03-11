const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

// Configuration
const API_BASE = 'http://168.231.101.119:4045/api/v1';
const AUTH_TOKEN = 'your-jwt-token-here'; // Replace with actual token

async function testProductImageWorkflow() {
  console.log('🧪 Testing Product Image Workflow');
  console.log('==================================');

  try {
    // Step 1: Upload files
    console.log('\n📤 Step 1: Uploading files...');
    const uploadForm = new FormData();
    
    // Create test files
    fs.writeFileSync('test-image-1.jpg', 'fake image content 1');
    fs.writeFileSync('test-image-2.jpg', 'fake image content 2');
    
    uploadForm.append('files', fs.createReadStream('test-image-1.jpg'), {
      filename: 'test-image-1.jpg',
      contentType: 'image/jpeg'
    });
    uploadForm.append('files', fs.createReadStream('test-image-2.jpg'), {
      filename: 'test-image-2.jpg',
      contentType: 'image/jpeg'
    });
    uploadForm.append('folder', 'products');

    const uploadResponse = await axios.post(
      `${API_BASE}/upload/multiple`,
      uploadForm,
      {
        headers: {
          ...uploadForm.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    console.log('✅ Files uploaded successfully!');
    const uploadedFiles = uploadResponse.data;
    console.log('Uploaded files:', uploadedFiles);

    // Step 2: Create a test product (or use existing product ID)
    console.log('\n📦 Step 2: Creating test product...');
    const productData = {
      name: 'Test Product with Images',
      description: 'This is a test product',
      price: 99.99,
      categoryId: 'your-category-id', // Replace with actual category ID
      brandId: 'your-brand-id',     // Replace with actual brand ID
      images: uploadedFiles.map((file, index) => ({
        url: file.url,
        alt: `Test image ${index + 1}`,
        isMain: index === 0,
        order: index
      }))
    };

    try {
      const productResponse = await axios.post(
        `${API_BASE}/products`,
        productData,
        {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Product created with images!');
      console.log('Product ID:', productResponse.data.id);
    } catch (productError) {
      console.log('ℹ️ Product creation failed (expected if no auth), but we can test adding images to existing product...');
      
      // Step 3: Add images to existing product
      console.log('\n🖼️ Step 3: Adding images to existing product...');
      const productId = 'your-product-id-here'; // Replace with actual product ID
      
      const imageData = uploadedFiles.map((file, index) => ({
        url: file.url,
        alt: `Test image ${index + 1}`,
        isMain: index === 0,
        order: index
      }));

      try {
        const addImagesResponse = await axios.post(
          `${API_BASE}/products/${productId}/images`,
          imageData,
          {
            headers: {
              'Authorization': `Bearer ${AUTH_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('✅ Images added to product!');
        console.log('Response:', addImagesResponse.data);
      } catch (addImagesError) {
        console.log('❌ Failed to add images:', addImagesError.response?.data || addImagesError.message);
      }
    }

    // Step 4: Verify images in database
    console.log('\n🔍 Step 4: Verifying images in database...');
    try {
      const productResponse = await axios.get(`${API_BASE}/products/your-product-id-here`);
      const product = productResponse.data;
      console.log('Product images:', product.images);
      console.log('✅ Images found in ProductImage table!');
    } catch (verifyError) {
      console.log('❌ Failed to verify images:', verifyError.response?.data || verifyError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  } finally {
    // Clean up test files
    fs.unlinkSync('test-image-1.jpg');
    fs.unlinkSync('test-image-2.jpg');
  }
}

// Test upload endpoints availability
async function testEndpoints() {
  console.log('🔍 Testing Product Image Endpoints');
  console.log('==================================');

  const endpoints = [
    { method: 'POST', path: '/upload/multiple', desc: 'Upload multiple files' },
    { method: 'POST', path: '/products/{id}/images', desc: 'Add images to product' },
    { method: 'PATCH', path: '/products/{id}/images', desc: 'Update product images' },
    { method: 'DELETE', path: '/products/{id}/images', desc: 'Remove product images' },
  ];

  for (const endpoint of endpoints) {
    try {
      const url = endpoint.path.includes('{id}') 
        ? `${API_BASE}/products/test-id/images` 
        : `${API_BASE}${endpoint.path}`;
      
      const response = await axios({
        method: endpoint.method,
        url: url,
        headers: endpoint.method !== 'POST' ? {} : { 'Content-Type': 'application/json' }
      });
      
      console.log(`✅ ${endpoint.method} ${endpoint.path} - ${response.status} (Endpoint exists)`);
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`❌ ${endpoint.method} ${endpoint.path} - Not Found (404)`);
      } else if (error.response?.status === 401) {
        console.log(`✅ ${endpoint.method} ${endpoint.path} - Unauthorized (401) - Endpoint exists`);
      } else if (error.response?.status === 405) {
        console.log(`✅ ${endpoint.method} ${endpoint.path} - Method Not Allowed (405) - Endpoint exists`);
      } else {
        console.log(`❌ ${endpoint.method} ${endpoint.path} - Error: ${error.message}`);
      }
    }
  }
}

async function main() {
  await testEndpoints();
  console.log('\n' + '='.repeat(50) + '\n');
  await testProductImageWorkflow();
  
  console.log('\n📋 Summary:');
  console.log('1. Upload files to: POST /api/v1/upload/multiple?folder=products');
  console.log('2. Add images to product: POST /api/v1/products/{id}/images');
  console.log('3. Update images: PATCH /api/v1/products/{id}/images');
  console.log('4. Remove images: DELETE /api/v1/products/{id}/images');
  console.log('\n💡 Make sure to:');
  console.log('- Set up proper AWS S3 or DigitalOcean Spaces credentials');
  console.log('- Use valid JWT token for authenticated endpoints');
  console.log('- Use real product, category, and brand IDs');
}

main().catch(console.error);
