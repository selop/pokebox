Current state

Right now cards are shown in a triple horizontal row (prev/current/next with staggered depth) or a single exploded layer view. Navigation is
sequential (next/prev). The box is essentially a shoebox you peer into.

Layout ideas

1. Binder Page Grid
   Arrange cards in a 3x3 or 4x3 grid on the back wall, like a real binder page. Head tracking would make them pop in/out with parallax at different
   z-depths. Navigate between "pages" with left/right. This is the most familiar physical metaphor for card collectors.

2. Rotating Carousel / Turntable
   Cards arranged in a circular arc (like a lazy susan). Head movement reveals cards that were previously occluded. The center card faces forward,
   flanking cards angle away. Gives a strong 3D depth cue since the geometry is inherently 3-dimensional.

3. Fanned Hand
   Cards fanned out like a poker hand — overlapping, each slightly rotated and offset in depth. The "selected" card lifts forward and straightens. Very
   tactile feeling, and the overlapping creates natural occlusion parallax with head tracking.

4. Floating Shelf / Display Case
   Cards rest on shelves at different depths within the box, like a curio cabinet or a museum display case. Some cards angled, some flat. This plays
   well with the existing box geometry and would benefit hugely from lighting.

5. Spiral Tower
   Cards arranged in a helix/spiral going from front to back of the box. As you move your head, different cards come into view. Could auto-rotate
   slowly. Very dramatic and unique.

6. Scattered Desk / Collector's Table
   Cards scattered on the floor of the box at slight random angles and overlaps — like someone dumped their collection on a table. Tap/click to pick
   one up and inspect. Seeded PRNG already exists for reproducible layouts.

---

Lighting Ideas for Enhanced 3D Feel

Current state

Lighting is fairly flat: one ambient + one directional + one blue back-light. The shaders do most of the visual heavy lifting. There's big
opportunity here.

Lighting approaches

1. Spotlight Tracking (follows head position)
   A spotlight cone that moves based on where the user is looking from. When you move your head left, the light angle shifts — casting shadows and
   highlights that reinforce the off-axis parallax. This is probably the single highest-impact change. The light source position could mirror the eye
   position, simulating a "desk lamp" at the viewer's position.

2. Volumetric / God Rays
   Fake volumetric light shafts coming from above or behind the cards. Could be done with semi-transparent geometry or a screen-space post effect. Even
   simple additive-blended cone meshes would sell the "light entering the box" feel.

3. Card-cast Shadows
   Cards casting shadows on the back wall and floor of the box. As the head moves and the perspective shifts, shadows shift too. DirectionalLight with
   castShadow on card meshes + receiveShadow on box walls. This is a huge depth cue — shadows tell your brain exactly how far a card is from the wall.

4. Rim / Edge Lighting
   A back-light positioned behind the cards that creates a bright rim/edge glow around card silhouettes. This separates the cards from the background
   and enhances the "floating in space" feel. Can be done with a PointLight behind and above, plus slightly translucent card edges.

5. Ambient Occlusion (baked or SSAO)
   Darkened corners and creases in the box. Even faking it with darker gradients on the floor near the walls would add a lot of realism. Three.js has
   SAOPass or you could use simple gradient planes in the corners.

6. Environment Map / Reflection Probes
   An HDR environment map (even a simple gradient one) that gives subtle reflections on the card surfaces and box walls. The holo shaders already
   simulate iridescence — adding environmental reflections on the box materials would tie the whole scene together.

7. Dynamic Color Temperature
   Warm light from above/front (like overhead gallery lighting), cool fill from behind. As the user moves, the balance shifts subtly. This creates a
   richer, more cinematic feel than uniform white lighting.

8. Per-Card Accent Lights
   Small colored point lights near each card that pick up the card's dominant color (sample from the card texture or hardcode per type). Fire-type
   cards get a warm orange glow, water-type cards get blue. Creates atmosphere and makes each card feel special.
