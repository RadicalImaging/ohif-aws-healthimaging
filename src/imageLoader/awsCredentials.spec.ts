import awsCredentials from "./awsCredentials";

describe('awsCredentials', () => {
  const config = {
    awsSecretAccessKey: 'test-secret',
    awsAccessKeyID: 'test-access-key'
  };

  beforeEach(() => {
    delete window.healthlake;
    window.localStorage.removeItem('healthlake');
  });

  test('returns credentials from healthlake object if present', () => {
    const healthlake = {
      awsSecretAccessKey: 'healthlake-secret',
      awsAccessKeyID: 'healthlake-access-key'
    };
    window.healthlake = healthlake;

    const result = awsCredentials(config);

    expect(result).toEqual({
      secretAccessKey: healthlake.awsSecretAccessKey,
      accessKeyId: healthlake.awsAccessKeyID
    });
  });

  test('returns credentials from config if healthlake object is not present', () => {
    const result = awsCredentials(config);

    expect(result).toEqual({
      secretAccessKey: config.awsSecretAccessKey,
      accessKeyId: config.awsAccessKeyID
    });
  });

  test('returns credentials from parsed local storage if healthlake object is not present', () => {
    const healthlake = {
      awsSecretAccessKey: 'healthlake-secret',
      awsAccessKeyID: 'healthlake-access-key'
    };
    window.localStorage.setItem('healthlake', JSON.stringify(healthlake));

    const result = awsCredentials(config);

    expect(result).toEqual({
      secretAccessKey: healthlake.awsSecretAccessKey,
      accessKeyId: healthlake.awsAccessKeyID
    });
  });
});

