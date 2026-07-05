#version 300 es

precision highp float;

in vec3 vColor;
out vec4 fragColor;

void main() {

    vec2 center = vec2(0.5);
    float d = distance(gl_PointCoord, center);

    if (d > 0.5) discard;

    float core = smoothstep(0.65, 0.0, d);

    float glow = smoothstep(0.75, 0.15, d);

    vec3 color = vColor * (core + glow * 0.3);

    float alpha = core + glow * 0.4;

    fragColor = vec4(color, alpha);
}