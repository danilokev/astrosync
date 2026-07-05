#version 300 es
    precision highp float;

    in vec2 vUV;
    uniform sampler2D uTexture;
    out vec4 fragColor;

    void main() {
        vec4 color = texture(uTexture, vUV);

        if(color.a < 0.1) discard;

        fragColor = vec4(color.rgb, color.a * 0.5);// ← sin multiplicar alpha
    }