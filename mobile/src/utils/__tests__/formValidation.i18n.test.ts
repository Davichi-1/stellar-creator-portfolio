import i18n from '../../i18n';
import { Validators } from '../formValidation';

/**
 * Localized validation messages (Issue #1387).
 *
 * `formValidation.ts` advertised "Localized error messages" while every default
 * was a hard-coded English string and the locale bundles had no validation
 * keys at all. These pin that the messages now come from the active locale and
 * follow a language change.
 */

describe('validation message localization', () => {
  afterEach(() => {
    i18n.setLocale('en');
  });

  it('uses the active locale for the default message', () => {
    i18n.setLocale('en');
    expect(Validators.required()('').error).toBe('This field is required');

    i18n.setLocale('es');
    expect(Validators.required()('').error).toBe('Este campo es obligatorio');

    i18n.setLocale('fr');
    expect(Validators.required()('').error).toBe('Ce champ est obligatoire');
  });

  it('follows a locale change made after the validator was built', () => {
    // The real failure mode: a form schema builds its validators once at
    // module load. Resolving the message eagerly would freeze whatever locale
    // happened to be active then.
    const validate = Validators.email();

    i18n.setLocale('en');
    const english = validate('nope').error;

    i18n.setLocale('de');
    const german = validate('nope').error;

    expect(english).not.toBe(german);
    expect(german).toBe('Bitte gib eine gültige E-Mail-Adresse ein');
  });

  it('interpolates bounds into the localized message', () => {
    i18n.setLocale('en');
    expect(Validators.minLength(8)('abc').error).toBe('Minimum 8 characters required');

    i18n.setLocale('es');
    expect(Validators.minLength(8)('abc').error).toBe('Se requieren al menos 8 caracteres');
  });

  it('interpolates both bounds for the range validator', () => {
    i18n.setLocale('en');
    expect(Validators.range(1, 5)('9').error).toBe('Value must be between 1 and 5');
  });

  it('lets an explicit message override the locale', () => {
    // Field-specific wording must still win, or this change would break every
    // caller that passes one.
    i18n.setLocale('fr');
    expect(Validators.required('Nom requis')('').error).toBe('Nom requis');
  });

  it('resolves a message for every validator in the active locale', () => {
    i18n.setLocale('ar');

    const cases: Array<[string, string | undefined]> = [
      ['required', Validators.required()('').error],
      ['email', Validators.email()('x').error],
      ['minLength', Validators.minLength(5)('a').error],
      ['maxLength', Validators.maxLength(2)('abcdef').error],
      ['pattern', Validators.pattern(/^z$/)('a').error],
      ['password', Validators.password()('weak').error],
      ['phone', Validators.phone()('abc').error],
      ['url', Validators.url()('not a url').error],
      ['numeric', Validators.numeric()('abc').error],
      ['range', Validators.range(1, 2)('9').error],
      ['match', Validators.match('a')('b').error],
      ['stellarAddress', Validators.stellarAddress()('nope').error],
      ['username', Validators.username()('bad name!').error],
    ];

    for (const [name, error] of cases) {
      expect(error).toBeTruthy();
      // A missing key falls back to returning the key itself, so this catches
      // a locale bundle that was never given the entry.
      expect(error).not.toBe(`validation.${name}`);
    }
  });

  it('falls back to English when a locale is missing a key', () => {
    // The i18n service falls back to the English bundle by design; this pins
    // that a partially translated locale degrades rather than showing a key.
    i18n.setLocale('ar');
    const error = Validators.required()('').error;
    expect(error).not.toContain('validation.');
  });
});
