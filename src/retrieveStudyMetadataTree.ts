import { Types } from '@ohif/core';

import { TreeMetadata } from './Types.js';

const moduleName = 'RetrieveStudyMetadataTree';

// Cache for promises. Prevents unnecessary subsequent calls to the server
const StudyMetaDataPromises = new Map();

/**
 * Retrieves study metadata
 *
 * @param {Object} server Object with server configuration parameters
 * @param {string} StudyInstanceUID The UID of the Study to be retrieved
 * @param {boolean} enabledStudyLazyLoad Whether the study metadata should be loaded asynchronusly.
 * @param {function} storeInstancesCallback A callback used to store the retrieved instance metadata.
 * @param {Object} [filters] - Object containing filters to be applied on retrieve metadata process
 * @param {string} [filter.seriesInstanceUID] - series instance uid to filter results against
 * @returns {Promise} that will be resolved with the metadata or rejected with the error
 */
export function retrieveStudyMetadataTree(
  dicomWebClient,
  studyInstanceUID: string,
): Promise<TreeMetadata> {
  // @TODO: Whenever a study metadata request has failed, its related promise will be rejected once and for all
  // and further requests for that metadata will always fail. On failure, we probably need to remove the
  // corresponding promise from the "StudyMetaDataPromises" map...

  if (!dicomWebClient) {
    throw new Error(
      `${moduleName}: Required 'dicomWebClient' parameter not provided.`
    );
  }
  if (!studyInstanceUID) {
    throw new Error(
      `${moduleName}: Required 'studyInstanceUID' parameter not provided.`
    );
  }

  // Already waiting on result? Return cached promise
  if (StudyMetaDataPromises.has(studyInstanceUID)) {
    return StudyMetaDataPromises.get(studyInstanceUID);
  }

  // Create a promise to handle the data retrieval
  const promise = dicomWebClient.retrieveMetadataTree({ studyInstanceUID });

  // Store the promise in cache
  StudyMetaDataPromises.set(studyInstanceUID, promise);

  return promise;
}

/**
 * Delete the cached study metadata retrieval promise to ensure that the browser will
 * re-retrieve the study metadata when it is next requested
 *
 * @param StudyInstanceUID The UID of the Study to be removed from cache
 */
export function deleteStudyMetadataTreePromise(studyInstanceUID:string) {
  if (StudyMetaDataPromises.has(studyInstanceUID)) {
    StudyMetaDataPromises.delete(studyInstanceUID);
  }
}

/**
 * Naturalize the metadata tree.  Produces a set of combined objects which look like
 * the dcmjs naturalize output, except generated from the tree object
 * @param {*} data
 */
export function naturalizeMetadataTree(data:TreeMetadata): Types.InstanceMetadata[] {
  const { DICOM: patient } = data.Patient;
  const { DICOM: study, Series } = data.Study;
  const { ImageSetID, DatastoreID } = data;
  const ret: Record<string, unknown>[] = [];
  for (const seriesUID of Object.keys(Series)) {
    const aSeries = Series[seriesUID];
    const { DICOM: seriesDicom, Instances } = aSeries;
    for (const sopUID of Object.keys(Instances)) {
      try {
        const { DICOM: instanceDicom, ImageFrames, ImageSetID: InstanceImageSetID } = Instances[sopUID];
        // Items are listed in decreasing priority, so make the new object first so it can be updated without
        // touching instanceDicom
        const instance = Object.assign({ ImageSetID: InstanceImageSetID || ImageSetID, DatastoreID, ImageFrames }, instanceDicom, seriesDicom, study, patient);
        ret.push(instance);
      } catch (reason) {
        console.log("Couldn't add", sopUID, reason);
      }
    }
  }
  return ret;
}
