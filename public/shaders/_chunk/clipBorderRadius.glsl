float clipBorderRadius(
  vec2 uv, vec2 resolution, float borderRadius
){
  borderRadius = min(borderRadius, min(resolution.x, resolution.y) * 0.5);

  float clip;
  float biggerResolution = max(resolution.x, resolution.y);
  vec2 aspect = resolution / biggerResolution;

  // 4つ角を四角形でクリップできるようにuvを調整する
  vec2 clipSquareUv = uv - 0.5; 
  // クリップする四角形の範囲を1/4にする
  vec2 clipRange = 0.5 - (vec2(borderRadius) / resolution);
  vec2 clipSquare = smoothstep(
    vec2(clipRange), 
    vec2(clipRange - 0.001), 
    abs(clipSquareUv)
  );
  clip = min(1.0, clipSquare.x + clipSquare.y);

  // 4つ角を丸くクリップする
  float radius = borderRadius / biggerResolution;
  vec2 clipCircleUv = abs(uv - 0.5);
  clipCircleUv = (clipCircleUv - 0.5) * aspect + radius;
  float clipBorderRadius = smoothstep(
    radius + 0.001, 
    radius, 
    length(clipCircleUv)
  );

  // 四角と丸から角丸を抽出する
  clip = min(1.0, clip + clipBorderRadius);
  return clip;
}