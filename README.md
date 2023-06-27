# OHIF healthlake adapter

# Setting up

## Prerequisites
* Node.js +14
* OHIF follow the [Getting started guide if needed](https://v3-docs.ohif.org/development/getting-started/)
* Make sure you are checkout in the branch `v3-stable`
* Install health lake package:
* Create an access key in the AWS portal
* Follow AWS documentation on how to create a medical imaging data source
* Start the HealthLake proxy to secure your access keys
```bash
# AWS_HOST
docker run -p 8089:8089 -e AWS_ACCESS_KEY_ID='YOUR_KEY' -e AWS_SECRET_ACCESS_KEY='YOUR_SECRET' -e AWS_REGION='YOUR_REGION' mateusfreira/ohif-healthlake-proxy
```
* Add healthlake adapter as an OHIF plugin `platform/viewer/pluginConfig.json`
```json
  "extensions": [
    //....
    {
      "packageName": "ohif-healthlake",
      "version": "0.0.12"
    }
  ],

```
* Configure the data source to access healthlake via the proxy

platform/viewer/public/config/default.js
```js
  //...
  dataSources: [ {
    friendlyName: 'HealthLake Data',
    namespace: 'ohif-healthlake.dataSourcesModule.healthlake',
    sourceName: 'healthlake',
    configuration: {
      name: 'healthlake',
      healthlake: {
        datastoreID: $YOUR_DATASTORE_ID,
        endpoint: 'http://localhost:8089',// Add here the address to you proxy
      },
      singlepart: 'bulkdata,video,pdf,image/jphc',
    }
  }
  ],

```
* Run OHIF
```bash
yarn start # in the OHIF platform/viewer folder
```
* Opening your first exam
```
http://localhost:3000/viewers?StudyInstanceUIDs=$DICOMStudyUIDHere&ImageSetID=$ImageSetIDHere
```

# How to contribute
```bash
git clone git@github.com:RadicalImaging/OhiF-healthlake.git
cd OhiF-healthlake
yarn install
# rebuild the plugin on every change
yarn watch
# start coding
yarn test # to run unit tests
```

## Description 
Support metadata and imaging data loading from healthlake

## FAQ
## Why do we need the proxy server?
* You should never expose your AWS keys to the client. We created this tiny proxy with the only purpose of hiding the AWS keys in the backend.
* The Proxy server available here is meant to be for development only. In actual use cases, we encourage you to implement authentication on top of the proxy so you secure access to your data.


## Authors 
Bill Wallace, Mateus Freira, Radical Imaging 

## License 
MIT

