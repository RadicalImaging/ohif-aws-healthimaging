import { getFetch } from '../imageLoader/getFetch';

const ohifToAwsParam = {
    StudyInstanceUID: 'DICOMStudyInstanceUID',
    PatientID: 'DICOMPatientId',
    AccessionNumber: 'DICOMAccessionNumber'
};

const isObjectEmpty = (obj) => {
    return Object.keys(obj).length === 0
}

const getBody = (awsFilter) => {
    if(isObjectEmpty(awsFilter)) {
        return {}
    } else {
        return {
            filters: [{
                "operator": "EQUAL",
                "values": [awsFilter]
            }]
        }
    }
}

async function getImageSets(datastoreId, config, awsFilter, _nextToken = '') {
    const uri = `${config.endpoint}/datastore/${datastoreId}/searchImageSets?maxResults=50&${_nextToken ? 'nextToken='+_nextToken : ''}`;
    
    const body = getBody(awsFilter)
    
    const response = await getFetch(config)(uri, {
        method: 'POST',
        headers: { 
            "Content-type": "application/json" 
        },
        body: JSON.stringify(body)
    })
    const {
        imageSetsMetadataSummaries,
        nextToken
    } = await response.json();
    if (nextToken) {
        return imageSetsMetadataSummaries.concat(await getImageSets(datastoreId, config, awsFilter, nextToken));
    }
    return imageSetsMetadataSummaries;
}

const loadImageSetsCache = new Map();
const loadImageSets = async (config, filters) => {
    const startTime = performance.now();
    const aswFilter = Object.keys(filters).reduce((obj,key) =>{
        const awsKey = ohifToAwsParam[key];
        if(awsKey) {
            obj[awsKey] = filters[key];
        }
        return obj;
    },{});
    const cacheKey = JSON.stringify(aswFilter);
    // Todo make it configurable
    setTimeout(() => {
        loadImageSetsCache.delete(cacheKey);
    }, 1000 * 60 * 5);
    const cached = loadImageSetsCache.get(cacheKey);
    if (cached) {
        performance.measure(
            "healthlake:imagessets-load-from-cache", {
                start: startTime,
                detail: "cached",
                end: performance.now(),
            }
        );
        return cached;
    } else {
        const getImageSetPromise = getImageSets(config.datastoreID, config, aswFilter).then((imageSetsMetadataSummaries) => {
            performance.measure(
                "healthlake:imagessets-load", {
                    start: startTime,
                    detail: "request",
                    end: performance.now(),
                }
            );
            const json = imageSetsMetadataSummaries.map(mapImageSetMetadataSummaryToDicomTags.bind(null, config.datastoreID));
            // combines imagesets by studyuid
            const uniq = reduceImageSetsByStudy(json);

            config.collections[json.ImageSetID] = uniq;
            return uniq;
        });
        loadImageSetsCache.set(cacheKey, getImageSetPromise);
        return getImageSetPromise;
    }
}

export function reduceImageSetsByStudy(json) {
    return Object.values(json.reduce((cc, a) => {
        if (!cc[a['0020000D'].Value[0]]) {
            cc[a['0020000D'].Value[0]] = a;
        } else {
            cc[a['0020000D'].Value[0]]['00200010'].Value.push(a['00200010'].Value[0]); // push the ImageSetId into the StudyId param (not right)
            cc[a['0020000D'].Value[0]]['00201208'].Value[0] += a['00201208'].Value[0]; // add up the instances in each imageset
        }
        return cc;
    }, {}));
}

export function mapImageSetMetadataSummaryToDicomTags(datastoreId, item) {
    return {
        "00100020": {
        "vr": "PN",
        "Value": [item.DICOMTags.DICOMPatientId]
        },
        "00100010": {
            "vr": "PN",
            "Value": [item.DICOMTags.DICOMPatientName]
        },
        "00080050": {
            "vr": "SH",
            "Value": [item.DICOMTags.DICOMAccessionNumber]
        },
        "0020000D": {
            "vr": "UI",
            "Value": [item.DICOMTags.DICOMStudyInstanceUID]
        },
        "00200010": {
            "vr": "SH",
            "Value": [item.imageSetId]
        },
        "00181002": {
            "vr": "UI",
            "Value": [datastoreId]
        },
        "00080061": {
            "vr": "CS",
            "Value": [""]
        },
        "00201208": {
            "vr": "IS",
            "Value": [item.DICOMTags.DICOMNumberOfStudyRelatedInstances]
        },
        "00201206": {
            "vr": "IS",
            "Value": ["1"]
        },
        //StudyDate
        "00080020": {
            "vr": "DA",
            "Value": [item.DICOMTags.DICOMStudyDate]
        },
        //StudyDescription
        "00081030": {
            "vr": "LO",
            "Value": [item.DICOMTags.DICOMStudyDescription],
        },
    };
}

export default loadImageSets;
