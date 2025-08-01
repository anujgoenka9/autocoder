import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { activityLogs, users, projects, messages, fragments, type NewProject, type NewMessage, type NewFragment, MessageRole, MessageType } from './schema';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/session';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  const sessionData = await verifyToken(sessionCookie.value);
  if (
    !sessionData ||
    !sessionData.user ||
    typeof sessionData.user.id !== 'number'
  ) {
    return null;
  }

  if (new Date(sessionData.expires) < new Date()) {
    return null;
  }

  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  return user[0];
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10);
}

export async function getUserProjects() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  return await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt));
}

export async function getProjectWithMessages(projectId: string) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1);

  if (project.length === 0) {
    return null;
  }

  const projectMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(messages.createdAt);

  return {
    project: project[0],
    messages: projectMessages
  };
}

export async function createProject(name: string) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const newProject: NewProject = {
    name,
    userId: user.id,
  };

  const [project] = await db.insert(projects).values(newProject).returning();
  return project;
}

export async function getCurrentOrCreateProject() {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get the most recent project
  const recentProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt))
    .limit(1);

  if (recentProjects.length > 0) {
    return recentProjects[0];
  }

  // Create a new project if none exists
  return createProject('New Project');
}

export async function saveMessage(projectId: string, content: string, role: MessageRole, type: MessageType = MessageType.RESULT) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify user owns the project before saving message
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1);

  if (project.length === 0) {
    throw new Error('Project not found or access denied');
  }

  const newMessage: NewMessage = {
    content,
    role,
    type,
    projectId,
  };

  const [message] = await db.insert(messages).values(newMessage).returning();
  return message;
}

export async function getProjectMessages(projectId: string) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify user owns the project
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1);

  if (project.length === 0) {
    throw new Error('Project not found or access denied');
  }

  return await db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(messages.createdAt);
}

export async function updateProjectName(projectId: string, newName: string) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify user owns the project before updating
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1);

  if (project.length === 0) {
    throw new Error('Project not found or access denied');
  }

  const [updatedProject] = await db
    .update(projects)
    .set({ 
      name: newName.trim(),
      updatedAt: new Date()
    })
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .returning();

  return updatedProject;
}

export async function getProjectById(projectId: string) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get project details and verify ownership
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1);

  if (project.length === 0) {
    throw new Error('Project not found or access denied');
  }

  return project[0];
}

export async function deleteProject(projectId: string) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify user owns the project before deleting
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1);

  if (project.length === 0) {
    throw new Error('Project not found or access denied');
  }

  // Delete the project (cascading delete will handle messages and fragments)
  await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));

  return { success: true };
}

export async function getFragmentByProjectId(projectId: string) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify user owns the project
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1);

  if (project.length === 0) {
    throw new Error('Project not found or access denied');
  }

  const fragment = await db
    .select()
    .from(fragments)
    .where(eq(fragments.projectId, projectId))
    .limit(1);

  return fragment.length > 0 ? fragment[0] : null;
}

export async function upsertFragment(projectId: string, sandboxUrl: string, files: Record<string, string>) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Verify user owns the project
  const project = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1);

  if (project.length === 0) {
    throw new Error('Project not found or access denied');
  }

  // Use upsert instead of separate check and insert/update
  const [fragment] = await db
    .insert(fragments)
    .values({
      projectId,
      sandboxUrl,
      files
    })
    .onConflictDoUpdate({
      target: fragments.projectId,
      set: {
        sandboxUrl,
        files,
        updatedAt: new Date()
      }
    })
    .returning();

  return fragment;
}

// Keep the old function for backward compatibility but mark as deprecated
export async function createOrUpdateFragment(projectId: string, sandboxUrl: string, files: Record<string, string>) {
  console.warn('createOrUpdateFragment is deprecated, use upsertFragment instead');
  return upsertFragment(projectId, sandboxUrl, files);
}
