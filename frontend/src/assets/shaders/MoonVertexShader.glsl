#version 300 es
        layout(location=0) in vec3 aPosition;
        layout(location=1) in vec2 aUV;
        layout(location=2) in vec3 aNormal;

        uniform mat4 uModel;
        uniform mat4 uView;
        uniform mat4 uProjection;

        out vec3 vNormal;
        out vec2 vUV;
        out vec3 vFragPos;

        void main() {
          vUV = aUV;
          vec4 worldPos = uModel * vec4(aPosition,1.0);
          vFragPos = worldPos.xyz;
          // vNormal = normalize(mat3(uModel) * aNormal);
          vNormal = normalize(mat3(transpose(inverse(uModel))) * aNormal);
          //vNormal = aNormal;
          gl_Position = uProjection * uView * worldPos;
        }