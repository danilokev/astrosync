#version 300 es
        precision highp float;
        uniform vec3 sunDir;
        uniform sampler2D map;
        uniform float ambient;

        in vec3 vNormal;
        in vec2 vUV;
        in vec3 vFragPos;
        out vec4 fragColor;

        void main() {
          vec3 texColor = texture(map, vUV).rgb;
          float dotNL = dot(normalize(vNormal), normalize(sunDir));
          float mask = smoothstep(-0.2, 0.2, dotNL);
          float intensity = max(dotNL, 0.0) * 1.2 + ambient;
          vec3 litColor = texColor * intensity + vec3(0.1) * (1.0 - dotNL);
          vec3 finalColor = mix(texColor * 0.2, litColor, mask);
          fragColor = vec4(finalColor, 1.0);
        }