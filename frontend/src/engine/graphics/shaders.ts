// shaders.ts
export const vertexShaderSrc = `#version 300 es
layout(location = 0) in vec3 aPosition;
uniform mat4 uMVP;
void main() {
  gl_Position = uMVP * vec4(aPosition, 1.0);
}
`;

export const fragmentShaderSrc = `#version 300 es
precision highp float;
out vec4 outColor;
void main() {
  outColor = vec4(0.2, 0.7, 1.0, 1.0);
}
`;
