import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import hierarchy from '../../shared/mineHierarchy.json';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Project PowerShift database...');

  // 1. Seed Financial Years
  const financialYears = ['FY27', 'FY28', 'FY29', 'FY30', 'FY31'];
  console.log('Seeding Financial Years...');
  for (const yearCode of financialYears) {
    await prisma.financialYear.upsert({
      where: { yearCode },
      update: {},
      create: {
        yearCode,
        isActive: true,
      },
    });
  }

  // 2. Seed baseline Clusters, Mines, and Electrical TOD defaults from centralized config if empty
  console.log('Checking database hierarchy state...');
  const existingClustersCount = await prisma.cluster.count();
  if (existingClustersCount === 0) {
    console.log('Database empty. Seeding baseline Clusters, Mines, and Electrical TOD defaults...');
    for (const group of hierarchy) {
      const cluster = await prisma.cluster.create({
        data: {
          name: group.clusterName,
        },
      });

      // Seed Electrical TOD for each cluster
      const periods = [
        {
          period: 'Normal Hours',
          fromTime: '23:00',
          toTime: '9:00',
          totalHours: 10.0,
          consumptionPercentage: 50.0,
          percentageDifferenceFactor: 1.0,
        },
        {
          period: 'Off Peak Hours',
          fromTime: '9:00',
          toTime: '17:00',
          totalHours: 8.0,
          consumptionPercentage: 30.0,
          percentageDifferenceFactor: 0.8,
        },
        {
          period: 'Peak Hours',
          fromTime: '17:00',
          toTime: '23:00',
          totalHours: 6.0,
          consumptionPercentage: 20.0,
          percentageDifferenceFactor: 1.2,
        },
      ];

      for (const p of periods) {
        await prisma.electricalTOD.create({
          data: {
            clusterId: cluster.id,
            period: p.period,
            fromTime: p.fromTime,
            toTime: p.toTime,
            totalHours: p.totalHours,
            consumptionPercentage: p.consumptionPercentage,
            percentageDifferenceFactor: p.percentageDifferenceFactor,
          },
        });
      }

      for (const mineName of group.mines) {
        const mine = await prisma.mine.create({
          data: {
            name: mineName,
            clusterId: cluster.id,
          },
        });

        // Seed default inputs for each mine
        const mineInputs = [
          {
            particular: 'Coal Production',
            uom: 'MT',
            fy27: 18.0,
            fy28: 18.0,
            fy29: 18.0,
            fy30: 18.0,
            fy31: 18.0,
          },
          {
            particular: 'OB Production',
            uom: 'Mcum',
            fy27: 74.7,
            fy28: 84.96,
            fy29: 92.7,
            fy30: 98.28,
            fy31: 103.1,
          },
          {
            particular: 'CHP, Washery & Mining Requirement',
            uom: 'MVA',
            fy27: 9.0,
            fy28: 11.0,
            fy29: 11.0,
            fy30: 12.0,
            fy31: 12.0,
          },
          {
            particular: 'Total Available Power for EV',
            uom: 'MVA',
            fy27: 17.0,
            fy28: 17.0,
            fy29: 27.0,
            fy30: 29.0,
            fy31: 30.0,
          },
        ];

        for (const input of mineInputs) {
          await prisma.minePlanningInput.create({
            data: {
              mineId: mine.id,
              particular: input.particular,
              uom: input.uom,
              fy27: input.fy27,
              fy28: input.fy28,
              fy29: input.fy29,
              fy30: input.fy30,
              fy31: input.fy31,
            },
          });
        }
      }
    }
  } else {
    console.log('Database hierarchy already exists. Skipping baseline hierarchy seeding to protect production data.');
  }

  // 4. Seed Vehicle Productivity values
  const productivities = [
    {
      equipment: '1 FEL EV Productivity',
      particular: 'Coal',
      capacity: '7T',
      uom: 'MT/Year',
      avgLead: 2.5,
      fy27: 1.42,
      fy28: 1.42,
      fy29: 1.42,
      fy30: 1.42,
      fy31: 1.42,
    },
    {
      equipment: '1 Coal Dumper EV Productivity',
      particular: 'Coal',
      capacity: '40T',
      uom: 'MT/Year',
      avgLead: 3.0,
      fy27: 0.42,
      fy28: 0.42,
      fy29: 0.42,
      fy30: 0.42,
      fy31: 0.42,
    },
    {
      equipment: '1 OB Dumper EV Productivity',
      particular: 'OB',
      capacity: '40T',
      uom: 'Mcum/Year',
      avgLead: 3.0,
      fy27: 0.24,
      fy28: 0.24,
      fy29: 0.24,
      fy30: 0.24,
      fy31: 0.24,
    },
  ];

  console.log('Seeding Vehicle Productivities...');
  for (const prod of productivities) {
    await prisma.vehicleProductivity.upsert({
      where: { equipment: prod.equipment },
      update: {},
      create: {
        equipment: prod.equipment,
        particular: prod.particular,
        capacity: prod.capacity,
        uom: prod.uom,
        avgLead: prod.avgLead,
        fy27: prod.fy27,
        fy28: prod.fy28,
        fy29: prod.fy29,
        fy30: prod.fy30,
        fy31: prod.fy31,
      },
    });
  }

  // 5. Seed default Admin, Engineer, and Viewer users
  const users = [
    {
      name: 'System Admin',
      email: 'admin@powershift.com',
      role: Role.ADMIN,
      password: 'password123',
    },
    {
      name: 'Planning Engineer',
      email: 'engineer@powershift.com',
      role: Role.ENGINEER,
      password: 'password123',
    },
    {
      name: 'Executive Viewer',
      email: 'viewer@powershift.com',
      role: Role.VIEWER,
      password: 'password123',
    },
  ];

  console.log('Seeding Default Access Accounts...');
  for (const u of users) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        passwordHash: hashedPassword,
        role: u.role,
        status: UserStatus.ACTIVE,
        mustChangePassword: true,
      },
    });
  }

  console.log('Database seeding successfully completed.');
}

main()
  .catch((e) => {
    console.error('Database seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
