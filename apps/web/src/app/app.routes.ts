import { Routes } from '@angular/router';
import { authGuard, staffGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'entrar',
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/register.page').then((m) => m.RegisterPage),
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
      { path: 'pases', loadComponent: () => import('./pages/shows.page').then((m) => m.ShowsPage) },
      {
        path: 'pases/:id',
        loadComponent: () => import('./pages/show-detail.page').then((m) => m.ShowDetailPage),
      },
      {
        path: 'checkout',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/checkout.page').then((m) => m.CheckoutPage),
      },
      {
        path: 'confirmacion/:code',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/confirm.page').then((m) => m.ConfirmPage),
      },
      {
        path: 'entrada/:code',
        loadComponent: () => import('./pages/public-ticket.page').then((m) => m.PublicTicketPage),
      },
      {
        path: 'mis-entradas',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/tickets.page').then((m) => m.TicketsPage),
      },
      {
        path: 'mis-entradas/:code',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/ticket-detail.page').then((m) => m.TicketDetailPage),
      },
      {
        path: 'staff',
        canActivate: [staffGuard],
        loadComponent: () => import('./pages/staff.page').then((m) => m.StaffPage),
      },
      {
        path: 'admin',
        canActivate: [staffGuard],
        loadComponent: () => import('./pages/admin.page').then((m) => m.AdminPage),
      },
      {
        path: 'cuenta',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/account.page').then((m) => m.AccountPage),
      },
      {
        path: '**',
        loadComponent: () => import('./pages/not-found.page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
