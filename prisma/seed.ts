import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

interface WbsRow {
  type: string;
  code: string;
  name: string;
  parentCode?: string;
}

function getHeaderKey(keys: string[], pattern: RegExp): string | undefined {
  return keys.find((key) => pattern.test(key.toLowerCase()));
}

function parseWbsWorkbook(): WbsRow[] | null {
  const possiblePaths = [
    path.resolve(__dirname, '../WBS_V3.xlsx'),
    path.resolve(__dirname, './WBS_V3.xlsx'),
  ];
  const workbookPath = possiblePaths.find((candidate) => fs.existsSync(candidate));
  if (!workbookPath) {
    return null;
  }

  const workbook = XLSX.readFile(workbookPath);
  const rows: WbsRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

    if (rawRows.length === 0) {
      continue;
    }

    const headerKeys = Object.keys(rawRows[0]);
    const typeKey = getHeaderKey(headerKeys, /(type|item type|level)/);
    const codeKey = getHeaderKey(headerKeys, /code/);
    const nameKey = getHeaderKey(headerKeys, /(name|title|description)/);
    const parentKey = getHeaderKey(headerKeys, /(parent|tow|stow)/);

    if (!typeKey || !codeKey || !nameKey) {
      continue;
    }

    for (const rawRow of rawRows) {
      const rawType = rawRow[typeKey];
      const rawCode = rawRow[codeKey];
      const rawName = rawRow[nameKey];
      const rawParent = parentKey ? rawRow[parentKey] : null;

      if (typeof rawType !== 'string' || typeof rawCode !== 'string' || typeof rawName !== 'string') {
        continue;
      }

      rows.push({
        type: rawType.trim(),
        code: rawCode.trim(),
        name: rawName.trim(),
        parentCode: typeof rawParent === 'string' ? rawParent.trim() : undefined,
      });
    }
  }

  return rows.length > 0 ? rows : null;
}

function classifyWbsRows(rows: WbsRow[]) {
  const tows: WbsRow[] = [];
  const stows: WbsRow[] = [];
  const sstows: WbsRow[] = [];

  for (const row of rows) {
    const normalizedType = row.type.toLowerCase();
    if (normalizedType.includes('sstow') || normalizedType.includes('s-stow') || normalizedType.includes('sub-sub')) {
      sstows.push(row);
    } else if (normalizedType.includes('stow') || normalizedType.includes('s-tow')) {
      stows.push(row);
    } else if (normalizedType.includes('tow') || normalizedType.includes('tows') || normalizedType.includes('wbs')) {
      tows.push(row);
    }
  }

  return { tows, stows, sstows };
}

async function seedWbsFromWorkbook() {
  const rows = parseWbsWorkbook();
  if (!rows) {
    return false;
  }

  const { tows, stows, sstows } = classifyWbsRows(rows);
  const towMap = new Map<string, string>();
  const stowMap = new Map<string, string>();

  for (const row of tows) {
    const existing = await prisma.tow.findFirst({ where: { code: row.code } });
    const entry = existing
      ? await prisma.tow.update({ where: { id: existing.id }, data: { name: row.name } })
      : await prisma.tow.create({ data: { code: row.code, name: row.name } });
    towMap.set(row.code, entry.id);
  }

  for (const row of stows) {
    const parentId = row.parentCode ? towMap.get(row.parentCode) : undefined;
    if (!parentId) {
      continue;
    }
    const existing = await prisma.stow.findFirst({ where: { code: row.code } });
    const entry = existing
      ? await prisma.stow.update({ where: { id: existing.id }, data: { name: row.name, towId: parentId } })
      : await prisma.stow.create({ data: { code: row.code, name: row.name, towId: parentId } });
    stowMap.set(row.code, entry.id);
  }

  for (const row of sstows) {
    const parentId = row.parentCode ? stowMap.get(row.parentCode) : undefined;
    if (!parentId) {
      continue;
    }
    const existing = await prisma.sstow.findFirst({ where: { code: row.code } });
    if (existing) {
      await prisma.sstow.update({ where: { id: existing.id }, data: { name: row.name, stowId: parentId } });
    } else {
      await prisma.sstow.create({ data: { code: row.code, name: row.name, stowId: parentId } });
    }
  }

  return true;
}

/** Permission codes exactly as defined in SDD Section 8.2 (Workflow States table) plus
 * the supporting permissions implied by the REST API design (crew mgmt, notifications, reporting). */
