/*
 * WebGL Fluid Simulation
 * Based on Navier-Stokes equations
 * Implements advection, diffusion, pressure projection, and vorticity confinement
 */

'use strict';

const canvas = document.getElementById('canvas');
const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };

let gl = canvas.getContext('webgl2', params);
const isWebGL2 = !!gl;
if (!isWebGL2) {
    gl = canvas.getContext('webgl', params) || canvas.getContext('experimental-webgl', params);
}

// Configuration
const config = {
    SIM_RESOLUTION: 128,
    DYE_RESOLUTION: 1024,
    DENSITY_DISSIPATION: 1,
    VELOCITY_DISSIPATION: 0.2,
    PRESSURE: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 30,
    SPLAT_RADIUS: 0.25,
    SPLAT_FORCE: 6000,
    SHADING: true,
    COLORFUL: true,
    COLOR_UPDATE_SPEED: 10,
    PAUSED: false,
    BACK_COLOR: { r: 0, g: 0, b: 0 },
    TRANSPARENT: false,
    BLOOM: true,
    BLOOM_ITERATIONS: 8,
    BLOOM_RESOLUTION: 256,
    BLOOM_INTENSITY: 0.8,
    BLOOM_THRESHOLD: 0.6,
    BLOOM_SOFT_KNEE: 0.7,
    SUNRAYS: true,
    SUNRAYS_RESOLUTION: 196,
    SUNRAYS_WEIGHT: 1.0,
};

// Initialize WebGL extensions
let halfFloat;
let supportLinearFiltering;

if (isWebGL2) {
    gl.getExtension('EXT_color_buffer_float');
    supportLinearFiltering = gl.getExtension('OES_texture_float_linear');
} else {
    halfFloat = gl.getExtension('OES_texture_half_float');
    supportLinearFiltering = gl.getExtension('OES_texture_half_float_linear');
}

gl.clearColor(0.0, 0.0, 0.0, 1.0);

const halfFloatTexType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;

// WebGL shader sources
const baseVertexShader = `
    precision highp float;
    attribute vec2 aPosition;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform vec2 texelSize;
    void main () {
        vUv = aPosition * 0.5 + 0.5;
        vL = vUv - vec2(texelSize.x, 0.0);
        vR = vUv + vec2(texelSize.x, 0.0);
        vT = vUv + vec2(0.0, texelSize.y);
        vB = vUv - vec2(0.0, texelSize.y);
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`;

const clearShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    uniform sampler2D uTexture;
    uniform float value;
    void main () {
        gl_FragColor = value * texture2D(uTexture, vUv);
    }
`;

const colorShader = `
    precision mediump float;
    uniform vec4 color;
    void main () {
        gl_FragColor = color;
    }
`;

const displayShader = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float aspectRatio;
    void main () {
        vec3 C = texture2D(uTexture, vUv).rgb;
        gl_FragColor = vec4(C, 1.0);
    }
`;

const displayBloomShader = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform sampler2D uBloom;
    uniform sampler2D uSunrays;
    uniform float intensity;
    void main () {
        vec3 C = texture2D(uTexture, vUv).rgb;
        vec3 bloom = texture2D(uBloom, vUv).rgb;
        vec3 sunrays = texture2D(uSunrays, vUv).rgb;
        C += bloom * intensity;
        C += sunrays;
        gl_FragColor = vec4(C, 1.0);
    }
`;

const displayShadingShader = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform vec2 texelSize;
    void main () {
        vec3 L = texture2D(uTexture, vL).rgb;
        vec3 R = texture2D(uTexture, vR).rgb;
        vec3 T = texture2D(uTexture, vT).rgb;
        vec3 B = texture2D(uTexture, vB).rgb;
        vec3 C = texture2D(uTexture, vUv).rgb;
        float dx = length(R) - length(L);
        float dy = length(T) - length(B);
        vec3 n = normalize(vec3(dx, dy, length(texelSize)));
        vec3 l = vec3(0.0, 0.0, 1.0);
        float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
        C *= diffuse;
        gl_FragColor = vec4(C, 1.0);
    }
`;

const bloomPrefilterShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform vec3 curve;
    uniform float threshold;
    void main () {
        vec3 c = texture2D(uTexture, vUv).rgb;
        float br = max(c.r, max(c.g, c.b));
        float rq = clamp(br - curve.x, 0.0, curve.y);
        rq = curve.z * rq * rq;
        c *= max(rq, br - threshold) / max(br, 0.0001);
        gl_FragColor = vec4(c, 0.0);
    }
`;

const bloomBlurShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum;
    }
`;

const bloomFinalShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uTexture;
    uniform float intensity;
    void main () {
        vec4 sum = vec4(0.0);
        sum += texture2D(uTexture, vL);
        sum += texture2D(uTexture, vR);
        sum += texture2D(uTexture, vT);
        sum += texture2D(uTexture, vB);
        sum *= 0.25;
        gl_FragColor = sum * intensity;
    }
`;

const sunraysMaskShader = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    void main () {
        vec4 c = texture2D(uTexture, vUv);
        float br = max(c.r, max(c.g, c.b));
        c.a = 1.0 - min(max(br * 20.0, 0.0), 0.8);
        gl_FragColor = c;
    }
`;

const sunraysShader = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTexture;
    uniform float weight;
    #define ITERATIONS 16
    void main () {
        float Density = 0.3;
        float Decay = 0.95;
        float Exposure = 0.7;
        vec2 coord = vUv;
        vec2 dir = vUv - 0.5;
        dir *= 1.0 / float(ITERATIONS) * Density;
        float illuminationDecay = 1.0;
        float color = texture2D(uTexture, vUv).a;
        for (int i = 0; i < ITERATIONS; i++) {
            coord -= dir;
            float col = texture2D(uTexture, coord).a;
            color += col * illuminationDecay * weight;
            illuminationDecay *= Decay;
        }
        gl_FragColor = vec4(color * Exposure, 0.0, 0.0, 1.0);
    }
`;

const splatShader = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uTarget;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main () {
        vec2 p = vUv - point.xy;
        p.x *= aspectRatio;
        vec3 splat = exp(-dot(p, p) / radius) * color;
        vec3 base = texture2D(uTarget, vUv).xyz;
        gl_FragColor = vec4(base + splat, 1.0);
    }
`;

const advectionShader = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    uniform sampler2D uVelocity;
    uniform sampler2D uSource;
    uniform vec2 texelSize;
    uniform vec2 dyeTexelSize;
    uniform float dt;
    uniform float dissipation;
    vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
        vec2 st = uv / tsize - 0.5;
        vec2 iuv = floor(st);
        vec2 fuv = fract(st);
        vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
        vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
        vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
        vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
        return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
    }
    void main () {
        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
        gl_FragColor = dissipation * bilerp(uSource, coord, dyeTexelSize);
        gl_FragColor.a = 1.0;
    }
`;

const divergenceShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
        float L = texture2D(uVelocity, vL).x;
        float R = texture2D(uVelocity, vR).x;
        float T = texture2D(uVelocity, vT).y;
        float B = texture2D(uVelocity, vB).y;
        vec2 C = texture2D(uVelocity, vUv).xy;
        if (vL.x < 0.0) { L = -C.x; }
        if (vR.x > 1.0) { R = -C.x; }
        if (vT.y > 1.0) { T = -C.y; }
        if (vB.y < 0.0) { B = -C.y; }
        float div = 0.5 * (R - L + T - B);
        gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
    }
`;

const curlShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uVelocity;
    void main () {
        float L = texture2D(uVelocity, vL).y;
        float R = texture2D(uVelocity, vR).y;
        float T = texture2D(uVelocity, vT).x;
        float B = texture2D(uVelocity, vB).x;
        float vorticity = R - L - T + B;
        gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
    }
`;

const vorticityShader = `
    precision highp float;
    precision highp sampler2D;
    varying vec2 vUv;
    varying vec2 vL;
    varying vec2 vR;
    varying vec2 vT;
    varying vec2 vB;
    uniform sampler2D uVelocity;
    uniform sampler2D uCurl;
    uniform float curl;
    uniform float dt;
    void main () {
        float L = texture2D(uCurl, vL).x;
        float R = texture2D(uCurl, vR).x;
        float T = texture2D(uCurl, vT).x;
        float B = texture2D(uCurl, vB).x;
        float C = texture2D(uCurl, vUv).x;
        vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
        force /= length(force) + 0.0001;
        force *= curl * C;
        force.y *= -1.0;
        vec2 vel = texture2D(uVelocity, vUv).xy;
        gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
    }
