# Building an Ido→Esperanto Translator: When LLMs Fail, Try Rule-Based MT


---

> **TL;DR:** Built a machine translator for Ido (a 1907 constructed language) using Apertium rule-based MT. LLMs don't work for low-resource languages. The real challenge wasn't the rules—it was building a 14,000-entry dictionary from scratch using Wiktionary mining and BERT embeddings.

---

## The Problem: Understanding Ido

I wanted to read texts in **Ido** - a constructed language from 1907, designed as a "reformed Esperanto." About 13,000 Wikipedia articles exist in Ido, plus historical texts and a small active community.

The catch? I understand Esperanto, but not Ido. They're similar (~70% mutual intelligibility for simple texts), but different enough that reading Ido feels like reading through fog. My solution: build a translator.

**The real motivation:** I'd heard that Ido Wikipedia is largely machine-generated garbage. To verify this, I needed to actually *read* those articles - which meant translating them first. (Spoiler: yes, much of it is low-quality stub articles generated from templates.)

**What is Ido?**

| | Esperanto | Ido |
|---|-----------|-----|
| Created | 1887 | 1907 |
| Creator | L.L. Zamenhof | Delegation committee |
| Wikipedia articles | 350,000+ | ~13,000 |
| Design goal | International auxiliary | "Improved" Esperanto |
| Key differences | -j plurals, -n accusative always | -i plurals, -n accusative optional |

**Why not use an LLM?**

- No major LLM (GPT-4, Claude, Llama) understands Ido well
- Training data is too scarce (~13,000 Wikipedia articles vs billions for major languages)
- When asked to translate Ido, LLMs either hallucinate or confuse it with Esperanto/Italian
- Fine-tuning attempts failed due to data scarcity

---

## Failed Approaches

### 1. Fine-tuning LLMs

Tried fine-tuning smaller models on Ido text. The problem: even the entire Ido Wikipedia (~390K sentences) isn't enough to teach a language model translation and get good results.

### 2. Parsing from scratch

Building a full NLP pipeline (tokenizer → parser → semantic analysis → generation) would take years for a side project. Both Ido and Esperanto have regular grammar, but implementing full syntactic parsing is still a massive undertaking. (Actually, I need to implement just Ido, Esperanto grammar is already done)

---

## The Solution: Apertium

**Apertium** is an open-source rule-based machine translation platform, originally designed for closely-related language pairs (Spanish↔Catalan, Norwegian↔Swedish, etc.).

