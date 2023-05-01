import loadMetaDataInternal from './loadMetaData';
import awsCredentials from './awsCredentials';

jest.mock('aws4fetch', () => ({
  AwsClient: jest.fn().mockImplementation(() => ({
    fetch: jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({
        ImageSetID: 'test-collection-id'
      })
    })
  }))
}));

jest.mock('./awsCredentials', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret'
  }))
}));

describe('loadMetaDataInternal', () => {
  const config = {
    endpoint: 'https://flexview.ai',
    awsAccessKeyID: 'test-access-key',
    collections: {}
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fetches metadata and stores in config', async () => {
    const datastoreId = 'test-datastore-id';
    const collectionId = 'test-collection-id';

    const result = await loadMetaDataInternal(datastoreId, collectionId, config);

    expect(result).toEqual({
      ImageSetID: 'test-collection-id'
    });

    expect(config.collections[collectionId]).toEqual({
      ImageSetID: 'test-collection-id'
    });

    expect(awsCredentials).toHaveBeenCalledWith(config);
  });
});
