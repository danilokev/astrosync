export function perspective(fov: number, aspect: number, near: number, far: number): Float32Array {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);

  // Matriz column-major correcta para WebGL
  return new Float32Array([
    f/aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far+near)*nf, -1,
    0, 0, (2*far*near)*nf, 0
  ]);
}

export function translation(x: number, y: number, z: number): Float32Array {
  return new Float32Array([
    1,0,0,0,
    0,1,0,0,
    0,0,1,0,
    x,y,z,1
  ]);
}

export function rotationY(a: number): Float32Array {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([
     c,0,-s,0,
     0,1, 0,0,
     s,0, c,0,
     0,0, 0,1
  ]);
}

export function scale(x: number, y: number, z: number): Float32Array {
  return new Float32Array([
    x,0,0,0,
    0,y,0,0,
    0,0,z,0,
    0,0,0,1
  ]);
}

export function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for(let i=0;i<4;i++){
    for(let j=0;j<4;j++){
      out[i*4+j] =
        a[i*4+0]*b[0*4+j] +
        a[i*4+1]*b[1*4+j] +
        a[i*4+2]*b[2*4+j] +
        a[i*4+3]*b[3*4+j];
    }
  }
  return out;
}
