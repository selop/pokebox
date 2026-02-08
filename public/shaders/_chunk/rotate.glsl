mat2 rotate(float rad) {
  float c = cos(rad);
  float s = sin(rad);
  return mat2(
    c, s,
    -s, c
  );
}