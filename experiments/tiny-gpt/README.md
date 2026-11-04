# Tiny GPT — build an AI model from scratch

A small decoder-only Transformer language model implemented in plain PyTorch. It does **not** call Gemini, Claude, OpenAI, or any hosted LLM API.

This is an educational, runnable starting point—not a Claude-scale model. It learns next-character prediction from a text corpus.

## 1. Setup

Python 3.10+ is recommended.

```bash
cd experiments/tiny-gpt
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows:
# .venv\Scripts\activate
pip install -r requirements.txt
```

## 2. Train

```bash
python train.py --steps 3000
```

The script downloads the tiny Shakespeare text corpus on first run, creates a character vocabulary, trains a small GPT-style Transformer, and saves `checkpoints/tiny_gpt.pt`.

Use `--device cpu` to force CPU, or leave the default `auto` to use CUDA when available.

## 3. Generate text

```bash
python generate.py --prompt "ROMEO:" --max-new-tokens 300
```

## What is implemented?

- Character tokenizer (simple and transparent)
- Token and positional embeddings
- Causal self-attention (future tokens are masked)
- Multi-head attention, feed-forward blocks, residual connections and LayerNorm
- Next-token cross-entropy training
- Checkpoint save/load and autoregressive sampling

## Limitations

The bundled training corpus and model are deliberately tiny. Output quality will be limited and may be incoherent. This project demonstrates the mechanics of a language model; it is not a pretrained general-purpose assistant. Better capability requires substantially more data, compute, evaluation, and safety work.

## Project layout

- `model.py` — tokenizer and Transformer
- `train.py` — dataset download and training loop
- `generate.py` — load a checkpoint and sample text
- `requirements.txt` — dependencies
