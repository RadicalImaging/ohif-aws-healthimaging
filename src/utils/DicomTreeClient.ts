import {
    api
} from 'dicomweb-client';
import loadMetaDataInternal from '../imageLoader/loadMetaData';
import loadImageSets from '../imageLoader/loadImageSets';


export type HealthLake = {
    collections: Record < string,
    unknown > ;
    awsAccessKeyID: string;
    awsSecretAccessKey: string;
    datastoreID ? : string;
    region ? : string;
    endpoint ? : string;
    groupSeriesBy: string;
};

/**
 * An implementation of the static wado client, that fetches data from
 * a static response rather than actually doing real queries.  This allows
 * fast encoding of test data, but because it is static, anything actually
 * performing searches doesn't work.  This version fixes the query issue
 * by manually implementing a query option.
 */
export default class DicomTreeClient extends api.DICOMwebClient {
    healthlake: HealthLake;
    staticWado = false;

    static studyFilterKeys = {
        ImageSetID: '00200010',
        StudyInstanceUID: '0020000D',
        PatientName: '00100010',
        '00100020': 'mrn',
        StudyDescription: '00081030',
        StudyDate: '00080020',
        ModalitiesInStudy: '00080061',
        AccessionNumber: '00080050',
    };

    static seriesFilterKeys = {
        SeriesInstanceUID: '0020000E',
        SeriesNumber: '00200011',
    };

    constructor(qidoConfig) {
        super(qidoConfig);
        this.staticWado = qidoConfig.staticWado;
        const {
            healthlake
        } = qidoConfig;
        this.healthlake = {
            groupSeriesBy: 'SeriesInstanceUID',
            region: 'us-east-1',
            endpoint: 'https://runtime-medical-imaging.us-east-1.amazonaws.com',
            tree: true,
            images: true,
            collections: {},
            ...window.healthlake,
            ...qidoConfig.healthlake,
        };
    }

    /**
     * Replace the search for studies remote query with a local version which
     * retrieves a complete query list and then sub-selects from it locally.
     * @param {*} options
     * @returns
     */
    async searchForStudies(options) {
        const search = new URLSearchParams(document.location.search);
        const ImageSetID = search?.get("ImageSetID") || this.healthlake.imageSetID;
        let searchResult;
        if(this.healthlake?.queryJson) {
          searchResult = this.healthlake.queryJson[0]==='[' ? JSON.parse(this.healthlake.queryJson) : await (await fetch(this.healthlake.queryJson)).json();
        } else {
            searchResult = await loadImageSets(this.healthlake, options.queryParams);
        }
        const {
            queryParams
        } = options;
        queryParams.ImageSetID = ImageSetID;
        if (!queryParams) return searchResult;
        const filtered = searchResult.filter(study => {
            for (const key of Object.keys(DicomTreeClient.studyFilterKeys)) {
                if (!this.filterItem(key, queryParams, study)) return false;
            }
            return true;
        });
        return filtered;
    }

    async searchForSeries(options) {
        const searchResult = await super.searchForSeries(options);
        const {
            queryParams
        } = options;
        if (!queryParams) return searchResult;
        const filtered = searchResult.filter(study => {
            for (const key of Object.keys(DicomTreeClient.seriesFilterKeys)) {
                if (!this.filterItem(key, queryParams, study)) return false;
            }
            return true;
        });

        return filtered;
    }

    /**
     * Retrieves the metadata tree object, that is an object containing a patient, and then a study tree.
     * @param options
     * @returns
     */
    async retrieveMetadataTree(options) {
        const search = new URLSearchParams(document.location.search);


        const {
            studyInstanceUID,
            withCredentials = false
        } = options;
        if (!studyInstanceUID) {
            throw new Error(
                'Study Instance UID is required for retrieval of study metadata'
            );
        }

        let {
            ImageSetID = search?.get("ImageSetID") || this.healthlake.imageSetID,
            datastoreID = this.healthlake?.datastoreID,
        } = options;
        if (this.healthlake) {
            const studies = await this.searchForStudies({
                ...options,
                queryParams: {
                    StudyInstanceUID: studyInstanceUID
                },
            });
            if (studies && studies.length) {
                const [study] = studies;
                datastoreID = study['00181002']?.Value?.[0] || datastoreID;
                const imageSetsIds = (study['00200010']?.Value ||[]);
                // Todo do it one by one and go adding to the screen as they arrive
                const metadataArray = await Promise.all(imageSetsIds.map(async (imageSetId: String) => {
                    const metadataLoaded = await loadMetaDataInternal(datastoreID, imageSetId, this.healthlake);
                    return enrichImageSetMetadataWithImageSetId(metadataLoaded, imageSetId);
                }));
                const finalMetadata = reduceMetadata(metadataArray, this.healthlake);
                return finalMetadata;
            }
        }
        if (ImageSetID && datastoreID) {
            if (this.healthlake.collections[ImageSetID]) {
                return this.healthlake.collections[ImageSetID];
            }
            return loadMetaDataInternal(datastoreID, ImageSetID, this.healthlake);
        } else {
            throw new Error(`Missing healthlake configuration`);
        }
    }

