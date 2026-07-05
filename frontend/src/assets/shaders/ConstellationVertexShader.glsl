#version 300 es

layout(location=0) in vec2 aPosition;
layout(location=1) in vec2 aUV;

uniform mat4 uView;
uniform mat4 uProjection;

uniform vec3 uSpritePos;
uniform vec3 uCameraPos;
uniform float uSize;
uniform float uRotationZ; // ⭐ NUEVO

out vec2 vUV;

void main() {

    vUV = aUV;

    vec3 forward = normalize(uCameraPos - uSpritePos);

    vec3 worldUp = vec3(0.0, 1.0, 0.0);
    vec3 right = normalize(cross(worldUp, forward));
    vec3 up = -cross(forward, right);

    // ⭐ ROTACIÓN DEL QUAD (Z)
    float c = cos(uRotationZ);
    float s = sin(uRotationZ);

    vec2 rotated = vec2(
        aPosition.x * c - aPosition.y * s,
        aPosition.x * s + aPosition.y * c
    );

    vec3 worldPos =
        uSpritePos +
        right * rotated.x * uSize +
        up    * rotated.y * uSize;

    gl_Position = uProjection * uView * vec4(worldPos, 1.0);
}