require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const destinations = [
    { name: 'Shillong', region: 'North East India', state: 'Meghalaya', city: 'Shillong', latitude: 25.5788, longitude: 91.8933, description: 'Scotland of the East with waterfalls and rolling hills.' },
    { name: 'Cherrapunji (Sohra)', region: 'North East India', state: 'Meghalaya', city: 'Sohra', latitude: 25.2841, longitude: 91.7308, description: 'Living root bridges and rain-soaked canyons.' },
    { name: 'Tawang', region: 'North East India', state: 'Arunachal Pradesh', city: 'Tawang', latitude: 27.586, longitude: 91.874, description: 'Monasteries and high-altitude lakes.' },
    { name: 'Kohima', region: 'North East India', state: 'Nagaland', city: 'Kohima', latitude: 25.6751, longitude: 94.1086, description: 'Dzükou Valley treks and cultural heritage.' },
    { name: 'Gangtok', region: 'North East India', state: 'Sikkim', city: 'Gangtok', latitude: 27.3389, longitude: 88.6065, description: 'Himalayan vistas and monasteries.' },
  ];

  for (const d of destinations) {
    await prisma.destination.upsert({
      where: { name: d.name },
      update: d,
      create: d,
    });
  }

  const shillong = await prisma.destination.findFirst({ where: { name: 'Shillong' } });
  const tawang = await prisma.destination.findFirst({ where: { name: 'Tawang' } });
  const kohima = await prisma.destination.findFirst({ where: { name: 'Kohima' } });

  const products = [
    { title: 'Dawki River Kayaking', type: 'ACTIVITY', destinationId: shillong?.id, basePriceINR: 1500, description: 'Crystal-clear Umngot River experience', durationDays: 1, thumbnailUrl: '/boat.png' },
    { title: 'Tawang Monastery & Lake Tour', type: 'TOUR', destinationId: tawang?.id, basePriceINR: 12000, description: '3-day guided tour across Tawang', durationDays: 3, thumbnailUrl: '/img-1.png' },
    { title: 'Dzükou Valley Trek', type: 'TOUR', destinationId: kohima?.id, basePriceINR: 6000, description: '2-day trek with camping', durationDays: 2, thumbnailUrl: '/img-2.png' },
  ].filter(p => p.destinationId);

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { title: p.title },
      update: p,
      create: p,
    });

    const today = new Date();
    const dates = [7, 14, 21].map(offset => new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
    for (const d of dates) {
      await prisma.availability.upsert({
        where: { productId_startDate: { productId: product.id, startDate: d } },
        update: {},
        create: { productId: product.id, startDate: d, capacity: 10, priceINR: p.basePriceINR },
      }).catch(async () => {
        // If composite unique not defined, create simple record
        await prisma.availability.create({ data: { productId: product.id, startDate: d, capacity: 10, priceINR: p.basePriceINR } });
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Seed completed');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
