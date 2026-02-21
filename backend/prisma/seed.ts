import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Paradise PM database...');

  // Organization
  await prisma.organization.upsert({
    where: { id: 'org-paradise' },
    update: {},
    create: {
      id: 'org-paradise',
      name: 'Paradise',
      targetProfitability: 7.5,
      targetBillableUtilization: 68.1,
    },
  });

  // Clients
  const clients = [
    { id: 'c-dcj', name: 'DCJ', industry: 'Government' },
    { id: 'c-unsw', name: 'UNSW', industry: 'Education' },
    { id: 'c-haifa', name: 'University of Haifa', industry: 'Education' },
    { id: 'c-tv', name: 'Tenants Victoria', industry: 'Non-profit' },
    { id: 'c-ipa', name: 'IP Australia', industry: 'Government' },
    { id: 'c-njp', name: 'NJP', industry: 'Legal' },
    { id: 'c-hs', name: 'headspace', industry: 'Healthcare' },
    { id: 'c-icl', name: 'ICL', industry: 'Legal' },
    { id: 'c-lans', name: 'Legal Aid NSW', industry: 'Legal' },
    { id: 'c-lsc', name: 'LSC', industry: 'Legal' },
    { id: 'c-nla', name: 'National Legal Aid', industry: 'Legal' },
    { id: 'c-dor', name: 'Dor Foundation', industry: 'Non-profit' },
    { id: 'c-aiatsis', name: 'AIATSIS', industry: 'Government' },
    { id: 'c-liv', name: 'Law Institute Victoria', industry: 'Legal' },
    { id: 'c-av', name: 'Anglicare Victoria', industry: 'Non-profit' },
    { id: 'c-mlh', name: 'Michigan Legal Help', industry: 'Legal' },
    { id: 'c-trib', name: 'Tribeca Group', industry: 'Consulting' },
  ];

  for (const client of clients) {
    await prisma.client.upsert({
      where: { id: client.id },
      update: {},
      create: client,
    });
  }

  // Team Members
  const teamMembers = [
    { id: 'tm-sb', name: 'Sam Bury', email: 'sam.bury@paradise.com', role: 'Lead', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 120, hourlyRateBillable: 220 },
    { id: 'tm-rt', name: 'Ruth Taylor', email: 'ruth.taylor@paradise.com', role: 'Lead', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 120, hourlyRateBillable: 220 },
    { id: 'tm-af', name: 'Andrew Fulton', email: 'andrew.fulton@paradise.com', role: 'Lead', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 120, hourlyRateBillable: 220 },
    { id: 'tm-bl', name: 'Becky Leonhardt', email: 'becky.leonhardt@paradise.com', role: 'Principal', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 150, hourlyRateBillable: 280 },
    { id: 'tm-lt', name: 'Luke Thomas', email: 'luke.thomas@paradise.com', role: 'Principal', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 150, hourlyRateBillable: 280 },
    { id: 'tm-pd', name: 'Prabhath De Silva', email: 'prabhath.desilva@paradise.com', role: 'Principal', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 150, hourlyRateBillable: 280 },
    { id: 'tm-er', name: 'Emma Rhys', email: 'emma.rhys@paradise.com', role: 'Production', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 85, hourlyRateBillable: 165 },
    { id: 'tm-tw', name: 'Tess Waterhouse', email: 'tess.waterhouse@paradise.com', role: 'Production', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 85, hourlyRateBillable: 165 },
    { id: 'tm-jw', name: 'Juanita Ward', email: 'juanita.ward@paradise.com', role: 'Production', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 85, hourlyRateBillable: 165 },
    { id: 'tm-aj', name: 'Anshika Jain', email: 'anshika.jain@paradise.com', role: 'Designer', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 95, hourlyRateBillable: 185 },
    { id: 'tm-cf', name: 'Cristiano Fantasia', email: 'cristiano.fantasia@paradise.com', role: 'Designer', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 95, hourlyRateBillable: 185 },
    { id: 'tm-aa', name: 'Ammar Aldaoud', email: 'ammar.aldaoud@paradise.com', role: 'BA', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 100, hourlyRateBillable: 195 },
    { id: 'tm-dg', name: 'Darcy Glennen', email: 'darcy.glennen@paradise.com', role: 'BA', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 100, hourlyRateBillable: 195 },
    { id: 'tm-da', name: 'Dave Allen', email: 'dave.allen@paradise.com', role: 'Developer', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 105, hourlyRateBillable: 200 },
    { id: 'tm-ih', name: 'Ian Hogers', email: 'ian.hogers@paradise.com', role: 'Developer', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 105, hourlyRateBillable: 200 },
    { id: 'tm-jb', name: 'Jeffrey Basilio', email: 'jeffrey.basilio@paradise.com', role: 'Developer', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 105, hourlyRateBillable: 200 },
    { id: 'tm-nr', name: 'Nick Rogers', email: 'nick.rogers@paradise.com', role: 'BA', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 100, hourlyRateBillable: 195 },
    { id: 'tm-th', name: 'Tam Ho', email: 'tam.ho@paradise.com', role: 'Developer', employmentType: 'FullTime', weeklyHours: 38, hourlyRateInternal: 105, hourlyRateBillable: 200 },
  ];

  for (const member of teamMembers) {
    await prisma.teamMember.upsert({
      where: { id: member.id },
      update: {},
      create: {
        ...member,
        role: member.role as any,
        employmentType: member.employmentType as any,
        startDate: new Date('2022-01-01'),
        isActive: true,
      },
    });
  }

  // Projects - SLAs
  const slas = [
    { id: 'p-dcj-sla', clientId: 'c-dcj', name: 'DCJ | SLA 25/26', projectType: 'SLA', status: 'Active', budget: 450000 },
    { id: 'p-hs-sla', clientId: 'c-hs', name: 'headspace SLA | FY 25/26', projectType: 'SLA', status: 'Active', budget: 280000 },
    { id: 'p-icl-sla', clientId: 'c-icl', name: 'ICL | SLA 2025/2026', projectType: 'SLA', status: 'Active', budget: 120000 },
    { id: 'p-lans-sla', clientId: 'c-lans', name: 'Legal Aid NSW | SLA FY 2025-2026', projectType: 'SLA', status: 'Active', budget: 180000 },
    { id: 'p-lsc-sla', clientId: 'c-lsc', name: 'LSC | Amica SLA 2025-2026', projectType: 'SLA', status: 'Active', budget: 95000 },
    { id: 'p-nla-sla', clientId: 'c-nla', name: 'National Legal Aid | Maintenance SLA 2026', projectType: 'SLA', status: 'Active', budget: 75000 },
  ];

  // Active projects
  const activeProjects = [
    { id: 'p-dcj-eip', clientId: 'c-dcj', name: 'DCJ | EIP Mediation layer replacement', projectType: 'FixedPrice', status: 'Active', budget: 320000 },
    { id: 'p-ipa-ai', clientId: 'c-ipa', name: 'IP Australia | Generative AI Chatbot', projectType: 'TM', status: 'Active', budget: 180000 },
    { id: 'p-njp-it', clientId: 'c-njp', name: 'NJP | Hear Me Out - IT Support', projectType: 'TM', status: 'Active', budget: 45000 },
    { id: 'p-tv-in', clientId: 'c-tv', name: 'Tenants Vic | Intake Prototype', projectType: 'FixedPrice', status: 'Active', budget: 85000 },
    { id: 'p-haifa', clientId: 'c-haifa', name: 'University of Haifa | amica research', projectType: 'TM', status: 'Active', budget: 120000 },
    { id: 'p-unsw-keh', clientId: 'c-unsw', name: 'UNSW | Knowledge Exchange Hub', projectType: 'FixedPrice', status: 'Active', budget: 240000 },
  ];

  // R&I projects
  const riProjects = [
    { id: 'p-civily', clientId: 'c-dcj', name: 'Civily', projectType: 'RIInternal', status: 'Active', budget: 0 },
    { id: 'p-sme', clientId: 'c-dcj', name: 'SME Evaluation Tool', projectType: 'RIInternal', status: 'Active', budget: 0 },
  ];

  // Pipeline deals
  const pipelineDeals = [
    { id: 'p-ml-1', clientId: 'c-mlh', name: 'Michigan Legal Help | Platform Upgrade', projectType: 'FixedPrice', status: 'Pipeline', budget: 0, dealStage: 'Proposal', dealLikelihood: 'High', dealAmount: 280000, expectedCloseDate: new Date('2026-03-15') },
    { id: 'p-av-1', clientId: 'c-av', name: 'Anglicare Victoria | Digital Transformation', projectType: 'TM', status: 'Pipeline', budget: 0, dealStage: 'Qualified', dealLikelihood: 'Medium', dealAmount: 150000, expectedCloseDate: new Date('2026-04-01') },
    { id: 'p-trib-1', clientId: 'c-trib', name: 'Tribeca Group | Analytics Dashboard', projectType: 'FixedPrice', status: 'Pipeline', budget: 0, dealStage: 'Lead', dealLikelihood: 'Low', dealAmount: 95000, expectedCloseDate: new Date('2026-05-01') },
    { id: 'p-aiat-1', clientId: 'c-aiatsis', name: 'AIATSIS | Knowledge Portal', projectType: 'FixedPrice', status: 'Pipeline', budget: 0, dealStage: 'Negotiation', dealLikelihood: 'High', dealAmount: 420000, expectedCloseDate: new Date('2026-02-28') },
  ];

  for (const project of [...slas, ...activeProjects, ...riProjects, ...pipelineDeals]) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: {},
      create: {
        ...project,
        projectType: project.projectType as any,
        status: project.status as any,
        dealStage: (project as any).dealStage as any,
        dealLikelihood: (project as any).dealLikelihood as any,
        startDate: new Date('2025-07-01'),
        endDate: new Date('2026-06-30'),
      },
    });
  }

  // Add health updates for active projects
  const healthProjects = [...slas, ...activeProjects, ...riProjects];
  const statuses: ('Green' | 'Orange' | 'Red')[] = ['Green', 'Green', 'Green', 'Orange', 'Green', 'Green'];

  for (let i = 0; i < healthProjects.length; i++) {
    const proj = healthProjects[i];
    const status = statuses[i % statuses.length];
    await prisma.projectHealthUpdate.create({
      data: {
        projectId: proj.id,
        updateDate: new Date('2026-02-14'),
        overallStatus: status,
        scheduleStatus: status,
        scopeStatus: 'Green',
        budgetStatus: status === 'Orange' ? 'Orange' : 'Green',
        clientStatus: 'Green',
        notes: status === 'Orange' ? 'Minor schedule risk - mitigation plan in place' : 'Project tracking well against all metrics',
      },
    });
  }

  // Monthly financials for Jan 2026 (sample data from brief)
  await prisma.monthlyFinancial.upsert({
    where: { month: new Date('2026-01-01') },
    update: {},
    create: {
      month: new Date('2026-01-01'),
      invoiced: 155231,
      prepayments: 48293,
      internalRevenue: 0,
      totalRevenue: 203524,
      wagesCost: 198608,
      contractorsCost: 28000,
      travelCost: 5000,
      otherDirectCost: 15000,
      directCosts: 246608,
      grossProfit: -43084,
      grossMargin: -21.17,
      indirectCosts: 66977,
      netProfit: -110061,
      netMargin: -54.08,
      rAndIHours: 41169,
    },
  });

  // Client feedback
  await prisma.clientFeedback.create({
    data: {
      projectId: 'p-dcj-sla',
      clientId: 'c-dcj',
      sentDate: new Date('2026-01-15'),
      clientScore: 8.5,
      participationRate: 75,
      happiness: 8.8,
      confidence: 8.2,
      collaboration: 8.7,
      feedbackText: 'Great team, very responsive and professional. Delivery was on time and quality exceeded expectations.',
      respondentName: 'DCJ Project Manager',
    },
  });

  await prisma.clientFeedback.create({
    data: {
      projectId: 'p-ipa-ai',
      clientId: 'c-ipa',
      sentDate: new Date('2026-01-20'),
      clientScore: 9.1,
      participationRate: 80,
      happiness: 9.0,
      confidence: 9.2,
      collaboration: 9.0,
      feedbackText: 'Excellent work on the AI chatbot. The team showed strong technical expertise and great communication.',
      respondentName: 'IP Australia Lead',
    },
  });

  // Contractors
  await prisma.contractor.create({
    data: {
      name: 'Alex Chen',
      projectId: 'p-dcj-eip',
      startDate: new Date('2025-11-01'),
      endDate: new Date('2026-03-31'),
      totalCost: 45000,
      status: 'Active',
    },
  });

  await prisma.contractor.create({
    data: {
      name: 'Maria Santos',
      projectId: 'p-unsw-keh',
      startDate: new Date('2025-12-01'),
      endDate: new Date('2026-02-28'),
      totalCost: 22000,
      status: 'Active',
    },
  });

  // Quarterly targets
  await prisma.quarterlyTarget.upsert({
    where: { id: 'qt-q3-fy26' },
    update: {},
    create: {
      id: 'qt-q3-fy26',
      quarter: 'Q3 FY25-26',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-31'),
      targetRevenue: 720000,
      targetCost: 620000,
      targetProfit: 100000,
    },
  });

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
