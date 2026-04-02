import { Component, output } from '@angular/core';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss'
})
export class SearchBar {
  readonly queryChange = output<string>();

  onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.queryChange.emit(value);
  }
}
