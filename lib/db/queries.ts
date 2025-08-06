import { desc, and, eq, isNull } from 'drizzle-orm';
import { db } from './drizzle';
import { users, projects, messages, fragments, type NewProject, type NewMessage, type NewFragment, MessageRole, MessageType } from './schema';
import { cookies } from 'next/headers';
// Note: Auth session removed during Supabase migration
// import { verifyToken } from '@/lib/auth/session';

export async function getUser() {
  // Get user from Supabase auth
  const { getUser: getSupabaseUser } = await import('@/lib/supabase/user');
  const supabaseUser = await getSupabaseUser();
  
  if (!supabaseUser) {
    return null;
  }

  // Get or create user in our database
  const [dbUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, supabaseUser.id), isNull(users.deletedAt)))
    .limit(1);

  if (!dbUser) {
    // Create user in our database if doesn't exist
    try {
      const [newUser] = await db
        .insert(users)
        .values({
          id: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.email!.split('@')[0],
          role: 'member',
          credits: 3
        })
        .returning();
      
      return newUser;
    } catch (error) {
      console.error('Error creating user in database:', error);
      // Don't return a fallback user object - if creation fails, return null
      // This prevents foreign key constraint violations
      return null;
    }
  }

  return dbUser;
  
  /* Original implementation - commented out during Supabase migration
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
  */
}

// Activity logs removed - using Supabase auth events instead

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

export async function createProject(name: string) {
  const user = await getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

      const newProject: NewProject = {
      name,
      userId: user.id,
    };

    try {
      const [project] = await db.insert(projects).values(newProject).returning();
      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
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
