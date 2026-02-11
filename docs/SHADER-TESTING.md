# Shader Testing Guide

This document explains how to test WebGL shaders in the Pokebox project to catch compilation errors and common mistakes.

## Testing Strategy

We use **two levels of shader testing**:

### 1. Static Validation (`shader-validation.test.ts`)
Fast, lightweight checks that analyze shader source code without WebGL:
- ✅ Detects undefined function calls (like missing `blendScreen()`)
- ✅ Validates all uniforms are declared before use
- ✅ Validates all varyings are declared
- ✅ Checks for balanced braces and parentheses
- ✅ Ensures `gl_FragColor` is set
- ✅ Verifies precision declaration exists

**Advantage**: Runs instantly, no WebGL context needed, catches 80% of common errors

### 2. Runtime Compilation (`shader-compilation.test.ts`)
Actual WebGL shader compilation through Three.js:
- ✅ Catches GLSL syntax errors
- ✅ Validates type mismatches
- ✅ Detects precision/version issues
- ✅ Verifies shader compiles on actual GPU

**Advantage**: Catches real WebGL errors, exact same as production

## Running Tests

```bash
# Run all unit tests
bun test:unit

# Run only shader tests
bun test:shader

# Watch mode for development
bun test
```

## CI/CD Integration

Add to your GitHub Actions or CI pipeline:

\`\`\`yaml
- name: Run shader tests
  run: bun test shader
\`\`\`

This prevents broken shaders from reaching production.

## How the Tests Caught the `blendScreen` Error

### The Problem
```glsl
// In ultra-rare.frag line 167:
sparkleColor = blendScreen(sparkleFoil, rainbow * 0.3);

// But blendScreen() was never defined!
```

### How Each Test Catches It

**Static Validation** would catch this:
```
❌ Undefined functions found: blendScreen
   Defined functions: blendOverlay, blendHardLight, blendExclusion,
                      blendMultiply, blendPlusLighter, ...
```

**Runtime Compilation** would catch this:
```
❌ WebGL shader compilation error:
   ERROR: 0:167: 'blendScreen' : no matching overloaded function found
```

## Adding Tests for New Shaders

When adding a new shader:

1. **Add to `shader-validation.test.ts`**:
   ```ts
   const shaders = {
     'my-new-shader': myNewShaderFrag,
     // ...
   }
   ```

2. **Add to `shader-compilation.test.ts`**:
   ```ts
   testShaderCompilation('my-new-shader', myNewShaderFrag, [
     'uMyUniform1',
     'uMyUniform2',
     // List all required uniforms
   ])
   ```

3. **Run tests to verify**:
   ```bash
   bun test shader
   ```

## Additional Tools

### GLSL Linting (Optional)

Install `glslify-lint` for IDE integration:

\`\`\`bash
bun add -D glslify-lint
\`\`\`

Add to `package.json`:
\`\`\`json
{
  "scripts": {
    "lint:shaders": "glslify-lint src/shaders/**/*.frag src/shaders/**/*.vert"
  }
}
\`\`\`

### VSCode Extension

Install [Shader languages support](https://marketplace.visualstudio.com/items?itemName=slevesque.shader) for syntax highlighting and basic validation.

## Best Practices

1. **Run tests before committing** shader changes
2. **Use descriptive function names** that won't collide with GLSL builtins
3. **Declare all blend modes** at the top of the shader file
4. **Add comments** for complex shader math
5. **Test in browser** after tests pass to verify visual output

## Common Shader Errors

| Error | Test That Catches It | Prevention |
|-------|---------------------|------------|
| Undefined function | Static validation | Define all helpers |
| Undeclared uniform | Static validation | Declare before use |
| Type mismatch | Runtime compilation | Check vec3/float ops |
| Missing semicolon | Runtime compilation | Use GLSL formatter |
| Wrong uniform name | Runtime compilation | Match buildCard.ts |
| Unbalanced braces | Static validation | Use auto-format |

## Performance Tips

- Static validation runs in **~10ms**
- Runtime compilation runs in **~50ms per shader**
- Both are fast enough to run on every commit
- Consider running in pre-commit hook:
  ```bash
  # .husky/pre-commit
  bun test shader --run
  ```
