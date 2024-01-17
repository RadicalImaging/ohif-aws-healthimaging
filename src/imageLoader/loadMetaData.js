import { getFetch } from './getFetch';

const loadMetaDataInternal = async (datastoreId, collectionId, config) => {
    const uri = config.endpoint + '/datastore/' + datastoreId + '/imageSet/' + collectionId + '/getImageSetMetadata'
    const startTime = performance.now();
    const response = await getFetch(config)(uri, {
        method: 'POST',
    })
    performance.measure(
        "healthimaging-metadata-load", {
            start: startTime,
            end: performance.now(),
        }
    );

    const json = await response.json();
    config.collections[json.ImageSetID] = json
    return json
}

export default loadMetaDataInternal;
