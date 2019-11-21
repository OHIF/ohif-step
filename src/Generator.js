import glConstants from "./glConstants";
import step from "./step";

// populates Fields with data based on inputs
export default class Generator {
  // TODO: unify with Space
  constructor(options = {}) {
    this.useIntegerTextures = step.useIntegerTextures;
    this.gl = options.gl;
    this.uniforms = options.uniforms || {};
    this.inputFields = options.inputFields || [];
    this.outputFields = options.outputFields || [];
    this.program = undefined;

    // * for now, all PixelData in datasets is of type short
    // * pixel readback of float textures requires casting
    // * gl may allow read back of single component, but may only do rgba
    // TODO: support for reading back transform arrays
    this.sliceViewArrayType = Int16Array;
    this.sliceViewBytesPerElement = 2;

    if (this.useIntegerTextures) {
      this.samplerType = "isampler3D";
      this.bufferType = "int";
      this.readPixelsFormat = this.gl.RED_INTEGER;
      this.readPixelsType = this.gl.SHORT;
      this.fallbackSliceViewsArrayType = Int32Array;
      this.fallbackNumberOfComponents = 4;
      this.fallbackReadPixelsFormat = this.gl.RGBA_INTEGER;
      this.fallbackReadPixelsType = this.gl.INT;
    } else {
      this.samplerType = "sampler3D";
      this.bufferType = "float";
      this.readPixelsFormat = this.gl.RED;
      this.readPixelsType = this.gl.FLOAT;
      this.fallbackSliceViewsArrayType = Float32Array;
      this.fallbackNumberOfComponents = 4;
      this.fallbackReadPixelsFormat = this.gl.RGBA;
      this.fallbackReadPixelsType = this.gl.FLOAT;
    }

    // TODO: need to consider rescaleIntercept/rescaleSlope when
    // writing out to image textures
  }

  // utility for printing multiline strings for debugging
  logWithLineNumbers(string) {
    let lineNumber = 1;

    string.split("\n").forEach(line => {
      console.log(lineNumber, line);
      lineNumber += 1;
    });
  }

  // utility for printing human readable codes
  // TODO: could cache the mapping, but since this is only
  // for error messages performance is not critical
  static glConstantName(candidateValue) {
    let name;

    Object.entries(glConstants).forEach(entry => {
      let [key, value] = entry;

      if (candidateValue === value) {
        name = key;
      }
    });
    return name;
  }
}
