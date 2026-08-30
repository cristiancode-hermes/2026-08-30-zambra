import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Addon, API, OrderView, SELECT_KEY, ShowCard, ShowDetail, Zone } from '../shared/models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  listShows() {
    return firstValueFrom(this.http.get<ShowCard[]>(`${API}/shows`));
  }

  show(id: string) {
    return firstValueFrom(this.http.get<ShowDetail>(`${API}/shows/${id}`));
  }

  zones() {
    return firstValueFrom(this.http.get<Zone[]>(`${API}/zones`));
  }

  addons() {
    return firstValueFrom(this.http.get<Addon[]>(`${API}/addons`));
  }

  checkout(body: { showId: string; seatIds: string[]; addonIds: string[] }) {
    return firstValueFrom(this.http.post<OrderView>(`${API}/orders/checkout`, body));
  }

  mine() {
    return firstValueFrom(this.http.get<OrderView[]>(`${API}/orders`));
  }

  byCode(code: string) {
    return firstValueFrom(this.http.get<OrderView>(`${API}/orders/${code}`));
  }

  publicTicket(code: string) {
    return firstValueFrom(this.http.get<OrderView>(`${API}/orders/public/${code}`));
  }

  cancel(id: string) {
    return firstValueFrom(this.http.post<OrderView>(`${API}/orders/${id}/cancel`, {}));
  }

  scan(codeOrUrl: string) {
    return firstValueFrom(
      this.http.post<{ order: OrderView; status: string }>(`${API}/staff/scan`, { codeOrUrl }),
    );
  }

  occupancy() {
    return firstValueFrom(
      this.http.get<Array<{ showId: string; title: string; palo: string; date: string; free: number; total: number; pct: number }>>(
        `${API}/stats/occupancy`,
      ),
    );
  }

  myPoints() {
    return firstValueFrom(this.http.get<{ points: number; usedSeats: number }>(`${API}/stats/me`));
  }

  reviews(showId: string) {
    return firstValueFrom(
      this.http.get<Array<{ id: string; rating: number; body: string | null; createdAt: string }>>(
        `${API}/reviews/show/${showId}`,
      ),
    );
  }

  addReview(showId: string, rating: number, body: string) {
    return firstValueFrom(this.http.post(`${API}/reviews`, { showId, rating, body }));
  }

  saveSelection(showId: string, seatIds: string[]) {
    sessionStorage.setItem(SELECT_KEY, JSON.stringify({ showId, seatIds }));
  }

  readSelection(): { showId: string; seatIds: string[] } | null {
    try {
      const raw = sessionStorage.getItem(SELECT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
