const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

try {
  console.log('Reading schema file...');
  const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  console.log('Schema file read successfully');
  console.log('Schema length:', schema.length);
  
  // Try to validate basic schema structure
  if (schema.includes('generator client') && schema.includes('datasource db')) {
    console.log('Schema has required sections');
  } else {
    console.error('Schema missing required sections');
  }
  
  // Try to instantiate PrismaClient
  console.log('Attempting to create PrismaClient...');
  const prisma = new PrismaClient();
  console.log('PrismaClient created successfully');
  
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
