// https://thebookofshaders.com/12/
vec2 random2( vec2 p ) {
  return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);
}
vec3 cellNoise(vec2 st){
  vec3 color = vec3(0.0);
  st *= 2.0;
  st.x *= uAspect;
  vec2 i_st = floor(st);
  vec2 f_st = fract(st);
  float m_dist = 1.;
  float t = uTime * 0.5;
  for (int y= -1; y <= 1; y++) {
    for (int x= -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x),float(y));
      vec2 point = random2(i_st + neighbor);
      point = 0.5 + 0.5*sin(t + 6.2831*point);
      vec2 diff = neighbor + point - f_st;
      float dist = length(diff);
      m_dist = min(m_dist, dist);
    }
  }
  color += m_dist;
  return color;
}