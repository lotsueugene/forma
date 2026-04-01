import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get all users
  const users = await prisma.user.findMany();
  console.log('Users:', users.length);

  for (const user of users) {
    console.log('User:', user.id, user.email);

    // Check if they have a workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      include: { workspace: true }
    });

    if (!membership) {
      console.log('  -> No workspace, creating one...');
      const displayName = user.name || user.email?.split('@')[0] || 'User';
      const workspace = await prisma.workspace.create({
        data: {
          name: `${displayName}'s Workspace`,
          slug: `personal-${user.id}`,
          isPersonal: true,
          members: {
            create: {
              userId: user.id,
              role: 'owner'
            }
          }
        }
      });
      console.log('  -> Created workspace:', workspace.id, workspace.name);
    } else {
      console.log('  -> Has workspace:', membership.workspace.name);
    }
  }

  // List all workspaces
  const workspaces = await prisma.workspace.findMany({ include: { members: true } });
  console.log('\nAll workspaces:', workspaces.length);
  workspaces.forEach(ws => console.log(' -', ws.id, ws.name, 'members:', ws.members.length));
}

main().catch(console.error).finally(() => prisma.$disconnect());
