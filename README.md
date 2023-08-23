# OHIF AWS HealthImaging adapter

Note - The official name for the service is "AWS HealthImaging".  Before GA it was called "Amazon HealthLake Imaging" and several references in the code and documentation still reference this old name.  These references will be updated shortly

# Setting up

## Prerequisites
* Node.js +14
* OHIF follow the [Getting started guide if needed](https://v3-docs.ohif.org/development/getting-started/)
* Make sure you are in the OHIF branch `release`
  > git checkout -b release
* Add the ohif-healthlake package to OHIF by adding the following JSON to the 'extensions' array in platform/viewer/pluginConfig.json
```json
{
  "packageName": "ohif-healthlake",
  "version": "0.0.12"
}
```
* Create a symbolic link from OHIF extensions to this directory
  > ln -s ~/src/ohif-healthlake ~/src/viewers/extensions
* Follow AWS documentation on how to create an AWS HealthImaging Datastore and load it with DICOM data
* Create an access key in the AWS portal with access to at least the following AHI APIs on the created datastore: SearchImageSets, GetImageSetMetadata, GetImageFrame

## Configuring LocalStorage Integration Mode

This approach simplifies demos and development but requires that you store AWS secrets in browser local storage.

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
        singlepart: 'image/jphc',
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

## Configuring Proxy Integration Mode

This approach uses a proxy which can be deployed locally for testing or in AWS for production (e.g. ECS, EKS).  The proxy enables non IAM authentication mechanisms (e.g. JWT, OpenID)
for easier integration with exisiting applications.

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

## Deploying your build to AWS CloudFront
* [Build OHIF](https://docs.ohif.org/deployment/build-for-production/)
* Create an S3 bucket and upload the OHIF build output (from Viewers/platform/viewer/dist)
  * Do not enable "Static website hosting"
  * Do not disable "Block Public Access"
* Create a CloudFront distribution for the bucket
  * Set Origin Access to "Origin Access Control"
  * Add a behavior with the following properties
    * Create Response header policy with the following headers
      * Cross-Origin-Opener-Policy : same-origin
      * Cache-Control : no-cache
      * Cross-Origin-Embedder-Policy : require-corp
  * Add an error page response
    * HTTP error code: 403
    * Response page path:  /index.html
    * HTTP response code: 200:OK and returns 200:OK
* Create bucket policy that grants read access to your CloudFront distribution: [Giving the origin access control permission to access the S3 bucket](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)

# TODO
* Add CDK for creating s3 bucket/cloudfront distribution
* Add integration mode that supports [temporary security credentials](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_request.html)
* Add configuration page for LocalStorage integration mode
* Refactor code
* Add more unit tests
* Extend proxy server with some form of non IAM authentication (OpenID or JWT based)

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
