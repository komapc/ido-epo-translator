# Dictionary Regeneration Workflow

## Overview

Dictionaries are now generated from unified JSON sources using an automated pipeline. This document describes the new workflow for regenerating and deploying dictionaries.

## Quick Regeneration

```bash
cd /home/mark/apertium-gemini/projects/data
python3 scripts/regenerate_all.py
```

**Time:** ~5 seconds (using cached merged files)

## Output Files

The regeneration script produces:

1. **Monodix:** `generated/ido.ido.dix` (8,604 entries)
2. **Bidix:** `generated/ido-epo.ido-epo.dix` (13,629 entries)
3. **Vortaro:** `generated/vortaro_dictionary.json` (12,650 entries)

## Pipeline Architecture

```
Wikipedia/Wiktionary → Extractors → Unified JSON → Merge → Generate DIX → Apertium
                                                              ↓
                                                         Vortaro Export
```

### Sources (4)

- `source_ido_lexicon.json` - YAML lexicon (8,604 entries, confidence: 1.0)
- `source_io_wiktionary.json` - Ido Wiktionary (7,243 entries, confidence: 1.0)
- `source_io_wikipedia.json` - Ido Wikipedia (5,031 entries, confidence: 0.9)
- `source_en_pivot.json` - English pivot (879 entries, confidence: 0.8)

### Processing

1. **Validation:** JSON schema validation
2. **Merge:** Intelligent deduplication (21,757 → 21,249 entries)
3. **Split:** Bidix (12,650 with translations) + Monodix (21,249 all)
4. **Generate:** Create Apertium .dix XML files
5. **Export:** Create vortaro JSON

### Results

- **13,629 bidix entries** (+60% vs previous)
- **Multi-source provenance** tracking
- **Confidence scores** for quality
- **Automated regeneration** in 5 seconds

## Deployment Steps

### 1. Regenerate Dictionaries

```bash
cd /home/mark/apertium-gemini/projects/data
python3 scripts/regenerate_all.py
```

### 2. Merge Paradigm Definitions (Monodix Only)

The monodix needs paradigm definitions merged in. Create a script or manually:

```bash
# Extract paradigms from current monodix
cd ../../apertium/apertium-ido
xmllint --xpath '//pardefs' apertium-ido.ido.dix > /tmp/paradigms.xml

# Edit ../../projects/data/generated/ido.ido.dix
# Replace <pardefs><!-- comment --></pardefs> with actual paradigms
```

### 3. Copy to Apertium Directories

```bash
# Backup current files
cd /home/mark/apertium-gemini/apertium
cp apertium-ido/apertium-ido.ido.dix apertium-ido/apertium-ido.ido.dix.backup
cp apertium-ido-epo/apertium-ido-epo.ido-epo.dix apertium-ido-epo/apertium-ido-epo.ido-epo.dix.backup

# Copy generated files
cp ../projects/data/generated/ido.ido.dix apertium-ido/
cp ../projects/data/generated/ido-epo.ido-epo.dix apertium-ido-epo/
```

### 4. Recompile

```bash
cd apertium-ido
make clean && make

cd ../apertium-ido-epo
make clean && make
```

### 5. Test

```bash
cd /home/mark/apertium-gemini/apertium/apertium-ido-epo

# Test basic translations
echo "personi" | apertium -d . ido-epo
echo "la hundo" | apertium -d . ido-epo
echo "me amas tu" | apertium -d . ido-epo
```

### 6. Deploy to Production

After testing:
- Commit changes to apertium repos
- Deploy translator with updated dictionaries
- Update vortaro with new dictionary.json

## Advanced Usage

### Regenerate with Custom Settings

```bash
# Skip validation (faster)
python3 scripts/regenerate_all.py --skip-validation

# Use existing merged files (fastest)
python3 scripts/regenerate_all.py --skip-validation --skip-merge

# Set minimum confidence threshold
python3 scripts/regenerate_all.py --min-confidence 0.8

# Generate without POS tags
python3 scripts/regenerate_all.py --no-pos

# Validate XML output
python3 scripts/regenerate_all.py --validate-xml
```

### Individual Generation

```bash
cd /home/mark/apertium-gemini/projects/data

# Generate monodix only
python3 scripts/generate_monodix.py \
  --input merged/merged_monodix.json \
  --output generated/ido.ido.dix

# Generate bidix only
python3 scripts/generate_bidix.py \
  --input merged/merged_bidix.json \
  --output generated/ido-epo.ido-epo.dix

# Export vortaro only
python3 scripts/export_vortaro.py
```

### Regenerate Sources

To re-extract from Wikipedia/Wiktionary:

```bash
cd /home/mark/apertium-gemini/projects/extractor
make regenerate-fast  # ~1 hour
```

Then regenerate dictionaries as above.

## Data Format

All sources use the unified JSON format. See `projects/data/README.md` for details.

### Sample Entry

```json
{
  "lemma": "kavalo",
  "source": "io_wiktionary",
  "pos": "n",
  "morphology": {
    "paradigm": "o__n"
  },
  "translations": [
    {
      "term": "ĉevalo",
      "lang": "eo",
      "confidence": 1.0,
      "sources": ["io_wiktionary", "en_pivot"]
    }
  ]
}
```

## Statistics

### Current Generation

- **Total entries:** 21,249 (after deduplication)
- **With translations:** 12,650
- **With morphology:** 8,604
- **With POS tags:** 5,031 (40% coverage)

### Sources Breakdown

| Source | Entries | Confidence |
|--------|---------|------------|
| ido_lexicon | 8,604 | 1.0 |
| io_wiktionary | 7,243 | 1.0 |
| io_wikipedia | 5,031 | 0.9 |
| en_pivot | 879 | 0.8 |

### Improvement

- **Before:** ~8,500 bidix entries
- **After:** 13,629 bidix entries
- **Increase:** +60% vocabulary coverage

## Troubleshooting

### Validation Errors

If schema validation fails:
```bash
python3 scripts/validate_schema.py --all
```

### XML Errors

If generated XML is invalid:
```bash
xmllint --noout generated/ido.ido.dix
xmllint --noout generated/ido-epo.ido-epo.dix
```

### Compilation Errors

If Apertium compilation fails:
- Check paradigm definitions in monodix
- Verify file paths are correct
- Check for special characters in entries

## Related Documentation

- **Format Specification:** `projects/data/README.md`
- **Implementation Details:** `SESSION_2025-12-04_DIX_GENERATION.md`
- **Investigation Report:** `projects/data/BIDIX_POS_INVESTIGATION.md`
- **TODO List:** `TODO.md`

## Contact

For issues or questions about the regeneration pipeline, see project documentation or create an issue.

---

**Last Updated:** December 4, 2025  
**Pipeline Version:** 1.0  
**Status:** Production Ready


