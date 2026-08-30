import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="site-header">
      <a routerLink="/" class="brand">Zambra</a>
      <nav class="nav-links" aria-label="Principal">
        <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">Cartelera</a>
        <a routerLink="/pases" routerLinkActive="on">Pases</a>
        @if (auth.user()) {
          <a routerLink="/mis-entradas" routerLinkActive="on">Mis entradas</a>
          <a routerLink="/cuenta" routerLinkActive="on">Cuenta</a>
        }
        @if (auth.isStaff()) {
          <a routerLink="/staff" routerLinkActive="on">Umbral</a>
          <a routerLink="/admin" routerLinkActive="on">Ocupación</a>
        }
      </nav>
      <div class="nav-actions">
        <button type="button" class="theme-toggle" (click)="theme.toggle()" [attr.aria-label]="theme.read() === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'">
          @if (theme.read() === 'dark') { <span aria-hidden="true">☀</span> } @else { <span aria-hidden="true">☾</span> }
        </button>
        @if (auth.user(); as u) {
          <button type="button" class="btn btn-ghost" (click)="auth.logout()">Salir</button>
        } @else {
          <a class="btn btn-primary" routerLink="/login">Entrar</a>
        }
      </div>
    </header>
    <router-outlet />
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
}
