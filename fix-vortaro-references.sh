#!/bin/bash
# Fix all "vortaro" references to "ido-epo-translator"

echo "=== Fixing vortaro references ==="
echo ""

cd ~/apertium-dev/projects/translator

# Find and replace in all files
echo "Replacing github.com/komapc/ido-epo-translator → github.com/komapc/ido-epo-translator"
find . -type f \( -name "*.md" -o -name "*.sh" -o -name "*.yml" \) \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./ido-epo-translator/*" \
    -exec sed -i 's|github\.com/komapc/vortaro|github.com/komapc/ido-epo-translator|g' {} +

echo "Replacing ido-epo-translator.pages.dev → ido-epo-translator.pages.dev"
find . -type f \( -name "*.md" -o -name "*.sh" -o -name "*.yml" \) \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./ido-epo-translator/*" \
    -exec sed -i 's|vortaro\.pages\.dev|ido-epo-translator.pages.dev|g' {} +

echo "Replacing 'cd ido-epo-translator' → 'cd ido-epo-translator'"
find . -type f \( -name "*.md" -o -name "*.sh" \) \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./ido-epo-translator/*" \
    -exec sed -i 's|cd ido-epo-translator|cd ido-epo-translator|g' {} +

echo "Replacing 'Repository: vortaro' → 'Repository: ido-epo-translator'"
find . -type f -name "*.md" \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./ido-epo-translator/*" \
    -exec sed -i 's|Repository: vortaro|Repository: ido-epo-translator|g' {} +

echo "Replacing 'vortaro/**' → 'projects/translator/**' (for GitHub Actions paths)"
find . -type f \( -name "*.md" -o -name "*.yml" \) \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -not -path "./ido-epo-translator/*" \
    -exec sed -i 's|vortaro/\*\*|projects/translator/**|g' {} +

echo ""
echo "=== Done ==="
echo ""
echo "Files modified. Review changes with:"
echo "  git diff"
echo ""
echo "Note: The footer 'Vortaro - Making Ido...' is kept as it's the project tagline"
