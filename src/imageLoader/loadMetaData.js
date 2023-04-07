import { getFetch } from './getFetch';

const loadMetaDataInternal = async (datastoreId, collectionId, config) => {
    const uri = config.endpoint + '/runtime/datastore/' + datastoreId + '/imageset?imageSetId=' + collectionId
    const startTime = performance.now();
    const response = await getFetch(config)(uri)
    performance.measure(
        "healthlake-metadata-load", {
            start: startTime,
            end: performance.now(),
        }
    );

    const json = await response.json();
    config.collections[json.ImageSetID] = json
    return json
}

export default loadMetaDataInternal;
