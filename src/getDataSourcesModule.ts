import createDicomWebTreeApi from './createDicomWebTreeApi';
function getDataSourcesModule() {
  return [
    {
      name: 'healthimaging',
      type: 'webApi',
      createDataSource: createDicomWebTreeApi,
    },
  ];
}

export default getDataSourcesModule;
