import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Admin user ─────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@akodessewa.com' },
    update: {},
    create: {
      email: 'admin@akodessewa.com',
    
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'Akodessewa',
      role: Role.ADMIN,
      phone: '+228 90000000',
      isActive: true,
    },
  });
  console.log(`  ✔ Admin user: ${admin.email}`);

  // ── Manager user ───────────────────────────────────────
  const managerPassword = await bcrypt.hash('Manager@123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@akodessewa.com' },
    update: {},
    create: {
      email: 'manager@akodessewa.com',
      password: managerPassword,
      firstName: 'Manager',
      lastName: 'Akodessewa',
      role: Role.MANAGER,
      phone: '+228 90000001',
      isActive: true,
    },
  });
  console.log(`  ✔ Manager user: ${manager.email}`);

  // ── Supplier + Shop ────────────────────────────────────
  const supplierPassword = await bcrypt.hash('Supplier@123', 10);
  const supplier = await prisma.user.upsert({
    where: { email: 'supplier@akodessewa.com' },
    update: {},
    create: {
      email: 'supplier@akodessewa.com',
      password: supplierPassword,
      firstName: 'Demo',
      lastName: 'Supplier',
      role: Role.SUPPLIER,
      phone: '+228 90000002',
      isActive: true,
    },
  });

  const shop = await prisma.shop.upsert({
    where: { ownerId: supplier.id },
    update: {},
    create: {
      name: 'AutoParts Lomé',
      slug: 'autoparts-lome',
      description: 'Premium auto parts supplier in Lomé',
      phone: '+228 90000002',
      email: 'shop@akodessewa.com',
      city: 'Lomé',
      country: 'TG',
      street: 'Boulevard du 13 Janvier, Lomé',
      ownerId: supplier.id,
    },
  });
  console.log(`  ✔ Supplier: ${supplier.email} → Shop: ${shop.name}`);

  // ── Wallet for supplier ────────────────────────────────
  await prisma.wallet.upsert({
    where: { userId: supplier.id },
    update: {},
    create: { userId: supplier.id, balance: 0 },
  });

  // ── Subscription for supplier ──────────────────────────
  await prisma.subscription.upsert({
    where: { userId: supplier.id },
    update: {},
    create: {
      userId: supplier.id,
      plan: 'BASIC',
      amount: 0,
      status: 'ACTIVE',
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  // ── Customer user ──────────────────────────────────────
  const customerPassword = await bcrypt.hash('Customer@123', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@akodessewa.com' },
    update: {},
    create: {
      email: 'customer@akodessewa.com',
      password: customerPassword,
      firstName: 'Demo',
      lastName: 'Customer',
      role: Role.CUSTOMER,
      phone: '+228 90000003',
      isActive: true,
    },
  });
  console.log(`  ✔ Customer user: ${customer.email}`);

  // ── Categories ─────────────────────────────────────────
  const catAuto = await prisma.category.upsert({
    where: { slug: 'pieces-auto' },
    update: {},
    create: { name: 'Pièces Auto', slug: 'pieces-auto', type: 'AUTO', description: 'Pièces détachées automobile', image: 'car' },
  });
  const catMoto = await prisma.category.upsert({
    where: { slug: 'pieces-moto' },
    update: {},
    create: { name: 'Pièces Moto', slug: 'pieces-moto', type: 'MOTO', description: 'Pièces détachées moto', image: 'bike' },
  });

  const subCategories = [
    { name: 'Freinage', slug: 'freinage', parentId: catAuto.id, type: 'AUTO' as const },
    { name: 'Moteur', slug: 'moteur', parentId: catAuto.id, type: 'AUTO' as const },
    { name: 'Suspension', slug: 'suspension', parentId: catAuto.id, type: 'AUTO' as const },
    { name: 'Filtration', slug: 'filtration', parentId: catAuto.id, type: 'AUTO' as const },
    { name: 'Éclairage', slug: 'eclairage', parentId: catAuto.id, type: 'AUTO' as const },
    { name: 'Carrosserie', slug: 'carrosserie', parentId: catAuto.id, type: 'AUTO' as const },
    { name: 'Échappement', slug: 'echappement', parentId: catAuto.id, type: 'AUTO' as const },
    { name: 'Transmission', slug: 'transmission', parentId: catAuto.id, type: 'AUTO' as const },
    { name: 'Freinage Moto', slug: 'freinage-moto', parentId: catMoto.id, type: 'MOTO' as const },
    { name: 'Moteur Moto', slug: 'moteur-moto', parentId: catMoto.id, type: 'MOTO' as const },
  ];

  for (const cat of subCategories) {
    await prisma.category.upsert({ where: { slug: cat.slug }, update: {}, create: cat });
  }
  console.log(`  ✔ ${2 + subCategories.length} categories created`);

  // ── Brands ─────────────────────────────────────────────
  const brands = [
    { name: 'Bosch', slug: 'bosch', logo: null, country: 'DE' },
    { name: 'Valeo', slug: 'valeo', logo: null, country: 'FR' },
    { name: 'TRW', slug: 'trw', logo: null, country: 'DE' },
    { name: 'Denso', slug: 'denso', logo: null, country: 'JP' },
    { name: 'Mann Filter', slug: 'mann-filter', logo: null, country: 'DE' },
    { name: 'NGK', slug: 'ngk', logo: null, country: 'JP' },
    { name: 'SKF', slug: 'skf', logo: null, country: 'SE' },
    { name: 'Continental', slug: 'continental', logo: null, country: 'DE' },
    { name: 'Brembo', slug: 'brembo', logo: null, country: 'IT' },
    { name: 'Sachs', slug: 'sachs', logo: null, country: 'DE' },
  ];

  for (const b of brands) {
    await prisma.brand.upsert({ where: { slug: b.slug }, update: {}, create: b });
  }
  console.log(`  ✔ ${brands.length} brands created`);

  // ── Cars ───────────────────────────────────────────────
  const cars = [
    { make: 'Toyota', model: 'Corolla', year: 2020, trim: '1.8 LE', vehicleType: 'AUTO' as const },
    { make: 'Toyota', model: 'Camry', year: 2021, trim: '2.5 SE', vehicleType: 'AUTO' as const },
    { make: 'Toyota', model: 'RAV4', year: 2022, trim: '2.5 XLE', vehicleType: 'AUTO' as const },
    { make: 'Honda', model: 'Civic', year: 2021, trim: '2.0 LX', vehicleType: 'AUTO' as const },
    { make: 'Honda', model: 'CR-V', year: 2022, trim: '1.5T EX', vehicleType: 'AUTO' as const },
    { make: 'Nissan', model: 'Sentra', year: 2020, trim: '2.0 SV', vehicleType: 'AUTO' as const },
    { make: 'Hyundai', model: 'Tucson', year: 2022, trim: '2.5 SEL', vehicleType: 'AUTO' as const },
    { make: 'Mercedes-Benz', model: 'C-Class', year: 2021, trim: 'C300', vehicleType: 'AUTO' as const },
    { make: 'BMW', model: '3 Series', year: 2021, trim: '330i', vehicleType: 'AUTO' as const },
    { make: 'Peugeot', model: '308', year: 2020, trim: '1.5 BlueHDi', vehicleType: 'AUTO' as const },
  ];

  const createdCars: any[] = [];
  for (const car of cars) {
    const c = await prisma.car.create({ data: car });
    createdCars.push(c);
  }
  console.log(`  ✔ ${cars.length} cars created`);

  // ── Sample Products ────────────────────────────────────
  const bosch = await prisma.brand.findUnique({ where: { slug: 'bosch' } });
  const freinage = await prisma.category.findUnique({ where: { slug: 'freinage' } });
  const filtration = await prisma.category.findUnique({ where: { slug: 'filtration' } });

  if (bosch && freinage && filtration) {
    const products = [
      {
        name: 'Plaquettes de frein avant Bosch',
        slug: 'plaquettes-frein-avant-bosch',
        description: 'Plaquettes de frein avant haute performance',
        price: 25000,
        stock: 50,
        sku: 'BSH-BRK-001',
        categoryId: freinage.id,
        brandId: bosch.id,
        shopId: shop.id,
        vehicleType: 'AUTO' as const,
        condition: 'NEW' as const,
        isFeatured: true,
        salesCount: 15,
      },
      {
        name: 'Filtre à huile Bosch',
        slug: 'filtre-huile-bosch',
        description: 'Filtre à huile de remplacement OEM',
        price: 8500,
        stock: 100,
        sku: 'BSH-FLT-001',
        categoryId: filtration.id,
        brandId: bosch.id,
        shopId: shop.id,
        vehicleType: 'AUTO' as const,
        condition: 'NEW' as const,
        isFeatured: true,
        salesCount: 8,
      },
      {
        name: 'Filtre à air Bosch',
        slug: 'filtre-air-bosch',
        description: 'Filtre à air haute performance',
        price: 12000,
        stock: 80,
        sku: 'BSH-FLT-002',
        categoryId: filtration.id,
        brandId: bosch.id,
        shopId: shop.id,
        vehicleType: 'AUTO' as const,
        condition: 'NEW' as const,
        salesCount: 3,
      },
    ];

    for (const p of products) {
      const product = await prisma.product.upsert({
        where: { slug: p.slug },
        update: { 
          isFeatured: p.isFeatured,
          salesCount: p.salesCount,
        },
        create: p,
      });
      // Add compatibility with some cars
      for (const car of createdCars.slice(0, 5)) {
        await prisma.productCompatibility.upsert({
          where: {
            productId_carId: {
              productId: product.id,
              carId: car.id,
            },
          },
          update: {},
          create: { productId: product.id, carId: car.id },
        });
      }
    }
    console.log(`  ✔ ${products.length} sample products created`);
  }

  // ── Slides ─────────────────────────────────────────────
  await prisma.slide.createMany({
    data: [
      {
        title: 'Bienvenue sur Akodessewa',
        subtitle: 'La plateforme #1 de pièces auto au Togo',
        imageUrl: 'https://placehold.co/1200x400/0D9488/FFFFFF?text=Akodessewa',
        position: 'HOME_HERO',
        order: 0,
        isActive: true,
      },
      {
        title: 'Livraison Rapide',
        subtitle: 'Recevez vos pièces en 24-48h',
        imageUrl: 'https://placehold.co/1200x400/0D9488/FFFFFF?text=Livraison+Rapide',
        position: 'HOME_HERO',
        order: 1,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });
  console.log('  ✔ 2 slides created');

  console.log('\n✅ Seed completed!');
  console.log('\n📧 Test accounts:');
  console.log('  Admin:    admin@akodessewa.com / Admin@123');
  console.log('  Manager:  manager@akodessewa.com / Manager@123');
  console.log('  Supplier: supplier@akodessewa.com / Supplier@123');
  console.log('  Customer: customer@akodessewa.com / Customer@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
