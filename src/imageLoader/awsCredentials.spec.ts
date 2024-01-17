import awsCredentials from "./awsCredentials";

describe('awsCredentials', () => {
  const config = {
    awsSecretAccessKey: 'test-secret',
    awsAccessKeyID: 'test-access-key'
  };

  beforeEach(() => {
    delete window.healthimaging;
    window.localStorage.removeItem('healthimaging');
  });

  test('returns credentials from healthimaging object if present', () => {
    const healthimaging = {
      awsSecretAccessKey: 'healthimaging-secret',
      awsAccessKeyID: 'healthimaging-access-key'
    };
    window.healthimaging = healthimaging;

    const result = awsCredentials(config);

    expect(result).toEqual({
      secretAccessKey: healthimaging.awsSecretAccessKey,
      accessKeyId: healthimaging.awsAccessKeyID,
      service: "medical-imaging"
    });
  });

  test('returns credentials from config if healthimaging object is not present', () => {
    const result = awsCredentials(config);

    expect(result).toEqual({
      secretAccessKey: config.awsSecretAccessKey,
      accessKeyId: config.awsAccessKeyID,
      service: "medical-imaging"
    });
  });

  test('returns credentials from parsed local storage if healthimaging object is not present', () => {
    const healthimaging = {
      awsSecretAccessKey: 'healthimaging-secret',
      awsAccessKeyID: 'healthimaging-access-key'
    };
    window.localStorage.setItem('healthimaging', JSON.stringify(healthimaging));

    const result = awsCredentials(config);

    expect(result).toEqual({
      secretAccessKey: healthimaging.awsSecretAccessKey,
      accessKeyId: healthimaging.awsAccessKeyID,
      service: "medical-imaging"
    });
  });
});

