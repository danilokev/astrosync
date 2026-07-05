#version 300 es

layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aColor;
layout(location=2) in float aSize;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

uniform float uScale;
uniform float uFov;

out vec3 vColor;

void main() {

    vColor = aColor;

    vec4 mvPosition = uView * uModel * vec4(aPosition, 1.0);

    float fovScale = 1.0 / tan(radians(uFov) / 2.0);

    gl_PointSize = aSize * uScale * fovScale / -mvPosition.z;

    gl_Position = uProjection * mvPosition;
}