const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateFeaturedProducts() {
  try {
    // Update first 3 products to be featured
    const products = await prisma.product.findMany({
      take: 3,
      select: { id: true, name: true }
    });

    console.log('Found products:', products);

    for (const product of products) {
      await prisma.product.update({
        where: { id: product.id },
        data: { 
          isFeatured: true,
          salesCount: Math.floor(Math.random() * 20) + 1
        }
      });
      console.log(`✓ Updated "${product.name}" as featured`);
    }

    // Verify the update
    const featured = await prisma.product.findMany({
      where: { isFeatured: true },
      select: { id: true, name: true, isFeatured: true }
    });

    console.log('\nFeatured products after update:', featured);

  } catch (error) {
    console.error('Error updating products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateFeaturedProducts();
