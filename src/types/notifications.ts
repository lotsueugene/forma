/**
 * Shape returned by GET /api/notifications.
 * When you add a DB model, map Prisma rows to this (or evolve the type).
 */
export interface DashboardNotification {
  id: string;
  type: string;
  workspaceId: string | null;
  title: string;
  body: string | null;
  /** In-app navigation, e.g. /dashboard/forms/xyz/submissions */
  href: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsListResponse {
  notifications: DashboardNotification[];
  nextCursor: string | null;
  unreadCount: number;
}
