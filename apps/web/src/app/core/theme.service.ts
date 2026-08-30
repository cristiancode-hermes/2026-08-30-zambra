import { Injectable } from '@angular/core';
import { THEME_KEY } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  constructor() {
    this.apply(this.read());
  }

  read(): 'light' | 'dark' {
    try {
      const v = localStorage.getItem(THEME_KEY);
      if (v === 'dark' || v === 'light') return v;
    } catch {
      /* ignore */
    }
    return 'light';
  }

  toggle() {
    const next = this.read() === 'dark' ? 'light' : 'dark';
    this.apply(next);
  }

  apply(mode: 'light' | 'dark') {
    document.documentElement.setAttribute('data-theme', mode);
    try {
      localStorage.setItem(THEME_KEY, mode);
    } catch {
      /* ignore */
    }
  }
}