`;

const pressureShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uDivergence;
    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        float C = texture2D(uPressure, vUv).x;
        float divergence = texture2D(uDivergence, vUv).x;
        float pressure = (L + R + B + T - divergence) * 0.25;
        gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
    }
`;

const gradientSubtractShader = `
    precision mediump float;
    precision mediump sampler2D;
    varying highp vec2 vUv;
    varying highp vec2 vL;
    varying highp vec2 vR;
    varying highp vec2 vT;
    varying highp vec2 vB;
    uniform sampler2D uPressure;
    uniform sampler2D uVelocity;
    void main () {
        float L = texture2D(uPressure, vL).x;
        float R = texture2D(uPressure, vR).x;
        float T = texture2D(uPressure, vT).x;
        float B = texture2D(uPressure, vB).x;
        vec2 velocity = texture2D(uVelocity, vUv).xy;
        velocity.xy -= vec2(R - L, T - B);
        gl_FragColor = vec4(velocity, 0.0, 1.0);
    }
`;

// Compile and link shaders
function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        throw gl.getShaderInfoLog(shader);
    }
    
    return shader;
}

function createProgram(vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        throw gl.getProgramInfoLog(program);
    }
    
    return program;
}

function getUniforms(program) {
    let uniforms = [];
    let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
        let uniformName = gl.getActiveUniform(program, i).name;
        uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
    }
    return uniforms;
}