const PERMISSIONS: { code: string; description: string }[] = [
  { code: 'daily_plan.create', description: 'Create a Daily Plan' },
  { code: 'daily_plan.assign', description: 'Assign a Daily Plan to a Head of Master' },
  { code: 'daily_plan.start_execution', description: 'Start field execution (create crew, begin work)' },
  { code: 'daily_plan.submit', description: 'Submit Actual Quantity/Man-Day/Overtime/Comments' },
  { code: 'daily_plan.resubmit', description: 'Resubmit a corrected, previously rejected Daily Plan' },
  { code: 'daily_plan.reject', description: 'Reject a Daily Plan under review' },
  { code: 'daily_plan.approve.site_chief', description: 'Site Chief approval of a submitted Daily Plan' },
  { code: 'daily_plan.approve.project_manager', description: 'Project Manager final approval' },
  { code: 'daily_plan.complete', description: 'System-driven completion of the workflow' },
  { code: 'daily_plan.read', description: 'View Daily Plans' },
  { code: 'daily_plan.update', description: 'Update a Daily Plan in Draft state' },
  { code: 'daily_plan.delete', description: 'Cancel/soft-delete a Daily Plan' },
  { code: 'crew.create', description: 'Create a Crew for a Daily Plan' },
  { code: 'crew.read', description: 'View Crew details' },
  { code: 'crew.worker.assign', description: 'Assign a Worker to a Crew' },
  { code: 'crew.worker.remove', description: 'Remove a Worker from a Crew' },
  { code: 'notification.read', description: 'View own notifications' },
  { code: 'report.daily.read', description: 'View the daily operational report' },
  { code: 'report.productivity.read', description: 'View productivity KPIs' },
  { code: 'user.admin', description: 'Manage users, roles, and permissions' },
];

/** Roles exactly as defined in SDD Sections 8.2, 9.5, 11.4. */
const ROLES: Record<string, string[]> = {
  'Technical Office Engineer': ['daily_plan.create', 'daily_plan.assign', 'daily_plan.read', 'daily_plan.update', 'daily_plan.delete'],
  'Head of Master': [
    'daily_plan.start_execution',
    'daily_plan.submit',
    'daily_plan.resubmit',
    'daily_plan.read',
    'crew.create',
    'crew.read',
    'crew.worker.assign',
    'crew.worker.remove',
    'notification.read',
  ],
  'Site Chief': ['daily_plan.approve.site_chief', 'daily_plan.reject', 'daily_plan.read', 'notification.read'],
  'Project Manager': [
    'daily_plan.approve.project_manager',
    'daily_plan.reject',
    'daily_plan.read',
    'report.daily.read',
    'report.productivity.read',
    'notification.read',
  ],
  Administrator: ['user.admin', 'daily_plan.read', 'report.daily.read', 'report.productivity.read'],
};

async function main() {
  console.log('Seeding permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description },
      create: perm,
    });
  }

  console.log('Seeding roles...');
  for (const roleName of Object.keys(ROLES)) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName },
    });
  }

  console.log('Linking role permissions...');
  for (const [roleName, permCodes] of Object.entries(ROLES)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
    for (const code of permCodes) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log('Seeding sample organizational structure...');
  const project = await prisma.project.upsert({
    where: { code: 'PRJ-001' },
    update: {},
    create: { name: 'Downtown Infrastructure Project', code: 'PRJ-001' },
  });

  const region = await prisma.region.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000001', projectId: project.id, name: 'Region North' },
  });

  const location = await prisma.location.upsert({
    where: { code: 'LOC-001' },
    update: {},
    create: { regionId: region.id, code: 'LOC-001', name: 'Site KKK-01' },
  });

  const tow = await prisma.tow.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000010', code: 'TOW-01', name: 'Earthworks' },
  });
  const stow = await prisma.stow.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000011', towId: tow.id, code: 'STOW-01', name: 'Excavation' },
  });
  await prisma.sstow.upsert({
    where: { id: '00000000-0000-0000-0000-000000000012' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000012', stowId: stow.id, code: 'SSTOW-01', name: 'Trench Excavation' },
  });

  const workbookSeeded = await seedWbsFromWorkbook();
  if (workbookSeeded) {
    console.log('Seeded WBS hierarchy from WBS_V3.xlsx');
  } else {
    console.log('WBS_V3.xlsx not found or not parsed; using sample WBS data only.');
  }

  console.log('Seeding sample users (password for all: Passw0rd!123)...');
  const passwordHash = await argon2.hash('Passw0rd!123');

  const usersToCreate = [
    { email: 'technical.office@wfx.com', fullName: 'Tariq Al-Sayed', role: 'Technical Office Engineer' },
    { email: 'head.master@wfx.com', fullName: 'Youssef Nasser', role: 'Head of Master' },
    { email: 'site.chief@wfx.com', fullName: 'Layla Hamdan', role: 'Site Chief' },
    { email: 'project.manager@wfx.com', fullName: 'Omar Fares', role: 'Project Manager' },
    { email: 'admin@wfx.com', fullName: 'Platform Admin', role: 'Administrator' },
  ];

  for (const u of usersToCreate) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, fullName: u.fullName, passwordHash, isActive: true },
    });

    const role = await prisma.role.findUniqueOrThrow({ where: { name: u.role } });

    await prisma.userRole.upsert({
      where: { userId_projectId_roleId: { userId: user.id, projectId: project.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, projectId: project.id, roleId: role.id },
    });

    const existingScope = await prisma.userScope.findFirst({
      where: {
        userId: user.id,
        projectId: project.id,
        regionId: region.id,
        locationId: null,
      },
    });

    if (!existingScope) {
      await prisma.userScope.create({
        data: { userId: user.id, projectId: project.id, regionId: region.id, locationId: null },
      });
    }
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
