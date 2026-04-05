import { toCamelCase, toSnakeCase } from './case.utils';

describe('case utils', () => {
  it('converts camelCase keys to snake_case without changing values', () => {
    const nested = { keepAsIs: true };

    expect(
      toSnakeCase({
        fullName: 'Anna Smith',
        dealValue: 120000,
        nestedData: nested,
      })
    ).toEqual({
      full_name: 'Anna Smith',
      deal_value: 120000,
      nested_data: nested,
    });
  });

  it('converts snake_case keys to camelCase', () => {
    expect(
      toCamelCase({
        full_name: 'Anna Smith',
        deal_value: 120000,
        first_contact_date: '2026-04-05',
      })
    ).toEqual({
      fullName: 'Anna Smith',
      dealValue: 120000,
      firstContactDate: '2026-04-05',
    });
  });
});
