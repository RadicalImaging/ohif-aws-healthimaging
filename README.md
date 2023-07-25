# OHIF AWS HealthImaging adapter

Note - The official name for the service is "AWS HealthImaging".  Before GA it was called "Amazon HealthLake Imaging" and several references in the code and documentation still reference this old name.  These references will be updated shortly

# Setting up

## Prerequisites
* Node.js +14
* OHIF follow the [Getting started guide if needed](https://v3-docs.ohif.org/development/getting-started/)
* Make sure you are checkout in the branch `v3-stable`
* Install ohif-healthlake package to OHIF by adding the following JSON to the 'extensions' array in platform/viewer/pluginConfig.json
```json
{
  "packageName": "ohif-healthlake",
  "version": "0.0.12"
}
```
* Create an access key in the AWS portal
* Follow AWS documentation on how to create an AWS Health Imaging Datastore and load it with DICOM data

## Configuring OHIF to talk to AHI directly

This approach is the fastest and lowest cost but requires that you use IAM Authentication

* Configure the data source 

platform/viewer/public/config/default.js
```js
  dataSources: [
    {
      friendlyName: 'AWS HealthImaging',
      namespace: 'ohif-healthlake.dataSourcesModule.healthlake',
      sourceName: 'healthlake',
      configuration: {
        name: 'AWS HealthImaging Demo',
        healthlake: {
          integrationMode: 'LocalStorage',
        },
        singlepart: "image/jphc",
      }
    },

  ],
  defaultDataSourceName: 'healthlake',
```

* Run OHIF
```bash
yarn start # in the OHIF platform/viewer folder
```

* Open the viewer.  NOTE - this should show an error message, that is expected
```
http://localhost:3000/viewers
```

* Configure parameters in browser local storage

  * Go to the browser debug window
    * Firefox - 3 bar menu->More Tools->Web Developer Tools
    * Chrome - 3 dot menu->More Tools->Developer Tools
  *. Go to local storage configuraiton
    * Firefox - Storage tab->local storage->https://localhost:3000
    * Chrome - Application tab->Local Storage->https://localhost:3000
  * Create the following keys with the appropriate values.  Note that keys are CASE SENSITIVE
    * "accessKeyID" -> AWS Access key for a user that has read access to AHI
    * "secretAccessKey" -> AWS Secret Access Key for a user that has read access to AHI
    * "datastoreId" - the datastore id you loaded DICOM data into
    * "endpoint" - the endpoint for AHI (e.g. https://runtime-medical-imaging.us-east-1.amazonaws.com)  NOTE - make sure you put the correct region the datastore resides in

* Refresh the browser tab

You should now see the study list

## Configuring OHIF to talk to AHI through a proxy

This approach can be used if you need to use non IAM based authentication (e.g. openid, jwt, etc)

* Start the proxy to secure your access keys
```bash
# AWS_HOST
docker run -p 8089:8089 -e AWS_ACCESS_KEY_ID='YOUR_KEY' -e AWS_SECRET_ACCESS_KEY='YOUR_SECRET' -e AWS_REGION='YOUR_REGION' flexview/ohif-healthlake-proxy
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
    friendlyName: 'AWS HealthImaging',
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
  defaultDataSourceName: 'healthlake',

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
git clone git@github.com:RadicalImaging/ohif-aws-healthimaging.git
cd ohif-aws-healthimaging
yarn install
# rebuild the plugin on every change
yarn watch
# start coding
yarn test # to run unit tests
```

## Description 
Support metadata and imaging data loading from AWS HealthImaging

## Known Issues
* StudyList does not support querying on the following fields: Patient Name, Study Date, Description, Modality

## FAQ
## Why do we need the proxy server?
* You should never expose your AWS keys to the client. We created this tiny proxy with the only purpose of hiding the AWS keys in the backend.
* The Proxy server available here is meant to be for development only. In actual use cases, we encourage you to implement authentication on top of the proxy so you secure access to your data.


## Authors 
Bill Wallace, Mateus Freira, Radical Imaging, Chris Hafey

## License 
MIT

