import createDicomWebTreeApi from './createDicomWebTreeApi';
function getDataSourcesModule() {
  return [
    {
      name: 'healthlake',
      type: 'webApi',
      createDataSource: createDicomWebTreeApi,
    },
  ];
}

export default getDataSourcesModule;
