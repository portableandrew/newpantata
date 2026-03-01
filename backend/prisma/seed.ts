import { PrismaClient } from '@prisma/client';
import { addDays, subDays } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding basketball training data...');

  // Players
  const players = await Promise.all([
    prisma.player.create({ data: { name: 'Marcus Johnson', position: 'PG', jerseyNumber: 3, age: 19, heightCm: 185, weightKg: 80, teamGroup: 'Varsity' } }),
    prisma.player.create({ data: { name: 'Tyler Brooks', position: 'SG', jerseyNumber: 11, age: 20, heightCm: 191, weightKg: 88, teamGroup: 'Varsity' } }),
    prisma.player.create({ data: { name: 'James Rivera', position: 'SF', jerseyNumber: 23, age: 21, heightCm: 198, weightKg: 95, teamGroup: 'Varsity' } }),
    prisma.player.create({ data: { name: 'DeShawn Williams', position: 'PF', jerseyNumber: 32, age: 20, heightCm: 203, weightKg: 105, teamGroup: 'Varsity' } }),
    prisma.player.create({ data: { name: 'Chris Thompson', position: 'C', jerseyNumber: 5, age: 22, heightCm: 211, weightKg: 115, teamGroup: 'Varsity' } }),
    prisma.player.create({ data: { name: 'Aiden Park', position: 'PG', jerseyNumber: 7, age: 18, heightCm: 180, weightKg: 75, teamGroup: 'JV' } }),
    prisma.player.create({ data: { name: 'Leon Foster', position: 'SG', jerseyNumber: 14, age: 17, heightCm: 188, weightKg: 82, teamGroup: 'JV' } }),
    prisma.player.create({ data: { name: 'Malik Davis', position: 'SF', jerseyNumber: 21, age: 18, heightCm: 195, weightKg: 90, teamGroup: 'JV' } }),
  ]);

  // Drills
  const drills = await Promise.all([
    prisma.drill.create({ data: { name: 'Mikan Drill', category: 'Shooting', difficulty: 'Beginner', durationMins: 10, description: 'Close-range layup drill alternating sides of the basket', instructions: '1. Start on left block\n2. Make a right-handed layup\n3. Without letting ball hit floor, make a left-handed layup from right block\n4. Continue for 1 minute' } }),
    prisma.drill.create({ data: { name: '3-Point Shooting Circuit', category: 'Shooting', difficulty: 'Intermediate', durationMins: 15, description: 'Shoot from 5 spots around the 3-point arc', instructions: '1. Start at right corner\n2. Take 3 shots from each spot\n3. Move clockwise to next spot\n4. Track makes/misses' } }),
    prisma.drill.create({ data: { name: 'Form Shooting', category: 'Shooting', difficulty: 'Beginner', durationMins: 10, description: 'Close-range one-hand shooting to build proper mechanics' } }),
    prisma.drill.create({ data: { name: 'Defensive Slides', category: 'Defense', difficulty: 'Beginner', durationMins: 8, description: 'Lateral defensive sliding drill to build hip strength and footwork', instructions: '1. Get in defensive stance\n2. Slide left to line\n3. Slide right to other line\n4. Never cross feet\n5. 10 reps' } }),
    prisma.drill.create({ data: { name: 'Shell Drill', category: 'Defense', difficulty: 'Intermediate', durationMins: 20, description: 'Team defensive positioning drill teaching help defense principles' } }),
    prisma.drill.create({ data: { name: 'Zig-Zag Dribbling', category: 'BallHandling', difficulty: 'Beginner', durationMins: 10, description: 'Dribble in zig-zag pattern down the court using crossovers', instructions: '1. Start at corner\n2. Dribble at 45-degree angle to first cone\n3. Cross over and change direction\n4. Continue to end of court\n5. Repeat with off hand' } }),
    prisma.drill.create({ data: { name: 'Two-Ball Dribbling', category: 'BallHandling', difficulty: 'Advanced', durationMins: 12, description: 'Dribble two basketballs simultaneously to build hand coordination' } }),
    prisma.drill.create({ data: { name: 'Box-Out Drill', category: 'Rebounding', difficulty: 'Intermediate', durationMins: 15, description: '1-on-1 box out battles teaching proper rebounding positioning' } }),
    prisma.drill.create({ data: { name: '5-on-5 Transition', category: 'Team', difficulty: 'Intermediate', durationMins: 20, description: 'Full-court transition offense and defense drill' } }),
    prisma.drill.create({ data: { name: 'Suicide Sprints', category: 'Conditioning', difficulty: 'Advanced', durationMins: 15, description: 'Full-court sprint conditioning from baseline to each line', instructions: '1. Start at baseline\n2. Sprint to free throw line and back\n3. Sprint to half court and back\n4. Sprint to far free throw line and back\n5. Sprint full court and back\n6. Rest 1 min, repeat 4x' } }),
    prisma.drill.create({ data: { name: 'Pivot Footwork', category: 'Footwork', difficulty: 'Beginner', durationMins: 8, description: 'Practice front and reverse pivots with proper foot placement' } }),
    prisma.drill.create({ data: { name: '3-Man Weave', category: 'Team', difficulty: 'Intermediate', durationMins: 15, description: 'Classic passing drill that builds passing precision and court vision in transition' } }),
  ]);

  const now = new Date();

  // Training Sessions
  const pastSession1 = await prisma.trainingSession.create({
    data: {
      title: 'Monday Practice',
      sessionType: 'Practice',
      date: subDays(now, 7),
      durationMins: 120,
      location: 'Main Gym',
      notes: 'Focus on defensive rotations and 3-point shooting.',
      drills: {
        create: [
          { drillId: drills[3].id, orderIndex: 0, sets: 3, durationMins: 8 },
          { drillId: drills[4].id, orderIndex: 1, durationMins: 20 },
          { drillId: drills[1].id, orderIndex: 2, sets: 5 },
          { drillId: drills[8].id, orderIndex: 3, durationMins: 20 },
        ],
      },
      attendances: {
        create: players.slice(0, 5).map(p => ({ playerId: p.id, attended: true })),
      },
    },
  });

  const pastSession2 = await prisma.trainingSession.create({
    data: {
      title: 'Wednesday Conditioning',
      sessionType: 'Conditioning',
      date: subDays(now, 5),
      durationMins: 60,
      location: 'Main Gym',
      drills: {
        create: [
          { drillId: drills[9].id, orderIndex: 0, sets: 4 },
          { drillId: drills[3].id, orderIndex: 1, sets: 5 },
        ],
      },
      attendances: {
        create: players.slice(0, 8).map((p, i) => ({ playerId: p.id, attended: i < 6 })),
      },
    },
  });

  await prisma.trainingSession.create({
    data: {
      title: 'Friday Scrimmage',
      sessionType: 'Scrimmage',
      date: subDays(now, 3),
      durationMins: 90,
      location: 'Main Gym',
      notes: '5-on-5 scrimmage — evaluate lineup combinations.',
      attendances: {
        create: players.slice(0, 8).map(p => ({ playerId: p.id, attended: true })),
      },
    },
  });

  await prisma.trainingSession.create({
    data: {
      title: 'Film Session – Opponent Review',
      sessionType: 'FilmSession',
      date: subDays(now, 1),
      durationMins: 45,
      location: 'Film Room',
      notes: 'Review opponent defensive schemes and tendencies.',
      attendances: {
        create: players.slice(0, 5).map(p => ({ playerId: p.id, attended: true })),
      },
    },
  });

  // Upcoming sessions
  await prisma.trainingSession.create({
    data: {
      title: 'Tuesday Practice – Shooting Focus',
      sessionType: 'Practice',
      date: addDays(now, 1),
      durationMins: 120,
      location: 'Main Gym',
      drills: {
        create: [
          { drillId: drills[2].id, orderIndex: 0, durationMins: 10 },
          { drillId: drills[0].id, orderIndex: 1, sets: 3 },
          { drillId: drills[1].id, orderIndex: 2, sets: 5 },
          { drillId: drills[7].id, orderIndex: 3, durationMins: 15 },
          { drillId: drills[11].id, orderIndex: 4, durationMins: 15 },
        ],
      },
      attendances: {
        create: players.slice(0, 5).map(p => ({ playerId: p.id })),
      },
    },
  });

  await prisma.trainingSession.create({
    data: {
      title: 'Thursday Game vs. Eastside',
      sessionType: 'Game',
      date: addDays(now, 3),
      durationMins: 100,
      location: 'Eastside Arena',
      notes: 'Away game. Bus leaves at 5:30pm.',
      attendances: {
        create: players.slice(0, 8).map(p => ({ playerId: p.id })),
      },
    },
  });

  await prisma.trainingSession.create({
    data: {
      title: 'Saturday Ball Handling Workshop',
      sessionType: 'Practice',
      date: addDays(now, 5),
      durationMins: 90,
      location: 'Main Gym',
      drills: {
        create: [
          { drillId: drills[5].id, orderIndex: 0, durationMins: 10 },
          { drillId: drills[6].id, orderIndex: 1, durationMins: 12 },
          { drillId: drills[10].id, orderIndex: 2, durationMins: 8 },
        ],
      },
      attendances: {
        create: players.map(p => ({ playerId: p.id })),
      },
    },
  });

  // Stats
  const statDates = [subDays(now, 21), subDays(now, 14), subDays(now, 7), subDays(now, 3)];

  for (const player of players.slice(0, 5)) {
    for (const date of statDates) {
      await prisma.playerStat.create({
        data: {
          playerId: player.id,
          statDate: date,
          statType: 'Game',
          points: Math.floor(Math.random() * 18) + 5,
          rebounds: Math.floor(Math.random() * 8) + 2,
          assists: Math.floor(Math.random() * 7) + 1,
          steals: Math.floor(Math.random() * 3),
          blocks: Math.floor(Math.random() * 2),
          turnovers: Math.floor(Math.random() * 4) + 1,
          fieldGoalsMade: Math.floor(Math.random() * 7) + 2,
          fieldGoalAttempts: Math.floor(Math.random() * 7) + 8,
          threesMade: Math.floor(Math.random() * 3),
          threesAttempts: Math.floor(Math.random() * 4) + 1,
          freeThrowsMade: Math.floor(Math.random() * 5),
          freeThrowAttempts: Math.floor(Math.random() * 3) + 2,
          minutesPlayed: Math.floor(Math.random() * 15) + 18,
        },
      });
    }
  }

  console.log('Seed complete!');
  console.log(`  ${players.length} players`);
  console.log(`  ${drills.length} drills`);
  console.log('  7 training sessions (4 past, 3 upcoming)');
  console.log(`  ${5 * statDates.length} stat entries`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
