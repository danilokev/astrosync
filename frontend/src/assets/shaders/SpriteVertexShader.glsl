#version 300 es
  layout(location=0) in vec2 aPosition;
  layout(location=1) in vec2 aUV;

  uniform mat4 uView;
  uniform mat4 uProjection;

  uniform vec3 uSpritePos;
  uniform float uSize;

  out vec2 vUV;

  void main() {

      vUV = aUV;

      // ejes de la cámara
      vec3 right = vec3(uView[0][0], uView[1][0], uView[2][0]);
      vec3 up = -vec3(uView[0][1], uView[1][1], uView[2][1]);

      vec3 worldPos =
        uSpritePos +
        right * aPosition.x * uSize +
        up    * aPosition.y * uSize;

      gl_Position = uProjection * uView * vec4(worldPos, 1.0);
  }