import {Types} from '@ohif/core';

export interface InstanceTreeMetadata {
  DICOM: Types.InstanceMetadata;
  Instances: Record<string, InstanceTreeMetadata>;
  DICOMVRs?: Record<string, unknown>;
  ImageFrames: Record<string,unknown>[];
};

export interface SeriesTreeMetadata {
  DICOM: Types.SeriesMetadata;
  Instances: Record<string, InstanceTreeMetadata>;
};

export interface StudyTreeMetadata {
  DICOM: Types.StudyMetadata;
  Series: Record<string, SeriesTreeMetadata>;
};

export interface TreeMetadata {
  Patient: { DICOM: Types.PatientMetadata };
  Study: StudyTreeMetadata;
}