    /**
     * Compares values, matching any instance of desired to any instance of
     * actual by recursively go through the paired set of values.  That is,
     * this is O(m*n) where m is how many items in desired and n is the length of actual
     * Then, at the individual item node, compares the Alphabetic name if present,
     * and does a sub-string matching on string values, and otherwise does an
     * exact match comparison.
     *
     * @param {*} desired
     * @param {*} actual
     * @returns true if the values match
     */
    compareValues(desired, actual) {
        if (Array.isArray(desired)) {
            return desired.find(item => this.compareValues(item, actual));
        }
        if (Array.isArray(actual)) {
            return actual.find(actualItem => this.compareValues(desired, actualItem));
        }
        if (actual?.Alphabetic) {
            actual = actual.Alphabetic;
        }
        if (typeof actual == 'string') {
            if (actual.length === 0) return true;
            if (desired.length === 0 || desired === '*') return true;
            if (desired[0] === '*' && desired[desired.length - 1] === '*') {
                return actual.indexOf(desired.substring(1, desired.length - 1)) != -1;
            } else if (desired[desired.length - 1] === '*') {
                return actual.indexOf(desired.substring(0, desired.length - 1)) != -1;
            } else if (desired[0] === '*') {
                return (
                    actual.indexOf(desired.substring(1)) ===
                    actual.length - desired.length + 1
                );
            }
        }
        return desired === actual;
    }

    /** Compares a pair of dates to see if the value is within the range */
    compareDateRange(range, value) {
        if (!value) return true;
        const dash = range.indexOf('-');
        if (dash === -1) return this.compareValues(range, value);
        const start = range.substring(0, dash);
        const end = range.substring(dash + 1);
        return (!start || value >= start) && (!end || value <= end);
    }

    /**
     * Filters the return list by the query parameters.
     *
     * @param {*} key
     * @param {*} queryParams
     * @param {*} study
     * @returns
     */
    filterItem(key, queryParams, study) {
        const altKey = DicomTreeClient.studyFilterKeys[key] || key;
        if (!queryParams) return true;
        const testValue = queryParams[key] || queryParams[altKey];
        if (!testValue) return true;
        const valueElem = study[key] || study[altKey];
        if (!valueElem) return false;
        if (valueElem.vr == 'DA') {
            return this.compareDateRange(testValue, valueElem.Value[0]);
        }
        const value = valueElem.Value;
        return this.compareValues(testValue, value) && true;
    }
}
function reduceMetadata(metadataArray: any[], config: HealthLake) {
    const series = metadataArray.map((cur) => Object.values(cur.Study.Series)).flat();

    const seriesBySerieId = reduceSeries(series, config);

    Object.keys(seriesBySerieId).forEach(key => {
        const series = seriesBySerieId[key];
        seriesBySerieId[key] = seriesBySerieId[key][0];
        seriesBySerieId[key].Instances = series.reduce((acc, cur) => {
            return Object.assign(acc, cur.Instances);
        }, {});
    });
    const finalMetadata = metadataArray[0];
    finalMetadata.Study.Series = seriesBySerieId;
    return finalMetadata;
}

function reduceSeries(series: any[], config: { groupSeriesBy: string; }) {
    const groupSeriesBy = config.groupSeriesBy || 'SeriesInstanceUID';
    return series.reduce((acc, cur) => {
        const currentSerieGroupValue = cur.DICOM[groupSeriesBy];
        if (!acc[currentSerieGroupValue]) {
            acc[currentSerieGroupValue] = [];
        }
        acc[currentSerieGroupValue].push(cur);
        return acc;
    }, {});
}

function enrichImageSetMetadataWithImageSetId(metadataLoaded: any, imageSetId: String) {
    Object.values(metadataLoaded.Study.Series).forEach(series => {
        Object.values(series.Instances).forEach(instance => {
            instance.ImageSetID = imageSetId;
        });
    });
    return metadataLoaded;
}

