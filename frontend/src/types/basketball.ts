export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export type DrillCategory = 'Shooting' | 'Defense' | 'Conditioning' | 'Ball Handling' | 'Rebounding' | 'Team' | 'Footwork';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type SessionType = 'Practice' | 'Game' | 'Film Session' | 'Conditioning' | 'Scrimmage';
export type StatType = 'Game' | 'Practice' | 'Scrimmage';

export interface Player {
  id: string;
  name: string;
  position: Position;
  jerseyNumber: number | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  teamGroup: string | null;
  notes: string | null;
  isActive: boolean;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
  stats?: PlayerStat[];
  attendances?: SessionAttendance[];
  _count?: { stats: number; attendances: number };
}

export interface Drill {
  id: string;
  name: string;
  category: DrillCategory;
  description: string | null;
  difficulty: Difficulty;
  durationMins: number | null;
  instructions: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  _count?: { sessionDrills: number };
}

export interface TrainingSession {
  id: string;
  title: string;
  sessionType: SessionType;
  date: string;
  durationMins: number | null;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  drills?: SessionDrill[];
  attendances?: SessionAttendance[];
  _count?: { attendances: number };
}

export interface SessionDrill {
  id: string;
  sessionId: string;
  drillId: string;
  orderIndex: number;
  sets: number | null;
  reps: number | null;
  durationMins: number | null;
  notes: string | null;
  drill: Drill;
}

export interface SessionAttendance {
  id: string;
  sessionId: string;
  playerId: string;
  attended: boolean;
  notes: string | null;
  player?: Pick<Player, 'id' | 'name' | 'position' | 'jerseyNumber'>;
  session?: Pick<TrainingSession, 'id' | 'title' | 'date' | 'sessionType'>;
}

export interface PlayerStat {
  id: string;
  playerId: string;
  statDate: string;
  statType: StatType;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalsMade: number;
  fieldGoalAttempts: number;
  threesMade: number;
  threesAttempts: number;
  freeThrowsMade: number;
  freeThrowAttempts: number;
  minutesPlayed: number;
  notes: string | null;
  player?: Pick<Player, 'id' | 'name' | 'position'>;
}

export interface DashboardData {
  summary: {
    totalPlayers: number;
    activePlayers: number;
    totalDrills: number;
    sessionsThisMonth: number;
    upcomingCount: number;
  };
  upcomingSessions: TrainingSession[];
  recentSessions: TrainingSession[];
  topPerformers: {
    player: Pick<Player, 'id' | 'name' | 'position'>;
    avgPoints: number;
    avgRebounds: number;
    avgAssists: number;
    games: number;
  }[];
}
