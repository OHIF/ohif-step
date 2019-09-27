// TODO -> Is this even needed... re-evaluate when my understanding has increased a few STEPs.
class Uniforms {
  constructor() {
    this.reset();
  }

  reset() {
    this.pointLight = { type: "3fv", value: [100, -400, 1500] };
    this.gradientSize = { type: "1f", value: 1 };
    this.rayMaxSteps = { type: "1i", value: 10000 };
    this.sampleStep = { type: "1f", value: 0.5 };
    this.renderCanvasWidth = { type: "1f", value: 512 };
    this.renderCanvasHeight = { type: "1f", value: 512 };
    this.sliceMode = { type: "1i", value: 1 };
    this.Kambient = { type: "1f", value: 1.5 };
    this.Kdiffuse = { type: "1f", value: 0.95 };
    this.Kspecular = { type: "1f", value: 0.8 };
    this.Shininess = { type: "1f", value: 10 };
  }
}

const uniforms = new Uniforms();

export default uniforms;
