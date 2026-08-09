# Target detectors

Detectors report evidence; they do not install files or decide desired state. Each module returns whether its named surface was detected and the markers that produced that conclusion.

Surface IDs are deliberately product-specific even when several products discover the same `.agents/skills` tree. Retired IDs remain migration or diagnostic evidence; they are not active registry entries and are never silently equated with another product.

To add a detector, add its surface contract to `src/registry.js`, return normalized evidence from a same-named module, and extend the registry contract tests. Do not infer support from a similar product's directory name.
