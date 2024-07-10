import {
    reduceImageSetsByStudy,
    mapImageSetMetadataSummaryToDicomTags
} from './loadImageSets';
jest.mock('aws4fetch', () => ({
    AwsClient: jest.fn().mockImplementation(() => ({
        fetch: jest.fn().mockResolvedValue({
            json: jest.fn().mockResolvedValue({
                ImageSetID: 'test-collection-id'
            })
        })
    }))
}));

describe('Test data trasformations to fit OHIF normal models', () => {

    describe('reduceImageSetsByStudy', () => {
        test('correctly reduces image sets by study', () => {
            const json = [{
                    "0020000D": {
                        "Value": ["Study1"]
                    },
                    "00200010": {
                        "Value": ["ImageSet1"]
                    }
                },
                {
                    "0020000D": {
                        "Value": ["Study2"]
                    },
                    "00200010": {
                        "Value": ["ImageSet2"]
                    }
                },
                {
                    "0020000D": {
                        "Value": ["Study1"]
                    },
                    "00200010": {
                        "Value": ["ImageSet3"]
                    }
                },
                {
                    "0020000D": {
                        "Value": ["Study2"]
                    },
                    "00200010": {
                        "Value": ["ImageSet4"]
                    }
                }
            ];

            const expectedOutput = [{
                    "0020000D": {
                        "Value": ["Study1"]
                    },
                    "00200010": {
                        "Value": ["ImageSet1", "ImageSet3"]
                    }
                },
                {
                    "0020000D": {
                        "Value": ["Study2"]
                    },
                    "00200010": {
                        "Value": ["ImageSet2", "ImageSet4"]
                    }
                }
            ];

            expect(reduceImageSetsByStudy(json)).toEqual(expectedOutput);
        });
    });


    describe('mapImageSetMetadataSummaryToDicomTags', () => {
        test('correctly maps image set metadata summary to DICOM tags', () => {
            const datastoreId = 'datastoreId';
            const item = {
                DICOMTags: {
                    DICOMPatientId: 'P001',
                    DICOMPatientName: 'John Doe',
                    DICOMAccessionNumber: 'A123',
                    DICOMStudyInstanceUID: 'S001',
                    DICOMNumberOfStudyRelatedInstances: '3',
                    DICOMStudyDate: '2022-05-10',
                    DICOMStudyDescription: 'Sample Study',
                },
                imageSetId: 'someImageSetId',
            };

            const expectedOutput = {
                "00100020": {
                    "vr": "PN",
                    "Value": ["P001"]
                },
                "00100010": {
                    "vr": "PN",
                    "Value": ["John Doe"]
                },
                "00080050": {
                    "vr": "SH",
                    "Value": ["A123"]
                },
                "0020000D": {
                    "vr": "UI",
                    "Value": ["S001"]
                },
                "00200010": {
                    "vr": "SH",
                    "Value": ["someImageSetId"]
                },
                "00181002": {
                    "vr": "UI",
                    "Value": ["datastoreId"]
                },
                "00080061": {
                    "vr": "CS",
                    "Value": [""]
                },
                "00201208": {
                    "vr": "IS",
                    "Value": ["3"]
                },
                "00201206": {
                    "vr": "IS",
                    "Value": ["1"]
                },
                "00080020": {
                    "vr": "DA",
                    "Value": ["2022-05-10"]
                },
                "00081030": {
                    "vr": "LO",
                    "Value": ["Sample Study"]
                }
            };

            expect(mapImageSetMetadataSummaryToDicomTags(datastoreId, item)).toEqual(expectedOutput);
        });
    });
});
