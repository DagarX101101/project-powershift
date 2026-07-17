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

      const MINE_PLANNING_INPUTS: Record<string, { particular: string; uom: string; fy27: number; fy28: number; fy29: number; fy30: number; fy31: number; }[]> = {
        'PEKB': [
          { particular: 'Coal Production', uom: 'MT', fy27: 18.00, fy28: 18.00, fy29: 18.00, fy30: 18.00, fy31: 18.00 },
          { particular: 'OB Production', uom: 'Mcum', fy27: 74.70, fy28: 84.96, fy29: 92.70, fy30: 98.28, fy31: 103.14 },
          { particular: 'CHP, Washery & Mining Requirement', uom: 'MVA', fy27: 12.00, fy28: 12.00, fy29: 12.00, fy30: 12.00, fy31: 12.00 },
          { particular: 'Total Available Power for EV', uom: 'MVA', fy27: 33.00, fy28: 33.00, fy29: 33.00, fy30: 33.00, fy31: 33.00 },
        ],
        'PCB': [
          { particular: 'Coal Production', uom: 'MT', fy27: 5.00, fy28: 5.00, fy29: 5.00, fy30: 5.00, fy31: 5.00 },
          { particular: 'OB Production', uom: 'Mcum', fy27: 13.62, fy28: 9.08, fy29: 10.98, fy30: 14.07, fy31: 14.51 },
          { particular: 'CHP, Washery & Mining Requirement', uom: 'MVA', fy27: 7.00, fy28: 7.00, fy29: 7.00, fy30: 7.00, fy31: 7.00 },
          { particular: 'Total Available Power for EV', uom: 'MVA', fy27: 6.00, fy28: 6.00, fy29: 6.00, fy30: 6.00, fy31: 6.00 },
        ],
        'Kente': [
          { particular: 'Coal Production', uom: 'MT', fy27: 0.05, fy28: 5.00, fy29: 9.00, fy30: 9.00, fy31: 9.00 },
          { particular: 'OB Production', uom: 'Mcum', fy27: 2.40, fy28: 14.55, fy29: 20.00, fy30: 30.82, fy31: 30.25 },
          { particular: 'CHP, Washery & Mining Requirement', uom: 'MVA', fy27: 15.00, fy28: 15.00, fy29: 15.00, fy30: 15.00, fy31: 15.00 },
          { particular: 'Total Available Power for EV', uom: 'MVA', fy27: 12.00, fy28: 12.00, fy29: 12.00, fy30: 12.00, fy31: 12.00 },
        ],
        'GP II': [
          { particular: 'Coal Production', uom: 'MT', fy27: 1.00, fy28: 5.00, fy29: 12.00, fy30: 20.00, fy31: 23.00 },
          { particular: 'OB Production', uom: 'Mcum', fy27: 11.39, fy28: 22.11, fy29: 52.15, fy30: 71.87, fy31: 78.89 },
          { particular: 'CHP, Washery & Mining Requirement', uom: 'MVA', fy27: 6.00, fy28: 6.00, fy29: 6.00, fy30: 6.00, fy31: 6.00 },
          { particular: 'Total Available Power for EV', uom: 'MVA', fy27: 22.00, fy28: 22.00, fy29: 22.00, fy30: 22.00, fy31: 22.00 },
        ],
        'GP III': [
          { particular: 'Coal Production', uom: 'MT', fy27: 5.00, fy28: 8.00, fy29: 8.00, fy30: 8.00, fy31: 8.00 },
          { particular: 'OB Production', uom: 'Mcum', fy27: 13.40, fy28: 16.81, fy29: 17.04, fy30: 17.25, fy31: 17.40 },
          { particular: 'CHP, Washery & Mining Requirement', uom: 'MVA', fy27: 1.00, fy28: 1.00, fy29: 1.00, fy30: 1.00, fy31: 1.00 },
          { particular: 'Total Available Power for EV', uom: 'MVA', fy27: 6.00, fy28: 6.00, fy29: 6.00, fy30: 6.00, fy31: 6.00 },
        ],
        'Pelma': [
          { particular: 'Coal Production', uom: 'MT', fy27: 0.00, fy28: 2.50, fy29: 7.00, fy30: 12.00, fy31: 15.00 },
          { particular: 'OB Production', uom: 'Mcum', fy27: 0.10, fy28: 12.50, fy29: 28.00, fy30: 43.20, fy31: 56.00 },
          { particular: 'CHP, Washery & Mining Requirement', uom: 'MVA', fy27: 6.00, fy28: 6.00, fy29: 6.00, fy30: 6.00, fy31: 6.00 },
          { particular: 'Total Available Power for EV', uom: 'MVA', fy27: 21.00, fy28: 21.00, fy29: 21.00, fy30: 21.00, fy31: 21.00 },
        ],
        'Singrauli': [
          { particular: 'Coal Production', uom: 'MT', fy27: 5.00, fy28: 5.00, fy29: 5.00, fy30: 5.00, fy31: 5.00 },
          { particular: 'OB Production', uom: 'Mcum', fy27: 37.20, fy28: 31.92, fy29: 33.10, fy30: 33.04, fy31: 34.87 },
          { particular: 'CHP, Washery & Mining Requirement', uom: 'MVA', fy27: 2.00, fy28: 2.00, fy29: 2.00, fy30: 2.00, fy31: 2.00 },
          { particular: 'Total Available Power for EV', uom: 'MVA', fy27: 12.00, fy28: 12.00, fy29: 12.00, fy30: 12.00, fy31: 12.00 },
        ],
        'Dhirauli': [
          { particular: 'Coal Production', uom: 'MT', fy27: 2.08, fy28: 5.00, fy29: 5.00, fy30: 5.00, fy31: 5.00 },
          { particular: 'OB Production', uom: 'Mcum', fy27: 19.92, fy28: 35.81, fy29: 36.70, fy30: 36.70, fy31: 35.90 },
          { particular: 'CHP, Washery & Mining Requirement', uom: 'MVA', fy27: 1.00, fy28: 1.00, fy29: 1.00, fy30: 1.00, fy31: 1.00 },
          { particular: 'Total Available Power for EV', uom: 'MVA', fy27: 12.00, fy28: 12.00, fy29: 12.00, fy30: 12.00, fy31: 12.00 },
        ],
        'Jitpur': [
          { particular: 'Coal Production', uom: 'MT', fy27: 1.25, fy28: 2.50, fy29: 3.00, fy30: 3.50, fy31: 4.00 },
          { particular: 'OB Production', uom: 'Mcum', fy27: 5.82, fy28: 7.48, fy29: 9.24, fy30: 11.32, fy31: 13.32 },
          { particular: 'CHP, Washery & Mining Requirement', uom: 'MVA', fy27: 1.00, fy28: 1.00, fy29: 1.00, fy30: 1.00, fy31: 1.00 },
          { particular: 'Total Available Power for EV', uom: 'MVA', fy27: 6.00, fy28: 6.00, fy29: 6.00, fy30: 6.00, fy31: 6.00 },
        ],
        'Gondulpura': [
          { particular: 'Coal Production', uom: 'MT', fy27: 0.00, fy28: 2.00, fy29: 4.00, fy30: 5.00, fy31: 5.00 },
          { particular: 'OB Production', uom: 'Mcum', fy27: 0.33, fy28: 3.94, fy29: 7.88, fy30: 8.88, fy31: 7.79 },
          { particular: 'CHP, Washery & Mining Requirement', uom: 'MVA', fy27: 1.00, fy28: 1.00, fy29: 1.00, fy30: 1.00, fy31: 1.00 },
          { particular: 'Total Available Power for EV', uom: 'MVA', fy27: 4.00, fy28: 4.00, fy29: 4.00, fy30: 4.00, fy31: 4.00 },
        ],
        'Bijahan': [
          { particular: 'Coal Production', uom: 'MT', fy27: 1.50, fy28: 5.20, fy29: 6.30, fy30: 7.30, fy31: 7.30 },
          { particular: 'OB Production', uom: 'Mcum', fy27: 6.03, fy28: 15.99, fy29: 16.13, fy30: 16.97, fy31: 16.41 },
          { particular: 'CHP, Washery & Mining Requirement', uom: 'MVA', fy27: 1.00, fy28: 1.00, fy29: 1.00, fy30: 1.00, fy31: 1.00 },
          { particular: 'Total Available Power for EV', uom: 'MVA', fy27: 8.00, fy28: 8.00, fy29: 8.00, fy30: 8.00, fy31: 8.00 },
        ],
      };

      // Seed default inputs for each mine
      const mineInputs = MINE_PLANNING_INPUTS[mineName] || [
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
      equipment: 'Surface Miner',
      particular: 'Coal',
      capacity: '',
      uom: 'MT/Year',
      avgLead: 2.5,
      fy27: 3.0,
      fy28: 3.0,
      fy29: 3.0,
      fy30: 3.0,
      fy31: 3.0,
    },
    {
      equipment: 'FEL to Surface Miner Ratio',
      particular: 'Coal',
      capacity: '7T',
      uom: 'Nos.',
      avgLead: 0.0,
      fy27: 2.0,
      fy28: 2.0,
      fy29: 2.0,
      fy30: 2.0,
      fy31: 2.0,
    },
    {
      equipment: 'FEL - EV % Addition',
      particular: 'Coal',
      capacity: '',
      uom: '%',
      avgLead: 0.0,
      fy27: 0.2,
      fy28: 0.2,
      fy29: 0.2,
      fy30: 0.2,
      fy31: 0.2,
    },
    {
      equipment: '1 FEL EV Productivity',
      particular: 'Coal',
      capacity: '',
      uom: 'MT/Year',
      avgLead: 0.0,
      fy27: 1.4175,
      fy28: 1.4175,
      fy29: 1.4175,
      fy30: 1.4175,
      fy31: 1.4175,
    },
    {
      equipment: 'Coal Dumper to Surface Miner Ratio',
      particular: 'Coal',
      capacity: '40T',
      uom: 'Nos.',
      avgLead: 0.0,
      fy27: 10.0,
      fy28: 10.0,
      fy29: 10.0,
      fy30: 10.0,
      fy31: 10.0,
    },
    {
      equipment: 'Coal Dumper - EV % Addition',
      particular: 'Coal',
      capacity: '',
      uom: '%',
      avgLead: 0.0,
      fy27: 0.0,
      fy28: 0.0,
      fy29: 0.0,
      fy30: 0.0,
      fy31: 0.0,
    },
    {
      equipment: '1 Coal Dumper EV Productivity',
      particular: 'Coal',
      capacity: '',
      uom: 'MT/Year',
      avgLead: 0.0,
      fy27: 0.419832,
      fy28: 0.419832,
      fy29: 0.419832,
      fy30: 0.419832,
      fy31: 0.419832,
    },
    {
      equipment: '1 OB EV Dumper Productivity - 40T',
      particular: 'OB',
      capacity: '40T',
      uom: 'Mcum/Year',
      avgLead: 3.0,
      fy27: 0.2352,
      fy28: 0.2352,
      fy29: 0.2352,
      fy30: 0.2352,
      fy31: 0.2352,
    },
    {
      equipment: '1 OB EV Dumper Productivity - 70T',
      particular: 'OB',
      capacity: '70T',
      uom: 'Mcum/Year',
      avgLead: 3.0,
      fy27: 0.290509,
      fy28: 0.290509,
      fy29: 0.290509,
      fy30: 0.290509,
      fy31: 0.290509,
    },
    {
      equipment: 'EV Deployment at Operational Sites',
      particular: 'Coal/OB',
      capacity: '',
      uom: '%',
      avgLead: 0.0,
      fy27: 1.0,
      fy28: 1.0,
      fy29: 1.0,
      fy30: 1.0,
      fy31: 1.0,
    },
    {
      equipment: 'EV Deployment at Upcoming Sites',
      particular: 'Coal/OB',
      capacity: '',
      uom: '%',
      avgLead: 0.0,
      fy27: 1.0,
      fy28: 1.0,
      fy29: 1.0,
      fy30: 1.0,
      fy31: 1.0,
    },
  ];

  console.log('Cleaning up obsolete Vehicle Productivities...');
  const activeProductivityNames = productivities.map(p => p.equipment);
  await prisma.vehicleProductivity.deleteMany({
    where: {
      equipment: { notIn: activeProductivityNames },
    },
  });

  console.log('Seeding Vehicle Productivities...');
  for (const prod of productivities) {
    await prisma.vehicleProductivity.upsert({
      where: { equipment: prod.equipment },
      update: {
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
