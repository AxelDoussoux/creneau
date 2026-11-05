import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'salles' },
  {
    path: 'connexion',
    title: 'Connexion · Créneau',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'salles',
    title: 'Trouver une salle · Créneau',
    canActivate: [authGuard],
    loadComponent: () => import('./features/rooms.page').then((m) => m.RoomsPage),
  },
  {
    path: 'salles/:id',
    title: 'Réserver · Créneau',
    canActivate: [authGuard],
    loadComponent: () => import('./features/room-detail.page').then((m) => m.RoomDetailPage),
  },
  {
    path: 'mes-reservations',
    title: 'Mes réservations · Créneau',
    canActivate: [authGuard],
    loadComponent: () => import('./features/my-bookings.page').then((m) => m.MyBookingsPage),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'salles' },
      {
        path: 'salles',
        title: 'Gérer les salles · Créneau',
        loadComponent: () => import('./features/admin-rooms.page').then((m) => m.AdminRoomsPage),
      },
      {
        path: 'planning',
        title: 'Planning global · Créneau',
        loadComponent: () =>
          import('./features/admin-bookings.page').then((m) => m.AdminBookingsPage),
      },
    ],
  },
  { path: '**', redirectTo: 'salles' },
];
