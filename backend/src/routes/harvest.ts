import { Router } from 'express';
import { prisma } from '../lib/prisma';
import axios from 'axios';

const router = Router();

const HARVEST_BASE = 'https://api.harvestapp.com/v2';

function harvestHeaders() {
  return {
    'Harvest-Account-Id': process.env.HARVEST_ACCOUNT_ID || '',
    Authorization: `Bearer ${process.env.HARVEST_ACCESS_TOKEN || ''}`,
    'User-Agent': 'Paradise PM (contact@paradise.com)',
  };
}

// GET sync status
router.get('/status', async (_req, res) => {
  const syncs = await prisma.harvestSync.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  res.json(syncs);
});

// POST trigger manual sync
router.post('/sync', async (req, res) => {
  const { from, to } = req.body;

  const sync = await prisma.harvestSync.create({
    data: {
      syncType: 'manual',
      startedAt: new Date(),
      status: 'running',
    },
  });

  // Run sync asynchronously
  syncHarvestData(sync.id, from, to).catch(console.error);

  res.json({ syncId: sync.id, status: 'running', message: 'Sync started' });
});

async function syncHarvestData(syncId: string, from?: string, to?: string) {
  try {
    const params: any = { per_page: 100 };
    if (from) params.from = from;
    if (to) params.to = to;

    let page = 1;
    let totalEntries = 0;

    while (true) {
      const response = await axios.get(`${HARVEST_BASE}/time_entries`, {
        headers: harvestHeaders(),
        params: { ...params, page },
      });

      const { time_entries, total_pages } = response.data;

      for (const entry of time_entries) {
        // Find matching team member by harvest_user_id
        const teamMember = await prisma.teamMember.findFirst({
          where: { harvestUserId: String(entry.user.id) },
        });

        // Find matching project by harvest_project_id
        const project = await prisma.project.findFirst({
          where: { harvestProjectId: String(entry.project.id) },
        });

        if (teamMember && project) {
          await prisma.timeEntry.upsert({
            where: { harvestEntryId: String(entry.id) },
            update: {
              hours: entry.hours,
              notes: entry.notes,
              isBillable: entry.billable,
              taskCategory: entry.task?.name,
              syncedAt: new Date(),
            },
            create: {
              teamMemberId: teamMember.id,
              projectId: project.id,
              date: new Date(entry.spent_date),
              hours: entry.hours,
              isBillable: entry.billable,
              taskCategory: entry.task?.name,
              notes: entry.notes,
              harvestEntryId: String(entry.id),
              syncedAt: new Date(),
            },
          });
          totalEntries++;
        }
      }

      if (page >= total_pages) break;
      page++;
    }

    await prisma.harvestSync.update({
      where: { id: syncId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        entriesSync: totalEntries,
      },
    });
  } catch (error: any) {
    await prisma.harvestSync.update({
      where: { id: syncId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errors: error.message,
      },
    });
  }
}

// GET Harvest users (for mapping)
router.get('/users', async (_req, res) => {
  if (!process.env.HARVEST_ACCESS_TOKEN) {
    return res.json({ users: [], message: 'Harvest not configured' });
  }

  const response = await axios.get(`${HARVEST_BASE}/users`, {
    headers: harvestHeaders(),
  });
  res.json(response.data);
});

// GET Harvest projects (for mapping)
router.get('/projects', async (_req, res) => {
  if (!process.env.HARVEST_ACCESS_TOKEN) {
    return res.json({ projects: [], message: 'Harvest not configured' });
  }

  const response = await axios.get(`${HARVEST_BASE}/projects`, {
    headers: harvestHeaders(),
  });
  res.json(response.data);
});

export default router;
