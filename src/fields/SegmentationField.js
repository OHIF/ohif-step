import PixelField from "./PixelField";
import dcmjs from "dcmjs";

export default class SegmentationField extends PixelField {
  constructor(options = {}) {
    super(options);

    this.samplerType = "sampler3D";

    this.analyze();
  }

  unpack() {
    // convert BitsAllocated, BitsStored == 1 dataset to
    // 0-255 Uint8Array pixel data
    // TODO: this could be moved to the SegmentationNormalizer
    // TODO: for segmentation generators to create valid SegmentationFields
    //       this code will need to be made conditional on the BitsAllocated
    let [columns, rows, slices] = [
      this.dataset.Rows,
      this.dataset.Columns,
      this.dataset.NumberOfFrames
    ].map(Number);
    let sliceSize = rows * columns;
    let packedPixelData = new Uint8Array(this.dataset.PixelData);
    let bytesPerPackedRow = Math.ceil(rows / 8);
    let packedSliceSize = rows * bytesPerPackedRow;
    let pixelData = new Uint8Array(slices * rows * columns);

    for (let slice = 0; slice < slices; slice++) {
      for (let row = 0; row < rows; row++) {
        let packedRowIndex = slice * packedSliceSize + row * bytesPerPackedRow;

        for (let column = 0; column < columns; column++) {
          let columnByteIndex = Math.floor(column / 8);
          let packedIndex = packedRowIndex + columnByteIndex;
          let columnBitIndex = column % 8;
          let mask = 1 << columnBitIndex;
          let unpackedValue =
            (packedPixelData[packedIndex] & mask) >> columnBitIndex;

          pixelData[slice * sliceSize + row * columns + column] =
            255 * unpackedValue;
        }
      }
    }
    return pixelData;
  }

  analyze() {
    super.analyze();

    if (this.dataset.BitsAllocated !== 1) {
      console.warn(this, "Can only render 1 bit data");
    }
    let sharedGroups = this.dataset.SharedFunctionalGroupsSequence;
    let pixelMeasures = sharedGroups.PixelMeasuresSequence;

    if (pixelMeasures.SpacingBetweenSlices !== pixelMeasures.SliceThickness) {
      console.warn(
        "SpacingBetweenSlices and SliceThickness should be equal for SEG"
      );
      console.warn(
        pixelMeasures.SpacingBetweenSlices +
          " !== " +
          pixelMeasures.SliceThickness
      );
    }
    this.rgba = dcmjs.data.Colors.dicomlab2RGB(
      this.dataset.Segment[0].RecommendedDisplayCIELabValue
    );
    this.rgba.push(1);
    this.gradientOpacityScale = 1;
  }

  uniforms() {
    let u = super.uniforms();

    return u;
  }

  transferFunctionSource() {
    return `
        uniform vec4 rgba${this.id};
        uniform float gradientOpacityScale${this.id};
        void transferFunction${this.id} (const in float sampleValue,
                                         const in float gradientMagnitude,
                                         out vec3 color,
                                         out float opacity)
        {
          color = vec3(0., 0., 0.);
          opacity = 0.;
          if (sampleValue > 0.) {
            color = sampleValue * rgba${this.id}.rgb;
            opacity = rgba${this.id}.a * gradientMagnitude * gradientOpacityScale${this.id};
          }
        }
      `;
  }

  fieldToTexture(gl) {
    // cannot be subclassed.
    let needsUpdate = super.fieldToTexture(gl);

    if (needsUpdate) {
      let [w, h, d] = this.pixelDimensions;
      let byteArray = this.unpack(); // for now, don't save unpacked pixel data

      gl.texStorage3D(gl.TEXTURE_3D, 1, gl.R8, w, h, d);
      gl.texSubImage3D(
        gl.TEXTURE_3D,
        0, // level, offsets
        0,
        0,
        0,
        w,
        h,
        d,
        gl.RED,
        gl.UNSIGNED_BYTE,
        byteArray
      );
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      this.updated();
    }
  }
}
