"""Download a small text corpus and train TinyGPT."""
import argparse
import os
import urllib.request

import torch

from model import CharTokenizer, TinyGPT

DATA_URL = "https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt"


def get_text(path: str) -> str:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    if not os.path.exists(path):
        print("Downloading tiny Shakespeare training text...")
        urllib.request.urlretrieve(DATA_URL, path)
    with open(path, "r", encoding="utf-8") as file:
        return file.read()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--steps", type=int, default=3000)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--block-size", type=int, default=128)
    parser.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto")
    parser.add_argument("--data", default="data/input.txt")
    parser.add_argument("--out", default="checkpoints/tiny_gpt.pt")
    args = parser.parse_args()

    if args.steps < 1:
        raise ValueError("--steps must be positive")
    device = "cuda" if args.device == "auto" and torch.cuda.is_available() else args.device
    if device == "auto":
        device = "cpu"
    if device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA requested but unavailable. Use --device cpu.")

    torch.manual_seed(1337)
    text = get_text(args.data)
    tokenizer = CharTokenizer(text)
    ids = torch.tensor(tokenizer.encode(text), dtype=torch.long)
    split = int(0.9 * len(ids))
    train_ids, val_ids = ids[:split], ids[split:]
    if len(train_ids) <= args.block_size or len(val_ids) <= args.block_size:
        raise ValueError("Dataset is too small for the selected block size")

    def batch(source):
        starts = torch.randint(len(source) - args.block_size - 1, (args.batch_size,))
        x = torch.stack([source[i:i + args.block_size] for i in starts])
        y = torch.stack([source[i + 1:i + args.block_size + 1] for i in starts])
        return x.to(device), y.to(device)

    model = TinyGPT(tokenizer.vocab_size, block_size=args.block_size).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)
    print(f"device={device} vocab={tokenizer.vocab_size} parameters={sum(p.numel() for p in model.parameters()):,}")

    for step in range(args.steps):
        model.train()
        xb, yb = batch(train_ids)
        _, loss = model(xb, yb)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()

        if step % 100 == 0 or step == args.steps - 1:
            model.eval()
            with torch.no_grad():
                vx, vy = batch(val_ids)
                _, val_loss = model(vx, vy)
            print(f"step {step:5d} | train {loss.item():.4f} | val {val_loss.item():.4f}")

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    torch.save(
        {
            "model": model.state_dict(),
            "tokenizer": tokenizer.to_dict(),
            "config": {
                "block_size": args.block_size,
                "n_embd": 128,
                "n_head": 4,
                "n_layer": 4,
            },
        },
        args.out,
    )
    print(f"Saved checkpoint: {args.out}")


if __name__ == "__main__":
    main()
