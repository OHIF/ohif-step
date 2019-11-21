import ImageField from "../ImageField";
import SegmentationField from "../SegmentationField";
import TransformField from "../TransformField";
import * as dcmjs from "dcmjs";

// array of fields from dataset

function fieldsFromDataset(dataset) {
  let fields = [];
  let sopClassName =
    dcmjs.data.DicomMetaDictionary.sopClassNamesByUID[dataset.SOPClassUID];

  switch (sopClassName) {
    case "CTImage":
    case "MRImage":
    case "EnhancedCTImage":
    case "LegacyConvertedEnhancedCTImage":
    case "UltrasoundMultiframeImage":
    case "EnhancedMRImage":
    case "MRSpectroscopy":
    case "EnhancedMRColorImage":
    case "LegacyConvertedEnhancedMRImage":
    case "UltrasoundImage":
    case "EnhancedUSVolume":
    case "SecondaryCaptureImage":
    case "USImage":
    case "PETImage":
    case "EnhancedPETImage":
    case "LegacyConvertedEnhancedPETImage":
      {
        fields = [new ImageField({ dataset })];
      }
      break;
    case "Segmentation":
      {
        fields = segmentationFieldsFromDataset({ dataset });
      }
      break;
    case "DeformableSpatialRegistration":
      {
        fields = [new TransformField({ dataset })];
      }
      break;
    default: {
      console.error("Cannot process this dataset type ", dataset);
    }
  }
  return fields;
}

function segmentationFieldsFromDataset(options) {
  // make one dataset per segment and a corresponding field
  // Always use 1-based indexing for segmentNumber
  if (!options.dataset) {
    return [];
  }
  if (
    options.dataset.NumberOfFrames !==
    options.dataset.PerFrameFunctionalGroupsSequence.length
  ) {
    console.error(
      "Number of frames does not match number of functional groups"
    );
  }
  let fields = [];
  // first, make a new dataset per segment
  let segmentDatasets = ["Empty Dataset 0"];
  let jsonDataset = JSON.stringify(options.dataset);
  let segments = options.dataset.Segment;

  if (!(segments.length > 0)) {
    segments = [options.dataset.Segment];
  }
  segments.forEach(segment => {
    let segmentDataset = JSON.parse(jsonDataset);

    segmentDataset.Segment = [segment];
    segmentDatasets.push(segmentDataset);
  });
  // next make a list of frames per segment
  let segmentGroupLists = ["Empty GroupList 0"];

  options.dataset.PerFrameFunctionalGroupsSequence.forEach(functionalGroup => {
    let segmentNumber =
      functionalGroup.SegmentIdentification.ReferencedSegmentNumber;

    if (!segmentGroupLists[segmentNumber]) {
      segmentGroupLists[segmentNumber] = [];
    }
    // this will be segment 1 of new dataset
    functionalGroup.SegmentIdentification.ReferencedSegmentNumber = 1;
    segmentGroupLists[segmentNumber].push(functionalGroup);
  });
  // determine per-segment index into the pixel data
  // TODO: only handles one-bit-per pixel, last byte padded
  let frameSize = Math.ceil(
    (options.dataset.Rows * options.dataset.Columns) / 8
  );
  let segmentOffsets = ["Empty offset 0", 0];
  let segmentSizes = ["Empty size 0"];

  segmentGroupLists.slice(1).forEach(segmentGroupList => {
    let previousOffset = segmentOffsets[segmentOffsets.length - 1];
    let numberOfFrames = segmentGroupList.length;

    segmentOffsets.push(previousOffset + frameSize * numberOfFrames);
    segmentSizes.push(frameSize * numberOfFrames);
  });
  // Now make new per-frame functional groups and pixel data for each dataset
  // (skipping the first known-to-be-empty segment)
  // TODO: assumes frames are sorted and first frame is origin WRT slice direction
  let segmentNumber = 1;

  segmentGroupLists.slice(1).forEach(segmentGroupList => {
    let dataset = segmentDatasets[segmentNumber];

    dataset.PerFrameFunctionalGroupsSequence = segmentGroupList;
    let begin = segmentOffsets[segmentNumber];
    let end = begin + segmentSizes[segmentNumber];

    dataset.NumberOfFrames = segmentGroupLists[segmentNumber].length;
    dataset.PixelData = options.dataset.PixelData.slice(begin, end);
    fields.push(new SegmentationField({ dataset }));
    segmentNumber++;
  });
  return fields;
}

export default { fieldsFromDataset, segmentationFieldsFromDataset };
