import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  it('uses english by default and interpolates params', () => {
    const service = new TranslationService();

    expect(service.lang()).toBe('en');
    expect(service.t('delete.title', { name: 'Anna' })).toBe('Delete Anna?');
  });

  it('reads and persists the selected language', () => {
    localStorage.setItem('lang', 'ru');

    const service = new TranslationService();
    service.toggle();

    expect(service.lang()).toBe('en');
    expect(localStorage.getItem('lang')).toBe('en');
  });

  it('pluralises russian counts with the simplified singular rule', () => {
    const service = new TranslationService();
    service.setLang('ru');

    expect(service.plural(1, 'prop.clients.one', 'prop.clients.many')).toBe('1 клиент');
    expect(service.plural(2, 'prop.clients.one', 'prop.clients.many')).toBe('2 клиентов');
    expect(service.plural(21, 'prop.clients.one', 'prop.clients.many')).toBe('21 клиент');
    expect(service.results(3)).toBe('3 результатов');
  });

  it('falls back to the key when a translation is missing', () => {
    const service = new TranslationService();

    expect(service.t('missing.translation')).toBe('missing.translation');
  });
});
