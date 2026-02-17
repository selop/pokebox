# Special Illustration Rare (SIR) — How the Holo Effect Works

If you've ever tilted a Special Illustration Rare card under a light, you know the look: a silvery shimmer that rolls across the artwork, with the etched parts — bubbles, stars, character outlines — sparkling independently as they catch the light. This page explains how Pokebox recreates that effect digitally.

## The Layers

A real SIR card's holo finish isn't one single effect. It's several layers working together. Pokebox stacks them in the same order:

1. **Silver base** — The masked area gets a subtle silver sheen, just like the metallic undercoat on a real card.
2. **Rainbow shine** — Fine diagonal rainbow lines shimmer across the surface, mimicking the repeating holographic pattern visible at certain angles.
3. **Rainbow color wash** — A broad rainbow gradient that slides up and down as you tilt the card, recreating the slow color shift you see when rocking a real SIR back and forth.
4. **Iridescent glitter** — Three layers of tiny glitter particles that shift slightly with your viewing angle, giving the surface that "crushed glass" sparkle.
5. **Glare** — A soft bright spot that follows where you're looking, like a light source reflecting off the card's surface.
6. **Etch sparkle** — The signature effect (see below).

## The Etch Sparkle

This is what makes the etched areas special. On a real card, the etched relief — a Pikachu's outline, a Poke Ball, decorative stars — is physically stamped into the foil. Each tiny curve in the etch faces a slightly different direction, so it catches light at a different angle. That's why the sparkle seems to *follow the shape* of the etch as you tilt the card, rather than just sweeping across in a flat line.

### How Pokebox recreates it

The etch pattern is stored as a grayscale image — brighter areas are "raised," darker areas are "lower." The shader reads this image and figures out which direction each tiny point on the surface is facing (its slope). Then it compares that direction to how the card is currently tilted:

- **Slopes facing toward the tilt** catch the light and sparkle.
- **Slopes facing away** stay dark — until you tilt the other way.
- **Flat areas** with no contour don't sparkle at all, just like on a real card.

Two sparkle layers handle opposite sides of each curve, so as you tilt the card, one side of a bubble lights up while the other fades, and vice versa. Each sparkle point gets its own rainbow color that shifts based on position and tilt, matching the prismatic look of real holographic foil.

### The result

As you tilt the card, rainbow sparkle bands sweep along the embossed contours — wrapping around bubbles, tracing star edges, following character outlines — just like a real SIR card under a desk lamp.
