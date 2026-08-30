import { Component, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { ApiService } from '../core/api.service';

@Component({
  selector: 'app-account',
  template: `
    <main class="page wrap">
      <h1>Cuenta</h1>
      @if (auth.user(); as u) {
        <p>{{ u.displayName || u.username }}</p>
        <p class="muted">{{ u.email }} · {{ u.role }}</p>
      }
      @if (pts(); as p) {
        <p><strong>{{ p.points }}</strong> puntos de tablao ({{ p.usedSeats }} sillas usadas × 10).</p>
      }
    </main>
  `,
})
export class AccountPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  readonly pts = signal<{ points: number; usedSeats: number } | null>(null);

  ngOnInit() {
    this.api.myPoints().then((p) => this.pts.set(p)).catch(() => this.pts.set({ points: 0, usedSeats: 0 }));
  }
}
