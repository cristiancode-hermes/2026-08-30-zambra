import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-split">
      <div class="auth-visual" aria-hidden="true">
        <img src="/assets/login-cover.svg" alt="" />
        <div class="auth-visual-overlay">
          <p class="hero-kicker">Zambra</p>
          <h1>Una mesa junto al cante.</h1>
        </div>
      </div>
      <div class="auth-form-side">
        <form class="auth-form" (ngSubmit)="submit()" autocomplete="off">
          <h2>Registro</h2>
          <label class="field">Username
            <input name="username" autocomplete="off" [ngModel]="username()" (ngModelChange)="username.set($event)" />
          </label>
          <label class="field">Email
            <input name="email" type="email" autocomplete="off" [ngModel]="email()" (ngModelChange)="email.set($event)" />
          </label>
          <label class="field">Contraseña
            <input name="password" type="password" autocomplete="new-password" [ngModel]="password()" (ngModelChange)="password.set($event)" />
          </label>
          @if (error()) { <p class="cta-error">{{ error() }}</p> }
          <button class="btn btn-primary" type="submit" [disabled]="loading()">Crear cuenta</button>
          <p style="margin-top:12px">¿Ya tienes mesa? <a routerLink="/login">Entrar</a></p>
        </form>
      </div>
    </div>
  `,
})
export class RegisterPage {
  public auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly username = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal('');

  async submit() {
    if (!this.username() || !this.email() || this.password().length < 8) {
      this.error.set('Completa usuario, email y una contraseña de 8 caracteres.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.register(this.username(), this.email(), this.password());
      await this.router.navigateByUrl('/');
    } catch {
      this.error.set('No se pudo registrar. Prueba otro username o email.');
    } finally {
      this.loading.set(false);
    }
  }
}
