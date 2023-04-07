function buildInstanceWadoRsUri(instance, config) {
  const { StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID } = instance;
  return `${config.wadoRoot}/studies/${StudyInstanceUID}/series/${SeriesInstanceUID}/instances/${SOPInstanceUID}`;
}
/**
 *
 * @returns query parameters for request
 */
 const buildQueryParams = (instance, config, extraParameters) => {
  const { singlepart = '' } = config;
  let ret = '';
  if (singlepart.indexOf('image') !== -1) {
    ret = `?accept=image/jphc`;
  }
  if( extraParameters ) {
    for(const key of Object.keys(extraParameters)) {
      ret = `${ret}${ret.length ? '&' : '?'}${key}=${extraParameters[key]}`;
    }
  }
  return ret;
};

function buildInstanceFrameWadoRsUri(instance, config, frame, extraParameters) {
  const baseWadoRsUri = buildInstanceWadoRsUri(instance, config);

  frame = frame || 1;

  const query = buildQueryParams(instance, config, extraParameters);

  return `${baseWadoRsUri}/frames/${frame}${query}`;
}

/**
 * Obtain an imageId for Cornerstone based on the WADO-RS scheme
 *
 * @param {object} instanceMetada metadata object (InstanceMetadata)
 * @param {(string\|number)} [frame] the frame number
 * @returns {string} The imageId to be used by Cornerstone
 */
export default function getWADORSImageId(instance, config, frame, extraParameters) {
  const uri = buildInstanceFrameWadoRsUri(instance, config, frame, extraParameters);
  if (!uri) {
    return;
  }
  return `wadors:${uri}`;
}
