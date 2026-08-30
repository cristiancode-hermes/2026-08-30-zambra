import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { API, AuthUser, TOKEN_KEY } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly user = signal<AuthUser | null>(null);
  readonly ready = signal(false);
  private readyResolve!: () => void;
  readonly readyWait = new Promise<void>((r) => {
    this.readyResolve = r;
  });

  constructor() {
    const token = this.getToken();
    if (token) {
      queueMicrotask(() => {
        this.loadProfile().catch(() => this.logout(false));
      });
    } else {
      this.markReady();
    }
  }

  private markReady() {
    this.ready.set(true);
    this.readyResolve();
  }

  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  isStaff(): boolean {
    return this.user()?.role === 'staff';
  }

  async loadProfile() {
    try {
      const res = await firstValueFrom(this.http.get<{ user: AuthUser }>(`${API}/auth/me`));
      this.user.set(res.user);
    } finally {
      this.markReady();
    }
  }

  async login(identifier: string, password: string) {
    const res = await firstValueFrom(
      this.http.post<{ token?: string; accessToken?: string; user: AuthUser }>(`${API}/auth/login`, {
        identifier,
        password,
      }),
    );
    const token = res.token || res.accessToken;
    if (!token) throw new Error('Sin token');
    localStorage.setItem(TOKEN_KEY, token);
    this.user.set(res.user);
    return res.user;
  }

  async register(username: string, email: string, password: string) {
    const res = await firstValueFrom(
      this.http.post<{ token?: string; accessToken?: string; user: AuthUser }>(`${API}/auth/register`, {
        username,
        email,
        password,
      }),
    );
    const token = res.token || res.accessToken;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    this.user.set(res.user);
    return res.user;
  }

  logout(redirect = true) {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    this.user.set(null);
    if (redirect) void this.router.navigateByUrl('/login');
  }
}
