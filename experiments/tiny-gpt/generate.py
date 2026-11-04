"""Generate text from a trained TinyGPT checkpoint."""
import argparse

import torch

from model import CharTokenizer, TinyGPT


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", default="checkpoints/tiny_gpt.pt")
    parser.add_argument("--prompt", default="")
    parser.add_argument("--max-new-tokens", type=int, default=300)
    parser.add_argument("--temperature", type=float, default=0.8)
    parser.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto")
    args = parser.parse_args()

    device = "cuda" if args.device == "auto" and torch.cuda.is_available() else args.device
    if device == "auto":
        device = "cpu"
    if device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA requested but unavailable. Use --device cpu.")

    checkpoint = torch.load(args.checkpoint, map_location=device, weights_only=False)
    tokenizer = CharTokenizer.from_dict(checkpoint["tokenizer"])
    config = checkpoint["config"]
    model = TinyGPT(tokenizer.vocab_size, **config).to(device)
    model.load_state_dict(checkpoint["model"])
    model.eval()

    prompt_ids = tokenizer.encode(args.prompt)
    if not prompt_ids:
        prompt_ids = [0]
    context = torch.tensor([prompt_ids], dtype=torch.long, device=device)
    output = model.generate(context, args.max_new_tokens, args.temperature)[0].tolist()
    print(tokenizer.decode(output))


if __name__ == "__main__":
    main()
