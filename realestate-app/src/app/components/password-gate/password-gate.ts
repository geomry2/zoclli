import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

const SESSION_KEY = 'app_auth';

@Component({
  selector: 'app-password-gate',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './password-gate.html',
  styleUrl: './password-gate.scss',
})
export class PasswordGate {
  readonly authenticated = signal(this.checkSession());
  readonly input = signal('');
  readonly error = signal(false);

  private checkSession(): boolean {
    return sessionStorage.getItem(SESSION_KEY) === 'ok';
  }

  submit() {
    if (this.input() === environment.appPassword) {
      sessionStorage.setItem(SESSION_KEY, 'ok');
      this.authenticated.set(true);
      this.error.set(false);
    } else {
      this.error.set(true);
      this.input.set('');
    }
  }

  onKey(event: KeyboardEvent) {
    if (event.key === 'Enter') this.submit();
  }
}
