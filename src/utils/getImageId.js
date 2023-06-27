import getWADORSImageId from './getWADORSImageId';
/**
 * Obtain an imageId for Cornerstone from an image instance
 *
 * @param instance
 * @param frame
 * @returns {string} The imageId to be used by Cornerstone
 */
export default function getImageId({
  instance,
  frame,
  config,
  extraParameters,
}) {
  if (!instance) {
    return;
  }

  if (instance.url) {
    return instance.url;
  }


  return getWADORSImageId(instance, config, frame, extraParameters); // WADO-RS Retrieve Frame
}
