import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from '@/features/auth/components/login-page';
import { DashboardLayout } from '@/layouts/dashboard-layout';
import { ProtectedRoute } from '@/shared/components/protected-route';
import OrganizationsPage from '@/features/organizations/components/organizations-page';
import CampaignsPage from '@/features/campaigns/components/campaigns-page';
import PostsPage from '@/features/posts/components/posts-page';
import PostDetailPage from '@/features/posts/components/post-detail-page';
import TeamPage from '@/features/team/components/team-page';
import { AdminDashboardPage } from '@/features/dashboard/components/admin-dashboard-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/organizations" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'organizations',
        element: <OrganizationsPage />,
      },
      {
        path: 'organizations/:id/campaigns',
        element: <CampaignsPage />,
      },
      {
        path: 'organizations/:orgId/campaigns/:id/posts',
        element: <PostsPage />,
      },
      {
        path: 'organizations/:orgId/campaigns/:campId/posts/:postId',
        element: <PostDetailPage />,
      },
      {
        path: 'team',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <TeamPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        ),
      }
    ],
  },
  // Fallback para 404
  {
    path: '*',
    element: <div className="p-8 text-center text-zinc-500">404 - Página não encontrada</div>,
  },
]);
