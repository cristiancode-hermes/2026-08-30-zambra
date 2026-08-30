import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-split">
      <div class="auth-visual" aria-hidden="true">
        <img src="/assets/login-cover.svg" alt="" />
        <div class="auth-visual-overlay">
          <p class="hero-kicker">Zambra</p>
          <h1>La silla se paga. El umbral espera.</h1>
          <p>Tablao en cueva. Un pase, un mapa, un QR.</p>
        </div>
      </div>
      <div class="auth-form-side">
        <form class="auth-form" (ngSubmit)="submit()" autocomplete="off">
          <h2>Entrar</h2>
          <p class="muted">Username o email. La sesión aguanta el recargo de página.</p>
          <label class="field">
            Username o email
            <input
              name="identifier"
              type="text"
              autocomplete="off"
              [ngModel]="identifier()"
              (ngModelChange)="identifier.set($event)"
            />
          </label>
          <label class="field">
            Contraseña
            <input
              name="password"
              type="password"
              autocomplete="new-password"
              [ngModel]="password()"
              (ngModelChange)="password.set($event)"
            />
          </label>
          @if (error()) {
            <p class="cta-error" id="login-action">{{ error() }}</p>
          }
          <button class="btn btn-primary" type="submit" [disabled]="loading()">
            {{ loading() ? 'Entrando…' : 'Entrar' }}
          </button>
          <p style="margin-top:12px">¿Primera noche? <a routerLink="/registro">Regístrate</a></p>
          <div class="auth-demo">
            <strong>Cuenta de prueba con datos</strong><br />
            Cliente: <code>demo@zambra.dev</code> · <code>demo1234</code><br />
            Umbral: <code>staff@zambra.dev</code> · <code>demo1234</code>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class LoginPage {
  public auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly identifier = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  async submit() {
    if (!this.identifier() || !this.password()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.identifier(), this.password());
      const ret = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
      await this.router.navigateByUrl(ret);
    } catch (e) {
      this.error.set('Usuario o contraseña no coinciden.');
    } finally {
      this.loading.set(false);
    }
  }
}
