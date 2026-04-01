'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  isPersonal: boolean;
  role: string;
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  switchWorkspace: (id: string) => void;
  isLoading: boolean;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

const STORAGE_KEY = 'forma_current_workspace';

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (status !== 'authenticated') {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/workspaces');
      if (!response.ok) {
        throw new Error('Failed to fetch workspaces');
      }

      const data = await response.json();
      setWorkspaces(data.workspaces || []);

      // Set current workspace from localStorage or default to personal workspace
      const storedId = localStorage.getItem(STORAGE_KEY);
      const validStoredWorkspace = data.workspaces?.find(
        (ws: Workspace) => ws.id === storedId
      );

      if (validStoredWorkspace) {
        setCurrentWorkspaceId(validStoredWorkspace.id);
      } else {
        // Default to personal workspace or first workspace
        const defaultWs =
          data.workspaces?.find((ws: Workspace) => ws.isPersonal) ||
          data.workspaces?.[0];
        if (defaultWs) {
          setCurrentWorkspaceId(defaultWs.id);
          localStorage.setItem(STORAGE_KEY, defaultWs.id);
        }
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const switchWorkspace = useCallback((id: string) => {
    const workspace = workspaces.find((ws) => ws.id === id);
    if (workspace) {
      setCurrentWorkspaceId(id);
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, [workspaces]);

  const currentWorkspace = workspaces.find((ws) => ws.id === currentWorkspaceId) || null;

  return (
    <WorkspaceContext.Provider
      value={{
        currentWorkspace,
        workspaces,
        switchWorkspace,
        isLoading,
        refreshWorkspaces: fetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