// Create shader programs
const baseVertex = compileShader(gl.VERTEX_SHADER, baseVertexShader);
const clearProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, clearShader));
const colorProgram = createProgram(compileShader(gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec2 aPosition;
    void main () {
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
`), compileShader(gl.FRAGMENT_SHADER, colorShader));
const displayProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, displayShader));
const displayBloomProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, displayBloomShader));
const displayShadingProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, displayShadingShader));
const bloomPrefilterProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, bloomPrefilterShader));
const bloomBlurProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, bloomBlurShader));
const bloomFinalProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, bloomFinalShader));
const sunraysMaskProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, sunraysMaskShader));
const sunraysProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, sunraysShader));
const splatProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, splatShader));
const advectionProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, advectionShader));
const divergenceProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, divergenceShader));
const curlProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, curlShader));
const vorticityProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, vorticityShader));
const pressureProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, pressureShader));
const gradienSubtractProgram = createProgram(baseVertex, compileShader(gl.FRAGMENT_SHADER, gradientSubtractShader));

// Get uniforms
const clearUniforms = getUniforms(clearProgram);
const colorUniforms = getUniforms(colorProgram);
const displayUniforms = getUniforms(displayProgram);
const displayBloomUniforms = getUniforms(displayBloomProgram);
const displayShadingUniforms = getUniforms(displayShadingProgram);
const bloomPrefilterUniforms = getUniforms(bloomPrefilterProgram);
const bloomBlurUniforms = getUniforms(bloomBlurProgram);
const bloomFinalUniforms = getUniforms(bloomFinalProgram);
const sunraysMaskUniforms = getUniforms(sunraysMaskProgram);
const sunraysUniforms = getUniforms(sunraysProgram);
const splatUniforms = getUniforms(splatProgram);
const advectionUniforms = getUniforms(advectionProgram);
const divergenceUniforms = getUniforms(divergenceProgram);
const curlUniforms = getUniforms(curlProgram);
const vorticityUniforms = getUniforms(vorticityProgram);
const pressureUniforms = getUniforms(pressureProgram);
const gradienSubtractUniforms = getUniforms(gradienSubtractProgram);

// Create geometry
const blit = (() => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    return (destination) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }
})();

// Framebuffer functions
function createFBO(w, h, internalFormat, format, type, param) {
    gl.activeTexture(gl.TEXTURE0);
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    let fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return {
        texture,
        fbo,
        width: w,
        height: h,
        attach(id) {
            gl.activeTexture(gl.TEXTURE0 + id);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            return id;
        }
    };
}

function createDoubleFBO(w, h, internalFormat, format, type, param) {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);

    return {
        width: w,
        height: h,
        texelSizeX: 1.0 / w,
        texelSizeY: 1.0 / h,
        get read() {
            return fbo1;
        },
        set read(value) {
            fbo1 = value;
        },
        get write() {
            return fbo2;
        },
        set write(value) {
            fbo2 = value;
        },
        swap() {
            let temp = fbo1;
            fbo1 = fbo2;
            fbo2 = temp;
        }
    }
}

// Resize canvas
function resizeCanvas() {
    let width = canvas.clientWidth;
    let height = canvas.clientHeight;
    
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }
    return false;
}

function getResolution(resolution) {
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1) {
        aspectRatio = 1.0 / aspectRatio;
    }

    let min = Math.round(resolution);
    let max = Math.round(resolution * aspectRatio);

    if (gl.drawingBufferWidth > gl.drawingBufferHeight) {
        return { width: max, height: min };
    } else {
        return { width: min, height: max };
    }
}

// Initialize framebuffers
let simRes = getResolution(config.SIM_RESOLUTION);
let dyeRes = getResolution(config.DYE_RESOLUTION);

let dye, velocity, divergence, curl, pressure;
let bloom, bloomFramebuffers = [];
let sunrays, sunraysTemp;

initFramebuffers();
multipleSplats(parseInt(Math.random() * 20) + 5);

function initFramebuffers() {
    simRes = getResolution(config.SIM_RESOLUTION);
    dyeRes = getResolution(config.DYE_RESOLUTION);

    const texType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
    const rgba = isWebGL2 ? gl.RGBA16F : gl.RGBA;
    const rg = isWebGL2 ? gl.RG16F : gl.RGBA;
    const r = isWebGL2 ? gl.R16F : gl.RGBA;
    const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    if (dye == null) {
        dye = createDoubleFBO(dyeRes.width, dyeRes.height, rgba, gl.RGBA, texType, filtering);
    } else {
        dye = resizeDoubleFBO(dye, dyeRes.width, dyeRes.height, rgba, gl.RGBA, texType, filtering);
    }

    if (velocity == null) {
        velocity = createDoubleFBO(simRes.width, simRes.height, rg, gl.RGBA, texType, filtering);
    } else {
        velocity = resizeDoubleFBO(velocity, simRes.width, simRes.height, rg, gl.RGBA, texType, filtering);
    }

    divergence = createFBO(simRes.width, simRes.height, r, gl.RGBA, texType, gl.NEAREST);
    curl = createFBO(simRes.width, simRes.height, r, gl.RGBA, texType, gl.NEAREST);
    pressure = createDoubleFBO(simRes.width, simRes.height, r, gl.RGBA, texType, gl.NEAREST);

    initBloomFramebuffers();
    initSunraysFramebuffers();
}

function initBloomFramebuffers() {
    let res = getResolution(config.BLOOM_RESOLUTION);

    const rgba = isWebGL2 ? gl.RGBA16F : gl.RGBA;
    const texType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
    const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    bloom = createFBO(res.width, res.height, rgba, gl.RGBA, texType, filtering);

    bloomFramebuffers.length = 0;
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
        let width = res.width >> (i + 1);
        let height = res.height >> (i + 1);

        if (width < 2 || height < 2) break;

        let fbo = createFBO(width, height, rgba, gl.RGBA, texType, filtering);
        bloomFramebuffers.push(fbo);
    }
}

function initSunraysFramebuffers() {
    let res = getResolution(config.SUNRAYS_RESOLUTION);

    const rgba = isWebGL2 ? gl.RGBA16F : gl.RGBA;
    const texType = isWebGL2 ? gl.HALF_FLOAT : halfFloat.HALF_FLOAT_OES;
    const filtering = supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    sunrays = createFBO(res.width, res.height, rgba, gl.RGBA, texType, filtering);
    sunraysTemp = createFBO(res.width, res.height, rgba, gl.RGBA, texType, filtering);
}

function resizeDoubleFBO(target, w, h, internalFormat, format, type, param) {
    target.read = createFBO(w, h, internalFormat, format, type, param);
    target.write = createFBO(w, h, internalFormat, format, type, param);
    target.width = w;
    target.height = h;
    target.texelSizeX = 1.0 / w;
    target.texelSizeY = 1.0 / h;
    return target;
}

// Mouse/touch interaction
let pointers = [];
let splatStack = [];

pointers.push({
    id: -1,
    texcoordX: 0.5,
    texcoordY: 0.5,
    prevTexcoordX: 0.5,
    prevTexcoordY: 0.5,
    deltaX: 0,
    deltaY: 0,
    down: false,
    moved: false,
    color: [30, 0, 300]
});

canvas.addEventListener('mousedown', e => {
    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);
    let pointer = pointers.find(p => p.id == -1);
    if (pointer == null) {
        pointer = pointers[0];
    }
    updatePointerDownData(pointer, -1, posX, posY);
});

canvas.addEventListener('mousemove', e => {
    let pointer = pointers[0];
    if (!pointer.down) return;
    let posX = scaleByPixelRatio(e.offsetX);
    let posY = scaleByPixelRatio(e.offsetY);
    updatePointerMoveData(pointer, posX, posY);
});

window.addEventListener('mouseup', () => {
    updatePointerUpData(pointers[0]);
});

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const touches = e.targetTouches;
    for (let i = 0; i < touches.length; i++) {
        let posX = scaleByPixelRatio(touches[i].pageX);
        let posY = scaleByPixelRatio(touches[i].pageY);
        updatePointerDownData(pointers[i], touches[i].identifier, posX, posY);
    }
});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const touches = e.targetTouches;
    for (let i = 0; i < touches.length; i++) {
        let pointer = pointers[i];
        let posX = scaleByPixelRatio(touches[i].pageX);
        let posY = scaleByPixelRatio(touches[i].pageY);
        updatePointerMoveData(pointer, posX, posY);
    }
}, false);

window.addEventListener('touchend', e => {
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++) {
        let pointer = pointers.find(p => p.id == touches[i].identifier);
        if (pointer == null) continue;
        updatePointerUpData(pointer);
    }
});

function updatePointerDownData(pointer, id, posX, posY) {
    pointer.id = id;
    pointer.down = true;
    pointer.moved = false;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
    pointer.color = generateColor();
}

function updatePointerMoveData(pointer, posX, posY) {
    pointer.prevTexcoordX = pointer.texcoordX;
    pointer.prevTexcoordY = pointer.texcoordY;
    pointer.texcoordX = posX / canvas.width;
    pointer.texcoordY = 1.0 - posY / canvas.height;
    pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX);
    pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY);
    pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
}

function updatePointerUpData(pointer) {
    pointer.down = false;
}

function correctDeltaX(delta) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio < 1) delta *= aspectRatio;
    return delta;
}

function correctDeltaY(delta) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) delta /= aspectRatio;
    return delta;
}

function generateColor() {
    let c = HSVtoRGB(Math.random(), 1.0, 1.0);
    c.r *= 0.15;
    c.g *= 0.15;
    c.b *= 0.15;
    return c;
}

function HSVtoRGB(h, s, v) {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return {
        r,
        g,
        b
    };
}

function scaleByPixelRatio(input) {
    let pixelRatio = window.devicePixelRatio || 1;
    return Math.floor(input * pixelRatio);
}

// Splat functions
function multipleSplats(amount) {
    for (let i = 0; i < amount; i++) {
        const color = generateColor();
        color.r *= 10.0;
        color.g *= 10.0;
        color.b *= 10.0;
        const x = Math.random();
        const y = Math.random();
        const dx = 1000 * (Math.random() - 0.5);
        const dy = 1000 * (Math.random() - 0.5);
        splat(x, y, dx, dy, color);
    }
}

function splat(x, y, dx, dy, color) {
    gl.useProgram(splatProgram);
    gl.uniform1i(splatUniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatUniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatUniforms.point, x, y);
    gl.uniform3f(splatUniforms.color, dx, dy, 0.0);
    gl.uniform1f(splatUniforms.radius, correctRadius(config.SPLAT_RADIUS / 100.0));
    blit(velocity.write.fbo);
    velocity.swap();

    gl.uniform1i(splatUniforms.uTarget, dye.read.attach(0));
    gl.uniform3f(splatUniforms.color, color.r, color.g, color.b);
    blit(dye.write.fbo);
    dye.swap();
}

function correctRadius(radius) {
    let aspectRatio = canvas.width / canvas.height;
    if (aspectRatio > 1) {
        radius *= aspectRatio;
    }
    return radius;
}

// Main update loop
let lastUpdateTime = Date.now();
let colorUpdateTimer = 0.0;

function update() {
    const dt = calcDeltaTime();
    if (resizeCanvas()) {
        initFramebuffers();
    }
    updateColors(dt);
    applyInputs();
    if (!config.PAUSED) {
        step(dt);
    }
    render(null);
    requestAnimationFrame(update);
}

function calcDeltaTime() {
    let now = Date.now();
    let dt = (now - lastUpdateTime) / 1000;
    dt = Math.min(dt, 0.016666);
    lastUpdateTime = now;
    return dt;
}

function updateColors(dt) {
    if (!config.COLORFUL) return;

    colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
    if (colorUpdateTimer >= 1) {
        colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
        pointers.forEach(p => {
            p.color = generateColor();
        });
    }
}

function wrap(value, min, max) {
    let range = max - min;
    if (range == 0) return min;
    return (value - min) % range + min;
}

function applyInputs() {
    if (splatStack.length > 0) {
        multipleSplats(splatStack.pop());
    }

    pointers.forEach(p => {
        if (p.moved) {
            p.moved = false;
            splatPointer(p);
        }
    });
}

function splatPointer(pointer) {
    let dx = pointer.deltaX * config.SPLAT_FORCE;
    let dy = pointer.deltaY * config.SPLAT_FORCE;
    splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
}

function step(dt) {
    gl.disable(gl.BLEND);
    gl.viewport(0, 0, simRes.width, simRes.height);

    gl.useProgram(curlProgram);
    gl.uniform2f(curlUniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(curlUniforms.uVelocity, velocity.read.attach(0));
    blit(curl.fbo);

    gl.useProgram(vorticityProgram);
    gl.uniform2f(vorticityUniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(vorticityUniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vorticityUniforms.uCurl, curl.attach(1));
    gl.uniform1f(vorticityUniforms.curl, config.CURL);
    gl.uniform1f(vorticityUniforms.dt, dt);
    blit(velocity.write.fbo);
    velocity.swap();

    gl.useProgram(divergenceProgram);
    gl.uniform2f(divergenceUniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(divergenceUniforms.uVelocity, velocity.read.attach(0));
    blit(divergence.fbo);

    gl.useProgram(clearProgram);
    gl.uniform1i(clearUniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearUniforms.value, config.PRESSURE);
    blit(pressure.write.fbo);
    pressure.swap();

    gl.useProgram(pressureProgram);
    gl.uniform2f(pressureUniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(pressureUniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
        gl.uniform1i(pressureUniforms.uPressure, pressure.read.attach(1));
        blit(pressure.write.fbo);
        pressure.swap();
    }

    gl.useProgram(gradienSubtractProgram);
    gl.uniform2f(gradienSubtractUniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    gl.uniform1i(gradienSubtractUniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradienSubtractUniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write.fbo);
    velocity.swap();

    gl.useProgram(advectionProgram);
    gl.viewport(0, 0, simRes.width, simRes.height);

    if (!isWebGL2) {
        gl.uniform2f(advectionUniforms.dyeTexelSize, velocity.texelSizeX, velocity.texelSizeY);
    }
    let velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionUniforms.uVelocity, velocityId);
    gl.uniform1i(advectionUniforms.uSource, velocityId);
    gl.uniform1f(advectionUniforms.dt, dt);
    gl.uniform1f(advectionUniforms.dissipation, config.VELOCITY_DISSIPATION);
    gl.uniform2f(advectionUniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    blit(velocity.write.fbo);
    velocity.swap();

    gl.viewport(0, 0, dyeRes.width, dyeRes.height);

    if (!isWebGL2) {
        gl.uniform2f(advectionUniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
    }
    gl.uniform1i(advectionUniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionUniforms.uSource, dye.read.attach(1));
    gl.uniform1f(advectionUniforms.dissipation, config.DENSITY_DISSIPATION);
    gl.uniform2f(advectionUniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
    blit(dye.write.fbo);
    dye.swap();
}

function render(target) {
    if (config.BLOOM) {
        applyBloom(dye.read, bloom);
    }
    if (config.SUNRAYS) {
        applySunrays(dye.read, dye.write, sunrays);
        blur(sunrays, sunraysTemp, 1);
    }

    if (target == null || !config.TRANSPARENT) {
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.BLEND);
    } else {
        gl.disable(gl.BLEND);
    }

    let width = target == null ? gl.drawingBufferWidth : target.width;
    let height = target == null ? gl.drawingBufferHeight : target.height;
    gl.viewport(0, 0, width, height);

    let fbo = target == null ? null : target.fbo;
    if (!config.TRANSPARENT) {
        drawColor(fbo, normalizeColor(config.BACK_COLOR));
    }
    if (target == null && config.TRANSPARENT) {
        drawColor(fbo, { r: 0, g: 0, b: 0, a: 0 });
    }

    drawDisplay(fbo, width, height);
}

function drawColor(fbo, color) {
    gl.useProgram(colorProgram);
    gl.uniform4f(colorUniforms.color, color.r, color.g, color.b, color.a != null ? color.a : 1.0);
    blit(fbo);
}

function drawDisplay(fbo, width, height) {
    let program = config.SHADING ? displayShadingProgram : displayProgram;
    let uniforms = config.SHADING ? displayShadingUniforms : displayUniforms;

    if (config.BLOOM || config.SUNRAYS) {
        program = displayBloomProgram;
        uniforms = displayBloomUniforms;
    }

    gl.useProgram(program);
    gl.uniform1i(uniforms.uTexture, dye.read.attach(0));
    
    if (config.BLOOM || config.SUNRAYS) {
        gl.uniform1i(uniforms.uBloom, bloom.attach(1));
        gl.uniform1i(uniforms.uSunrays, sunrays.attach(2));
        gl.uniform1f(uniforms.intensity, config.BLOOM_INTENSITY);
    }

    if (config.SHADING) {
        gl.uniform2f(uniforms.texelSize, 1.0 / width, 1.0 / height);
    }

    blit(fbo);
}

function applyBloom(source, destination) {
    if (bloomFramebuffers.length < 2) {
        return;
    }

    let last = destination;

    gl.disable(gl.BLEND);
    gl.useProgram(bloomPrefilterProgram);
    let knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
    let curve0 = config.BLOOM_THRESHOLD - knee;
    let curve1 = knee * 2;
    let curve2 = 0.25 / knee;
    gl.uniform3f(bloomPrefilterUniforms.curve, curve0, curve1, curve2);
    gl.uniform1f(bloomPrefilterUniforms.threshold, config.BLOOM_THRESHOLD);
    gl.uniform1i(bloomPrefilterUniforms.uTexture, source.attach(0));
    gl.viewport(0, 0, last.width, last.height);
    blit(last.fbo);

    gl.useProgram(bloomBlurProgram);
    for (let i = 0; i < bloomFramebuffers.length; i++) {
        let dest = bloomFramebuffers[i];
        gl.uniform2f(bloomBlurUniforms.texelSize, last.texelSizeX, last.texelSizeY);
        gl.uniform1i(bloomBlurUniforms.uTexture, last.attach(0));
        gl.viewport(0, 0, dest.width, dest.height);
        blit(dest.fbo);
        last = dest;
    }

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
        let baseTex = bloomFramebuffers[i];
        gl.uniform2f(bloomBlurUniforms.texelSize, last.texelSizeX, last.texelSizeY);
        gl.uniform1i(bloomBlurUniforms.uTexture, last.attach(0));
        gl.viewport(0, 0, baseTex.width, baseTex.height);
        blit(baseTex.fbo);
        last = baseTex;
    }

    gl.disable(gl.BLEND);
    gl.useProgram(bloomFinalProgram);
    gl.uniform2f(bloomFinalUniforms.texelSize, last.texelSizeX, last.texelSizeY);
    gl.uniform1i(bloomFinalUniforms.uTexture, last.attach(0));
    gl.uniform1f(bloomFinalUniforms.intensity, config.BLOOM_INTENSITY);
    gl.viewport(0, 0, destination.width, destination.height);
    blit(destination.fbo);
}

function applySunrays(source, mask, destination) {
    gl.disable(gl.BLEND);
    gl.useProgram(sunraysMaskProgram);
    gl.uniform1i(sunraysMaskUniforms.uTexture, source.attach(0));
    gl.viewport(0, 0, mask.width, mask.height);
    blit(mask.fbo);

    gl.useProgram(sunraysProgram);
    gl.uniform1f(sunraysUniforms.weight, config.SUNRAYS_WEIGHT);
    gl.uniform1i(sunraysUniforms.uTexture, mask.attach(0));
    gl.viewport(0, 0, destination.width, destination.height);
    blit(destination.fbo);
}

function blur(target, temp, iterations) {
    gl.useProgram(bloomBlurProgram);
    for (let i = 0; i < iterations; i++) {
        gl.uniform2f(bloomBlurUniforms.texelSize, target.texelSizeX, target.texelSizeY);
        gl.uniform1i(bloomBlurUniforms.uTexture, target.attach(0));
        blit(temp.fbo);

        gl.uniform2f(bloomBlurUniforms.texelSize, temp.texelSizeX, temp.texelSizeY);
        gl.uniform1i(bloomBlurUniforms.uTexture, temp.attach(0));
        blit(target.fbo);
    }
}

function normalizeColor(input) {
    let output = {
        r: input.r / 255,
        g: input.g / 255,
        b: input.b / 255
    };
    return output;
}

// GUI
function startGUI() {
    const gui = new dat.GUI({ width: 300 });
    
    gui.add(config, 'SIM_RESOLUTION', { '32': 32, '64': 64, '128': 128, '256': 256 }).name('simulation resolution').onFinishChange(initFramebuffers);
    gui.add(config, 'DYE_RESOLUTION', { 'high': 1024, 'medium': 512, 'low': 256, 'very low': 128 }).name('quality').onFinishChange(initFramebuffers);
    gui.add(config, 'DENSITY_DISSIPATION', 0, 4.0).name('density diffusion');
    gui.add(config, 'VELOCITY_DISSIPATION', 0, 4.0).name('viscosity');
    gui.add(config, 'PRESSURE', 0.0, 1.0).name('pressure');
    gui.add(config, 'CURL', 0, 50).name('vorticity').step(1);
    gui.add(config, 'SPLAT_RADIUS', 0.01, 1.0).name('splat radius');
    gui.add(config, 'SHADING').name('shading');
    gui.add(config, 'COLORFUL').name('colorful');
    gui.add(config, 'PAUSED').name('paused').listen();
    
    gui.add({ fun: () => {
        splatStack.push(parseInt(Math.random() * 20) + 5);
    }}, 'fun').name('Random splats');
    
    const bloomFolder = gui.addFolder('Bloom');
    bloomFolder.add(config, 'BLOOM').name('enabled');
    bloomFolder.add(config, 'BLOOM_INTENSITY', 0.1, 2.0).name('intensity');
    bloomFolder.add(config, 'BLOOM_THRESHOLD', 0.0, 1.0).name('threshold');
    
    const sunraysFolder = gui.addFolder('Sunrays');
    sunraysFolder.add(config, 'SUNRAYS').name('enabled');
    sunraysFolder.add(config, 'SUNRAYS_WEIGHT', 0.3, 1.0).name('weight');
    
    const captureFolder = gui.addFolder('Color');
    captureFolder.addColor(config, 'BACK_COLOR').name('background color');
    captureFolder.add(config, 'TRANSPARENT').name('transparent');
}

// Start application
startGUI();
update();
