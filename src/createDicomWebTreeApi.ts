import {
  DicomMetadataStore,
  IWebApiDataSource,
  utils,
  errorHandler,
  classes,
} from '@ohif/core';
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';

import { AwsV4Signer } from 'aws4fetch';

import { mapParams, search as qidoSearch, processResults } from './qido.js';

import getImageId from './utils/getImageId';
import dcmjs from 'dcmjs';

import {
  retrieveStudyMetadataTree,
  deleteStudyMetadataTreePromise,
  naturalizeMetadataTree,
} from './retrieveStudyMetadataTree';

import DicomTreeClient from './utils/DicomTreeClient';
import awsCredentials from './imageLoader/awsCredentials';

const { DicomMetaDictionary, DicomDict } = dcmjs.data;

const { denaturalizeDataset } = DicomMetaDictionary;

const ImplementationClassUID = '2.25.37069599682585517994988158784759291.1.0.0';
const ImplementationVersionName = 'OHIF-VIEWER-Tree-Metadata-1.0.0';
const EXPLICIT_VR_LITTLE_ENDIAN = '1.2.840.10008.1.2.1';

const metadataProvider = classes.MetadataProvider;

const retrievedStudies = {};

const initializeHealthlakeFetch = (healthlake) => {
  if( !healthlake.endpoint ) throw new Error('endpoint is mandatory');
  cornerstoneDICOMImageLoader.configure({
    open: function (xhr: any, url: string) {
      const urlParams = new URLSearchParams(url);
      const datastoreId = urlParams.get('DatastoreID');
      const collectionId = urlParams.get('ImageSetID');
      const imageFrameId = urlParams.get('frameID');
      const isAwsHealthImagingRequest = urlParams.get('healthlake');
      if(!isAwsHealthImagingRequest) {
        return xhr.open('get', url, true);
      }
      const uri =
        healthlake.endpoint +
        '/datastore/' +
        datastoreId +
        '/imageSet/' +
        collectionId +
        '/getImageFrame';


      const body = JSON.stringify({
        "imageFrameId" : imageFrameId
      });

      const signer = healthlake.awsAccessKeyID ? new AwsV4Signer({
        ...awsCredentials(healthlake),
        service: 'medical-imaging',
        url: uri,
        method: 'POST',
        body,
      }) : null;


      xhr.open('POST', uri, true);
      xhr.wasGetResponseHeader = xhr.getResponseHeader;
      xhr.getResponseHeader = function (key: string) {
        if (key == 'Content-Type') return 'image/jphc';
        return this.wasGetResponseHeader(key);
      };

      xhr.wasSend = xhr.send;
      xhr.send = () => {
        if (signer) {
          signer.sign().then(({headers}) => {
            xhr.setRequestHeader('x-amz-date', headers.get('x-amz-date'));
            xhr.setRequestHeader('Authorization', headers.get('Authorization'));
            xhr.wasSend(body);
          });
        } else {
          xhr.wasSend(body);
        }
      }
    },
  });
};

/**
 *
 * @param {string} name - Data source name
 * @param {string} wadoUriRoot - Legacy? (potentially unused/replaced)
 * @param {string} qidoRoot - Base URL to use for QIDO requests
 * @param {string} wadoRoot - Base URL to use for WADO requests
 * @param {boolean} qidoSupportsIncludeField - Whether QIDO supports the "Include" option to request additional fields in response
 * @param {string} imageRengering - wadors | ? (unsure of where/how this is used)
 * @param {string} thumbnailRendering - wadors | ? (unsure of where/how this is used)
 * @param {bool} supportsReject - Whether the server supports reject calls (i.e. DCM4CHEE)
 * @param {bool} lazyLoadStudy - "enableStudyLazyLoad"; Request series meta async instead of blocking
 * @param {string|bool} singlepart - indicates of the retrieves can fetch singlepart.  Options are bulkdata, video, image or boolean true
 */
