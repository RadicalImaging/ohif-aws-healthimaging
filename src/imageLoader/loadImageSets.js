import { getFetch } from '../imageLoader/getFetch';

const ohifToAwsParam = {
    StudyInstanceUID: 'DICOMStudyInstanceUID',
};

async function getImageSets(datastoreId, config, awsFilter, _nextToken = '') {
    const uri = `${config.endpoint}/runtime/datastore/${datastoreId}?maxResults=50&${_nextToken ? 'nextToken='+_nextToken : ''}`;
    const response = await getFetch(config)(uri, {
        method: 'POST',
        headers: { 
            "Content-type": "application/json" 
        },
        body: JSON.stringify({
            searchCriteria: {
                filters: [{
                    "operator": "EQUAL",
                    "values": [awsFilter]

                }]
            }
        })
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

const loadImageSets = async (config, filters) => {
    const aswFilter = Object.keys(filters).reduce((obj,key) =>{
        const awsKey = ohifToAwsParam[key];
        if(awsKey) {
            obj[awsKey] = filters[key];
        }
        return obj;
    },{});

    const startTime = performance.now();
    const imageSetsMetadataSummaries = await getImageSets(config.datastoreID, config, aswFilter);
    performance.measure(
        "healthlake-imagessets-load", {
            start: startTime,
            end: performance.now(),
        }
    );
    const json = imageSetsMetadataSummaries.map(map.bind(null, config.datastoreID));
    const uniq = Object.values(json.reduce((cc, a) => {
        cc[a['0020000D'].Value[0]] = a;
        return cc;
    }, {}));
    config.collections[json.ImageSetID] = uniq;
    return uniq;
}

function map(datastoreId, item) {
    return {
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
            "Value": [item.DICOMTags.DICOMStudyInstanceUID + item.imageSetId]
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
            "Value": ["1"]
        },
        "00201206": {
            "vr": "IS",
            "Value": ["1"]
        }
    };
}

export default loadImageSets;
