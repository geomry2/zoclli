import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-password-gate',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './password-gate.html',
  styleUrl: './password-gate.scss',
})
export class PasswordGate {
  readonly auth = inject(AuthService);
  readonly login = signal('george');
  readonly password = signal('');
  readonly error = signal<string | null>(null);

  async submit() {
    const result = await this.auth.signIn(this.login(), this.password());
    if (result.error) {
      this.error.set(result.error);
      this.password.set('');
      return;
    }

    this.error.set(null);
  }

  onKey(event: KeyboardEvent) {
    if (event.key === 'Enter') void this.submit();
  }
}