function createDicomWebTreeApi(dicomWebConfig, UserAuthenticationService) {
  const {
    qidoRoot,
    wadoRoot,
    supportsFuzzyMatching,
    supportsWildcard,
    staticWado,
    singlepart,
    healthlake,
  } = dicomWebConfig;

  const qidoConfig = {
    url: qidoRoot,
    staticWado,
    healthlake,
    singlepart,
    headers: UserAuthenticationService.getAuthorizationHeader(),
    errorInterceptor: errorHandler.getHTTPErrorHandler(),
  };

  const wadoConfig = {
    url: wadoRoot,
    singlepart,
    staticWado,
    healthlake,
    headers: UserAuthenticationService.getAuthorizationHeader(),
    errorInterceptor: errorHandler.getHTTPErrorHandler(),
  };

  // TODO -> Two clients sucks, but its better than 1000.
  // TODO -> We'll need to merge auth later.
  const qidoDicomWebClient = new DicomTreeClient(qidoConfig);
  const wadoDicomWebClient = new DicomTreeClient(wadoConfig);

  initializeHealthlakeFetch(qidoDicomWebClient.healthlake);

  const implementation = {
    initialize: ({ params, query }) => {
      const { StudyInstanceUIDs: paramsStudyInstanceUIDs } = params;
      const queryStudyInstanceUIDs = query.get('StudyInstanceUIDs');

      const StudyInstanceUIDs =
        queryStudyInstanceUIDs || paramsStudyInstanceUIDs;
      const StudyInstanceUIDsAsArray =
        StudyInstanceUIDs && Array.isArray(StudyInstanceUIDs)
        ? StudyInstanceUIDs
        : [StudyInstanceUIDs];
      return StudyInstanceUIDsAsArray;
    },
    query: {
      studies: {
        mapParams: mapParams.bind(),
        search: async function (origParams) {
          const headers = UserAuthenticationService.getAuthorizationHeader();
          if (headers) {
            qidoDicomWebClient.headers = headers;
          }

          const { studyInstanceUid, seriesInstanceUid, ...mappedParams } =
            mapParams(origParams, {
              supportsFuzzyMatching,
              supportsWildcard,
            }) || {};
          if (window.healthlake && window.healthlake.ImageSetID) {
            // Todo implement image set id search
            const { ImageSetID, datastoreID } = window.healthlake;
            const tree = await implementation._retrieveSeriesMetadataDeduplicated(
              ImageSetID
            );
            const instance = tree[0];
            return [
              {
                studyInstanceUid: instance.StudyInstanceUID,
                date: instance.StudyDate, // YYYYMMDD
                time: instance.StudyTime, // HHmmss.SSS (24-hour, minutes, seconds, fractional seconds)
                accession: instance.AccessionNumber || '', // short string, probably a number?
                mrn: instance.PatientID || '', // medicalRecordNumber
                patientName: instance.PatientName || '',
                instances: tree.length || 0, // number
                description: instance.StudyDescription || '',
                modalities: instance.Modality || '',
              },
            ];
          }

          const results = await qidoSearch(
            qidoDicomWebClient,
            undefined,
            undefined,
            mappedParams
          );

          return processResults(results);
        },
        processResults: processResults.bind(),
      },

      series: {
        // mapParams: mapParams.bind(),
        search: async function (studyInstanceUid) {
          const headers = UserAuthenticationService.getAuthorizationHeader();
          if (headers) {
            qidoDicomWebClient.headers = headers;
          }

          const tree = await implementation._retrieveSeriesMetadataDeduplicated(
            studyInstanceUid
          );
          const seriesUids = {};
          tree.forEach(instance => {
            const { SeriesInstanceUID } = instance;
            const aSeries = seriesUids[SeriesInstanceUID];
            if (aSeries) {
              aSeries.numSeriesInstances++
              return;
            }
            seriesUids[SeriesInstanceUID] = {
              studyInstanceUid: instance.StudyInstanceUID,
              seriesInstanceUid: instance.SeriesInstanceUID,
              modality: instance.Modality,
              seriesNumber: instance.SeriesNumber,
              seriesDate: instance.SeriesDate,
              numSeriesInstances: 1,
              description: instance.SeriesDescription,
            };
          });
          return Object.values(seriesUids);
        },
        // processResults: processResults.bind(),
      },

      instances: {
        search: (studyInstanceUid, queryParameters) => {
          const headers = UserAuthenticationService.getAuthorizationHeader();
          if (headers) {
            qidoDicomWebClient.headers = headers;
          }

          qidoSearch.call(
            undefined,
            qidoDicomWebClient,
            studyInstanceUid,
            null,
            queryParameters
          );
        },
      },
    },

    retrieve: {
      /**
       * Generates a URL that can be used for direct retrieve of the bulkdata
       *
       * @param {object} params
       * @param {string} params.tag is the tag name of the URL to retrieve
       * @param {object} params.instance is the instance object that the tag is in
       * @param {string} params.defaultType is the mime type of the response
       * @param {string} params.singlepart is the type of the part to retrieve
       * @returns an absolute URL to the resource, if the absolute URL can be retrieved as singlepart,
       *    or is already retrieved, or a promise to a URL for such use if a BulkDataURI
       */
      directURL: params => {
        const {
          instance,
          tag = 'PixelData',
          defaultPath = '/pixeldata',
          defaultType = 'video/mp4',
          singlepart: fetchPart = 'video',
        } = params;
        const value = instance[tag];
        if (!value) return undefined;

        if (value.DirectRetrieveURL) return value.DirectRetrieveURL;
        if (value.InlineBinary) {
          const blob = utils.b64toBlob(value.InlineBinary, defaultType);
          value.DirectRetrieveURL = URL.createObjectURL(blob);
          return value.DirectRetrieveURL;
        }
        if (
          !singlepart ||
          (singlepart !== true && singlepart.indexOf(fetchPart) === -1)
        ) {
          if (value.retrieveBulkData) {
            return value.retrieveBulkData().then(arr => {
              value.DirectRetrieveURL = URL.createObjectURL(
                new Blob([arr], { type: defaultType })
              );
              return value.DirectRetrieveURL;
            });
          }
          console.warn('Unable to retrieve', tag, 'from', instance);
          return undefined;
        }

        const {
          StudyInstanceUID,
          SeriesInstanceUID,
          SOPInstanceUID,
        } = instance;
        const BulkDataURI =
          (value && value.BulkDataURI) ||
          `series/${SeriesInstanceUID}/instances/${SOPInstanceUID}${defaultPath}`;
        const hasQuery = BulkDataURI.indexOf('?') != -1;
        const hasAccept = BulkDataURI.indexOf('accept=') != -1;
        const acceptUri =
          BulkDataURI +
          (hasAccept ? '' : (hasQuery ? '&' : '?') + `accept=${defaultType}`);
        if (BulkDataURI.indexOf('http') === 0) return acceptUri;
        if (BulkDataURI.indexOf('/') === 0) {
          return wadoRoot + acceptUri;
        }
        if (BulkDataURI.indexOf('series/') == 0) {
          return `${wadoRoot}/studies/${StudyInstanceUID}/${acceptUri}`;
        }
        if (BulkDataURI.indexOf('instances/') === 0) {
          return `${wadoRoot}/studies/${StudyInstanceUID}/series/${SeriesInstanceUID}/${acceptUri}`;
        }
        if (BulkDataURI.indexOf('bulkdata/') === 0) {
          return `${wadoRoot}/studies/${StudyInstanceUID}/${acceptUri}`;
        }
        throw new Error('BulkDataURI in unknown format:' + BulkDataURI);
      },

      series: {
        /**
         *
         * @returns
         */
        metadata: async ({
          StudyInstanceUID,
          filters,
          sortCriteria,
          sortFunction,
          madeInClient = false,
        }) => {
          const headers = UserAuthenticationService.getAuthorizationHeader();
          if (headers) {
            wadoDicomWebClient.headers = headers;
          }

          if (!StudyInstanceUID) {
            throw new Error(
              'Unable to query for SeriesMetadata without StudyInstanceUID'
            );
          }

          const tree = await implementation._retrieveSeriesMetadataDeduplicated(
            StudyInstanceUID,
            filters,
            sortCriteria,
            sortFunction,
            madeInClient
          );
          return implementation._registerMetadataTree(StudyInstanceUID, tree);
        },
      },
    },

    store: {
      dicom: async dataset => {
        // remove 
        const headers = UserAuthenticationService.getAuthorizationHeader();
        if (headers) {
          wadoDicomWebClient.headers = headers;
        }

        const meta = {
          FileMetaInformationVersion:
          dataset._meta.FileMetaInformationVersion.Value,
          MediaStorageSOPClassUID: dataset.SOPClassUID,
          MediaStorageSOPInstanceUID: dataset.SOPInstanceUID,
          TransferSyntaxUID: EXPLICIT_VR_LITTLE_ENDIAN,
          ImplementationClassUID,
          ImplementationVersionName,
        };

        const denaturalized = denaturalizeDataset(meta);
        const dicomDict = new DicomDict(denaturalized);

        dicomDict.dict = denaturalizeDataset(dataset);

        const part10Buffer = dicomDict.write();

        const options = {
          datasets: [part10Buffer],
        };

        await wadoDicomWebClient.storeInstances(options);
      },
    },

    /**
     * Retrieves the series metadata asynchronously from the deduplicated
     * tree structure, returning it.
     */
    _retrieveSeriesMetadataDeduplicated: async StudyInstanceUID => {
      const aStudy = retrievedStudies[StudyInstanceUID];
      if (aStudy) {
        console.log('Already have study', aStudy);
        return aStudy;
      }
      try {
        // data is all SOPInstanceUIDs
        const startTime = performance.now();
        const data = await retrieveStudyMetadataTree(
          wadoDicomWebClient,
          StudyInstanceUID
        );

        const naturalizedInstancesMetadata = naturalizeMetadataTree(data);
        console.log(
          'Metadata tree has',
          naturalizedInstancesMetadata.length,
          'instances'
        );
        retrievedStudies[StudyInstanceUID] = naturalizedInstancesMetadata;
        performance.measure('healthlake:retrieve-metadatatree', {
          start: startTime,
          end: performance.now(),
        });
        return naturalizedInstancesMetadata;
      } catch (e) {
        console.warn("Couldn't read metadata tree", e);
      }
    },

    _registerMetadataTree: (StudyInstanceUID, tree) => {
      const startTime = performance.now();
      const seriesSummaryMetadata = {};
      const instancesPerSeries = {};

      tree.forEach(instance => {
        const { SeriesInstanceUID } = instance;
        if (!seriesSummaryMetadata[SeriesInstanceUID]) {
          seriesSummaryMetadata[SeriesInstanceUID] = {
            StudyInstanceUID: instance.StudyInstanceUID,
            StudyDescription: instance.StudyDescription,
            SeriesInstanceUID: instance.SeriesInstanceUID,
            SeriesDescription: instance.SeriesDescription,
            SeriesNumber: instance.SeriesNumber,
            SeriesTime: instance.SeriesTime,
            SOPClassUID: instance.SOPClassUID,
            ProtocolName: instance.ProtocolName,
            Modality: instance.Modality,
          };
        }

        if (!instancesPerSeries[SeriesInstanceUID]) {
          instancesPerSeries[SeriesInstanceUID] = [];
        }

        const imageId = implementation.getImageIdsForInstance({
          instance,
        });

        instance.imageId = imageId;

        metadataProvider.addImageIdToUIDs(imageId, {
          StudyInstanceUID,
          SeriesInstanceUID: SeriesInstanceUID,
          SOPInstanceUID: instance.SOPInstanceUID,
        });

        instancesPerSeries[SeriesInstanceUID].push(instance);
      });

      // grab all the series metadata
      const seriesMetadata = Object.values(seriesSummaryMetadata);
      DicomMetadataStore.addSeriesMetadata(seriesMetadata, false);

      Object.keys(instancesPerSeries).forEach(seriesUID =>
        DicomMetadataStore.addInstances(instancesPerSeries[seriesUID], false)
      );
      performance.measure('healthlake:convert-metadataTree', {
            start: startTime,
            end: performance.now(),
        }
      );
    },

    deleteStudyMetadataPromise: deleteStudyMetadataTreePromise,

    getImageIdsForDisplaySet(displaySet) {
      const images = displaySet.images;
      const imageIds = [];

      if (!images) {
        return imageIds;
      }

      displaySet.images.forEach(instance => {
        const numberOfFrames = instance.NumberOfFrames ? parseInt(instance.NumberOfFrames) : 0;
        if (numberOfFrames > 1) {
          for (let i = 0; i < numberOfFrames; i++) {
            const imageId = this.getImageIdsForInstance({
              instance,
              frame: i,
            });
            imageIds.push(imageId);
          }
        } else {
          const imageId = this.getImageIdsForInstance({ instance });
          imageIds.push(imageId);
        }
      });

      return imageIds;
    },

    getImageIdsForInstance({ instance, frame = 0 }) {
      const { DatastoreID, ImageFrames, ImageSetID } = instance;
      const frameID = ImageFrames?.[frame]?.ID;
      const healthlakeParam = qidoDicomWebClient.healthlake?.images ? "true" : "false";
      const extraParameters =
        (DatastoreID && {
          DatastoreID,
          frameID,
          ImageSetID,
          healthlake: healthlakeParam,
        }) ||
        undefined;
      const imageIds = getImageId({
        instance,
        frame,
        config: dicomWebConfig,
        extraParameters,
      });
      return imageIds;
    },
    getStudyInstanceUIDs({ params, query }: { params: any; query: any}) {
      const { StudyInstanceUIDs: paramsStudyInstanceUIDs } = params;
      const queryStudyInstanceUIDs = utils.splitComma(
        query.getAll('StudyInstanceUIDs')
      );

      const StudyInstanceUIDs =
        (queryStudyInstanceUIDs.length && queryStudyInstanceUIDs) ||
        paramsStudyInstanceUIDs;
      const StudyInstanceUIDsAsArray =
        StudyInstanceUIDs && Array.isArray(StudyInstanceUIDs)
          ? StudyInstanceUIDs
          : [StudyInstanceUIDs];

      return StudyInstanceUIDsAsArray;
    },
  };

  const ret = IWebApiDataSource.create(implementation);
  return ret;
}

export default createDicomWebTreeApi;