*To test my understanding of Apertium before starting this project, I fixed a [gender agreement bug in predicative adjectives](https://github.com/apertium/apertium-bel-rus/pull/1) for the Russian↔Belarusian pair. Turns out, contributing to open-source MT is approachable!*

**Why Apertium works for Ido↔Esperanto:**

- Both are constructed languages with **100% regular grammar** - no exceptions
- Shared Latin/Romance roots and similar morphology
- No need for statistical training - just rules and dictionaries
- The "shallow transfer" approach is perfect: no need to fully parse sentences

**Example translation:**

```
Input (Ido):    "La hundo rapide kuris al la domo."
                 ↓ morphological analysis
                 ↓ lexical transfer  
                 ↓ structural transfer
Output (Esperanto): "La hundo rapide kuris al la domo."
```

*(This example happens to be identical - but many words differ!)*

---

## How Apertium Works

Apertium uses a **shallow-transfer architecture** - it doesn't build full parse trees, just processes word-by-word with some local context:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│    Input    │    │ Morphology  │    │   Lexical   │    │ Structural  │
│    Text     │───▶│  Analysis   │───▶│  Transfer   │───▶│  Transfer   │
│   (Ido)     │    │  (monodix)  │    │   (bidix)   │    │    (t1x)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                                                         │
      │            ┌─────────────┐    ┌─────────────┐           │
      │            │   Output    │    │ Morphology  │           │
      └───────────▶│    Text     │◀───│ Generation  │◀──────────┘
                   │ (Esperanto) │    │  (monodix)  │
                   └─────────────┘    └─────────────┘
```

### The Pipeline Steps:

1. **Morphological analysis** (monodix): Break words into lemma + tags
   - Input: `hundi` → Output: `hundo<n><pl>` (dog, noun, plural)

2. **Lexical transfer** (bidix): Map source lemmas to target lemmas
   - `hundo` (Ido) → `hundo` (Esperanto)

3. **Structural transfer** (t1x rules): Handle grammar transformations
   - Word reordering, agreement, case marking

4. **Morphological generation**: Produce surface forms
   - `hundo<n><pl><acc>` → `hundojn`

### Key Files in Apertium:

| File | Purpose | Size |
|------|---------|------|
| `apertium-ido.ido.dix` | Ido morphological dictionary | ~13,000 paradigm entries |
| `apertium-ido-epo.ido-epo.dix` | Bilingual Ido↔Esperanto dictionary | ~14,000 word pairs |
| `apertium-ido-epo.ido-epo.t1x` | Transfer rules | ~1,600 lines of XML |

### Non-Trivial Transformation Rules

The rules aren't just 1:1 mappings. Some interesting cases:

**Plurals (-i vs -j):**
- Ido: `hundo` → `hundi` (dogs)
- Esperanto: `hundo` → `hundoj` (dogs)
- Seems simple, but adjectives too: Ido `bona hundi` → Esperanto `bonaj hundoj`

**Accusative case:**
- Ido uses `-n` suffix **only for disambiguation** (when word order is unusual)
- Esperanto **always** marks direct objects with `-n`
- Rule must detect object position and add accusative
- Example: Ido `Me vidas la hundo` → Esperanto `Mi vidas la hundon`

**Correlatives (question/demonstrative words):**
- Ido redesigned Esperanto's correlative table
- `qui` → `kiu` (who), `quo` → `kio` (what), `ube` → `kie` (where)
- `ita` → `tiu` (that), `ica` → `ĉi tiu` (this)
- These are high-frequency words, so getting them right is critical

**Passive voice:**
- Ido: synthetic passive with `-es-` infix: `kreatas` → `kreesas` (is being created)
- Esperanto: periphrastic passive: `estas kreata`
- Rule must decompose and restructure

**Special characters:**
- Ido uses plain ASCII: `c`, `g`, `h`, `j`, `s`, `u`
- Esperanto uses diacritics: `ĉ`, `ĝ`, `ĥ`, `ĵ`, `ŝ`, `ŭ`
- `gardeno` → `ĝardeno` (garden), `cambro` → `ĉambro` (room)

**Verb tenses:**
- Direct mapping: `-is` (past), `-as` (present), `-os` (future)
- But participles differ: Ido `-anta/-inta/-onta` need context-aware translation

**Real example showing multiple differences:**

```
Ido:       "Me havas tri kati qui ludas en la gardeno."
Esperanto: "Mi havas tri katojn kiuj ludas en la ĝardeno."

Transformations applied:
  me → mi              (pronoun)
  kati → katojn        (plural -i→-oj + accusative -n added)
  qui → kiuj           (correlative + plural agreement)
  gardeno → ĝardeno    (special character g→ĝ)
```

---

## The Real Challenge: The Dictionary

**Surprising discovery:** There was NO good Ido↔Esperanto dictionary anywhere!

- Academic Ido resources assume you already know Esperanto
- Online dictionaries are Ido→English or Ido→German
- Wiktionary has scattered data but no unified resource

### Sources I Used

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DICTIONARY SOURCES                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐         │
│   │  Wiktionary   │   │   Wikipedia   │   │     BERT      │         │
│   │  (io,eo,en)   │   │  Lang Links   │   │  Embeddings   │         │
│   │    ~8,200     │   │   ~24,400     │   │    ~4,900     │         │
│   └───────┬───────┘   └───────┬───────┘   └───────┬───────┘         │
│           │                   │                   │                  │
│           └───────────────────┼───────────────────┘                  │
│                               ▼                                      │
│                     ┌─────────────────┐                              │
│                     │  Merge + Dedup  │                              │
│                     │    Pipeline     │                              │
│                     └────────┬────────┘                              │
│                              ▼                                       │
│                     ┌─────────────────┐                              │
│                     │    ~14,000      │                              │
│                     │  Unique Pairs   │                              │
│                     └─────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
```

| Source | Raw Entries | Quality | Notes |
|--------|-------------|---------|-------|
| Ido Wiktionary (io.wiktionary.org) | 7,287 | High | Direct io→eo translations |
| Ido Wikipedia language links | 24,402 | Medium | Mostly proper nouns (people, places) |
| BERT embedding alignment | 4,942 | Medium | Automatic discovery (see below) |
| English Wiktionary (pivot) | 879 | Medium | io→en + en→eo combined |
| Function words (manual) | 25 | High | Critical: la, da, di, e, od, etc. |

### Extraction Pipeline:

```bash
# 1. Download Wikimedia dumps (~200MB each)
./scripts/download_dumps.sh

# 2. Parse XML, extract translations (two-stage for resumability)
python3 scripts/parse_wiktionary_io.py  # Stage 1: XML → JSON
python3 scripts/parse_wiktionary_io.py  # Stage 2: JSON → final

# 3. Merge all sources with conflict resolution
python3 scripts/merge_sources.py

# 4. Export to Apertium XML format
python3 scripts/generate_bidix.py
```

### Pivot Translations

When no direct io↔eo translation exists, we use intermediate languages:

```
Ido "problemo" ──┐
                 │
    ┌────────────▼────────────┐
    │   French Wiktionary     │
    │   io → fr: "problème"   │
    │   fr → eo: "problemo"   │
    └────────────┬────────────┘
                 │
                 ▼
    Esperanto "problemo" (via French)
```

These "via" translations are marked with lower confidence and can be filtered in the UI.

---

## BERT Embedding Alignment

Wiktionary data covered common words, but missed many. Next approach: **cross-lingual word embeddings**.

The idea: words with similar meanings should have similar vector representations. If we can align Ido and Esperanto embedding spaces, we can find translations by nearest-neighbor search.

### Training Corpus

Ido Wikipedia alone (~13K articles) wasn't enough text for quality embeddings. I also scraped **Ido Wikisource** - which contains older literary texts, translations of classics, and original Ido works. Combined corpus: ~392K sentences.

### Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BERT ALIGNMENT PIPELINE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. FINE-TUNE XLM-RoBERTa              2. EXTRACT EMBEDDINGS         │
│  ┌────────────────────────┐            ┌────────────────────────┐   │
│  │   Ido Wikipedia +      │            │   For each word:       │   │
│  │   Wikisource           │───────────▶│   word → BERT → vector │   │
│  │   392K sentences       │            │   5,000 Ido words      │   │
│  │   11.5h on g4dn.xlarge │            │   5,000 Esperanto words│   │
│  │   Cost: ~$6            │            └───────────┬────────────┘   │
│  └────────────────────────┘                        │                 │
│                                                    │                 │
│  3. DISCOVER COGNATES                              ▼                 │
│  ┌────────────────────────┐            ┌────────────────────────┐   │
│  │  Identical words:      │            │  4. PROCRUSTES ALIGN   │   │
│  │  homo=homo, urbo=urbo  │───────────▶│  Rotate Ido space to   │   │
│  │  ~1,000 seed pairs     │            │  match Esperanto space │   │
│  │  (20% vocabulary!)     │            └───────────┬────────────┘   │
│  └────────────────────────┘                        │                 │
│                                                    ▼                 │
│                                        ┌────────────────────────┐   │
│                                        │  5. FIND TRANSLATIONS  │   │
│                                        │  Cosine similarity     │   │
│                                        │  → 50K candidates      │   │
│                                        │  100% precision on     │   │
│                                        │  seed dictionary!      │   │
│                                        └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Insight: Automatic Cognate Discovery

Ido and Esperanto share ~20% identical vocabulary (both derive from Romance languages). This means we don't need a manual seed dictionary - we can automatically find words spelled identically in both languages and use them as anchors for alignment.

**Result:** 4,942 high-quality translation candidates added to the dictionary.

---

## Vortaro: The Dictionary as a Byproduct

All this dictionary work produced a useful standalone tool: **[Vortaro](https://ido-vortaro.pages.dev/)** - an online Ido↔Esperanto dictionary.

**Features:**
- 🔍 Bidirectional search (Ido↔Esperanto)
- 🎲 Random word discovery
- 🔽 Filter by source (Wiktionary, Wikipedia, BERT)
- 🏷️ Part-of-speech badges
- 📱 Mobile-optimized
- ⚡ Works offline (pure static site, no backend)

**Live:** https://ido-vortaro.pages.dev/

---

## Current Status (December 2025)

| Metric | Value |
|--------|-------|
| Bidix entries | ~14,000 unique pairs |
| Source entries (pre-merge) | 37,500+ |
| Monodix paradigms | ~13,000 |
| Transfer rules | 1,585 lines |
| Training corpus | 392K sentences (Wikipedia + Wikisource) |
| Data sources | 5 (Wiktionary×3, Wikipedia, BERT, manual) |
| Translation quality | Usable for basic-intermediate texts |

**Live translator:** https://ido-epo-translator.pages.dev

### What Works Well

- ✅ Basic vocabulary and common phrases
- ✅ Regular verb conjugations
- ✅ Noun/adjective morphology
- ✅ Proper nouns (Wikipedia data)

### Known Limitations

- ⚠️ Accusative case handling needs improvement
- ⚠️ Some rare words missing from dictionary
- ⚠️ Complex sentences may have word order issues

### Next Steps

- Submit to official Apertium project (upstream)
- Improve accusative detection rules
- Add more data sources (German Wiktionary?)
- Community contributions welcome

---

## Meta: Vibe Coding Experiment

This project was also an experiment in **"vibe coding"** - using AI assistants extensively for development:

| Tool | Use Case |
|------|----------|
| **Cursor** + Claude | Primary development, code generation, refactoring |
| **Kiro** (AWS) | Some infrastructure/Terraform work |
| **GPT-4** | Research, documentation drafts |
| **Claude Opus/Sonnet** | Complex reasoning, architecture decisions |

---

## Conclusion

When LLMs fail due to data scarcity, **rule-based approaches can work surprisingly well** - especially for related languages.

The main challenge wasn't writing the rules (Ido↔Esperanto grammar transformation is relatively straightforward), but **building the dictionary from scratch**. This required:

1. Mining multiple Wiktionary editions
2. Extracting Wikipedia language links
3. Training BERT embeddings for automatic alignment
4. Carefully merging sources with conflict resolution

### Lessons Learned

1. **Low-resource languages need different approaches** - don't default to LLMs
2. **Data is the bottleneck** - the rules took days, the dictionary took months
3. **Existing tools are underrated** - Apertium has 40+ language pairs and great documentation
4. **Side projects can produce useful tools** - Vortaro is now used by the Ido community

### Try It Yourself

If you're working with a low-resource language pair, consider Apertium. The learning curve is manageable, and you might be surprised how well rule-based MT works for related languages.

---

## Links

| Resource | URL |
|----------|-----|
| **Live Translator** | https://ido-epo-translator.pages.dev |
| **Dictionary (Vortaro)** | https://ido-vortaro.pages.dev/ |
| **Apertium Pair (source)** | https://github.com/komapc/apertium-ido-epo |
| **Extractor Pipeline** | https://github.com/komapc/ido-esperanto-extractor |
| **BERT Aligner** | (in main repo under `projects/embedding-aligner/`) |

---

*Tags: NLP, machine translation, Apertium, Ido, Esperanto, constructed languages, BERT, cross-lingual embeddings, rule-based MT, vibe coding*
