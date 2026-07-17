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

  // 2. Seed baseline Clusters, Mines, and Electrical TOD defaults from centralized config
  console.log('Synchronizing database hierarchy state...');

  const activeClusterNames = hierarchy.map(g => g.clusterName);
  const activeMineNames = hierarchy.flatMap(g => g.mines);

  // Retrieve the IDs of mines that will be deleted (i.e. not in the active hierarchy)
  const orphanedMines = await prisma.mine.findMany({
    where: { name: { notIn: activeMineNames } },
    select: { id: true },
  });
  const orphanedMineIds = orphanedMines.map(m => m.id);

  // Clean up calculation results and planning inputs linked to orphaned mines
  await prisma.minePlanningInput.deleteMany({
    where: { mineId: { in: orphanedMineIds } },
  });
  await prisma.calculationResult.deleteMany({
    where: { mineId: { in: orphanedMineIds } },
  });
  await prisma.mine.deleteMany({
    where: { id: { in: orphanedMineIds } },
  });
  await prisma.cluster.deleteMany({
    where: { name: { notIn: activeClusterNames } },
  });

  const TOD_PROFILES: Record<string, { period: string; fromTime: string; toTime: string; totalHours: number; consumptionPercentage: number; percentageDifferenceFactor: number; }[]> = {
    'Surguja Cluster': [
      { period: 'Normal Hours', fromTime: '23:00', toTime: '09:00', totalHours: 10.0, consumptionPercentage: 42.0, percentageDifferenceFactor: 1.00 },
      { period: 'Off Peak Hours', fromTime: '09:00', toTime: '17:00', totalHours: 8.0, consumptionPercentage: 33.0, percentageDifferenceFactor: 0.80 },
      { period: 'Peak Hours', fromTime: '17:00', toTime: '23:00', totalHours: 6.0, consumptionPercentage: 25.0, percentageDifferenceFactor: 1.20 },
    ],
    'Tamnar Cluster': [
      { period: 'Normal Hours', fromTime: '23:00', toTime: '09:00', totalHours: 10.0, consumptionPercentage: 42.0, percentageDifferenceFactor: 1.00 },
      { period: 'Off Peak Hours', fromTime: '09:00', toTime: '17:00', totalHours: 8.0, consumptionPercentage: 33.0, percentageDifferenceFactor: 0.80 },
      { period: 'Peak Hours', fromTime: '17:00', toTime: '23:00', totalHours: 6.0, consumptionPercentage: 25.0, percentageDifferenceFactor: 1.20 },
    ],
    'Suluiyari Cluster': [
      { period: 'Normal Hours', fromTime: '22:00/23:00', toTime: '09:00', totalHours: 10.58, consumptionPercentage: 44.3333, percentageDifferenceFactor: 1.00 },
      { period: 'Off Peak Hours', fromTime: '09:00', toTime: '17:00/16:00', totalHours: 7.58, consumptionPercentage: 31.3333, percentageDifferenceFactor: 0.85 },
      { period: 'Peak Hours', fromTime: '17:00/16:00', toTime: '22:00/23:00', totalHours: 5.83, consumptionPercentage: 24.3333, percentageDifferenceFactor: 1.20 },
    ],
    'Odisha Cluster': [
      { period: 'Normal Hours', fromTime: '22:00', toTime: '08:00', totalHours: 10.0, consumptionPercentage: 42.0, percentageDifferenceFactor: 1.00 },
      { period: 'Off Peak Hours', fromTime: '08:00', toTime: '16:00', totalHours: 8.0, consumptionPercentage: 33.0, percentageDifferenceFactor: 0.90 },
      { period: 'Peak Hours', fromTime: '16:00', toTime: '22:00', totalHours: 6.0, consumptionPercentage: 25.0, percentageDifferenceFactor: 1.10 },
    ],
    'Jharkhand Cluster': [
      { period: 'Normal Hours', fromTime: '21:00', toTime: '06:00', totalHours: 9.0, consumptionPercentage: 38.0, percentageDifferenceFactor: 1.00 },
      { period: 'Off Peak Hours', fromTime: '08:00', toTime: '18:00', totalHours: 10.0, consumptionPercentage: 42.0, percentageDifferenceFactor: 0.75 },
      { period: 'Peak Hours', fromTime: '18:00', toTime: '21:00', totalHours: 5.0, consumptionPercentage: 21.0, percentageDifferenceFactor: 1.20 },
    ],
  };

  for (const group of hierarchy) {
    const cluster = await prisma.cluster.upsert({
      where: { name: group.clusterName },
      update: {},
      create: {
        name: group.clusterName,
      },
    });

    // Seed Electrical TOD for each cluster based on profile mapping
    const periods = TOD_PROFILES[group.clusterName] || [
      { period: 'Normal Hours', fromTime: '23:00', toTime: '09:00', totalHours: 10.0, consumptionPercentage: 50.0, percentageDifferenceFactor: 1.0 },
      { period: 'Off Peak Hours', fromTime: '09:00', toTime: '17:00', totalHours: 8.0, consumptionPercentage: 30.0, percentageDifferenceFactor: 0.8 },
      { period: 'Peak Hours', fromTime: '17:00', toTime: '23:00', totalHours: 6.0, consumptionPercentage: 20.0, percentageDifferenceFactor: 1.2 },
    ];

    for (const p of periods) {
      await prisma.electricalTOD.upsert({
        where: {
          clusterId_period: {
            clusterId: cluster.id,
            period: p.period,
          },
        },
        update: {
          fromTime: p.fromTime,
          toTime: p.toTime,
          totalHours: p.totalHours,
          consumptionPercentage: p.consumptionPercentage,
          percentageDifferenceFactor: p.percentageDifferenceFactor,
        },
        create: {
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
      const mine = await prisma.mine.upsert({
        where: { name: mineName },
        update: {
          clusterId: cluster.id,
        },
        create: {
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
        const existingInput = await prisma.minePlanningInput.findFirst({
          where: {
            mineId: mine.id,
            particular: input.particular,
          },
        });

        if (existingInput) {
          await prisma.minePlanningInput.update({
            where: { id: existingInput.id },
            data: {
              uom: input.uom,
              fy27: input.fy27,
              fy28: input.fy28,
              fy29: input.fy29,
              fy30: input.fy30,
              fy31: input.fy31,
            },
          });
        } else {
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
