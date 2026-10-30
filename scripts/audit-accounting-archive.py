#!/usr/bin/env python3
"""Safely inventory and extract source-only files from the accounting ZIP."""
from __future__ import annotations
import argparse, hashlib, json, re, zipfile
from collections import Counter
from pathlib import Path, PurePosixPath

SOURCE_EXTS = {
    ".cs", ".csproj", ".sln", ".ts", ".tsx", ".js", ".jsx", ".json", ".xml",
    ".config", ".yml", ".yaml", ".md", ".txt", ".sql", ".py", ".sh", ".html",
    ".css", ".scss", ".razor", ".cshtml", ".resx", ".props", ".targets"
}
DENY_SUFFIXES = {".pfx", ".p12", ".key", ".pem", ".jks", ".keystore", ".bak",
                 ".mdf", ".ldf", ".db", ".sqlite", ".sqlite3", ".dump"}
DENY_NAMES = {".env", "appsettings.production.json", "secrets.json", "id_rsa", "id_ed25519"}
SECRET_PATTERNS = [
    re.compile(rb"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(rb"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
    re.compile(rb"\bAKIA[0-9A-Z]{16}\b"),
    re.compile(rb"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
    re.compile(rb"\bsk_live_[A-Za-z0-9]{16,}\b"),
    re.compile(rb"(?i)(password|pwd)\s*[:=]\s*['\"][^'\"]{8,}['\"]"),
]
MAX_FILES, MAX_TOTAL, MAX_FILE = 5000, 100 * 1024 * 1024, 10 * 1024 * 1024

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--archive", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    archive, out = Path(args.archive), Path(args.out)
    extracted = out / "source"
    extracted.mkdir(parents=True, exist_ok=True)
    manifest = []
    ext_counts = Counter()
    total = 0
    blocked = []
    secret_hits = []
    with zipfile.ZipFile(archive) as zf:
        infos = zf.infolist()
        if len(infos) > MAX_FILES:
            raise SystemExit(f"Archive has too many entries: {len(infos)}")
        for info in infos:
            raw = info.filename.replace("\\", "/")
            rel = PurePosixPath(raw)
            if rel.is_absolute() or ".." in rel.parts:
                blocked.append({"path": raw, "reason": "unsafe_path"})
                continue
            if info.is_dir():
                continue
            size = info.file_size
            total += size
            if total > MAX_TOTAL or size > MAX_FILE:
                blocked.append({"path": raw, "reason": "size_limit"})
                continue
            name = rel.name.lower()
            suffix = Path(name).suffix.lower()
            ext_counts[suffix or "[no extension]"] += 1
            if name in DENY_NAMES or suffix in DENY_SUFFIXES:
                blocked.append({"path": raw, "reason": "sensitive_or_binary_file"})
                continue
            if suffix not in SOURCE_EXTS:
                blocked.append({"path": raw, "reason": "non_source_file"})
                continue
            data = zf.read(info)
            hits = [p.pattern.decode("ascii", "ignore") for p in SECRET_PATTERNS if p.search(data)]
            if hits:
                secret_hits.append({"path": raw, "patterns": hits})
                continue
            target = extracted.joinpath(*rel.parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            manifest.append({
                "path": raw, "size": size, "sha256": hashlib.sha256(data).hexdigest(),
                "extension": suffix or "[no extension]"
            })
    report = {
        "archive": archive.name,
        "entries": len(manifest) + len(blocked) + len(secret_hits),
        "extracted_source_files": len(manifest),
        "uncompressed_bytes_seen": total,
        "extensions": dict(ext_counts),
        "blocked": blocked,
        "secret_findings": secret_hits,
        "files": manifest,
        "safe_to_review": not secret_hits and not any(x["reason"] == "unsafe_path" for x in blocked),
    }
    out.mkdir(parents=True, exist_ok=True)
    (out / "manifest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    lines = [
        "# Accounting archive source inventory", "",
        f"- Archive: `{archive.name}`",
        f"- Extracted source files: {len(manifest)}",
        f"- Blocked entries: {len(blocked)}",
        f"- Potential secret findings: {len(secret_hits)}",
        f"- Safe to review: {'yes' if report['safe_to_review'] else 'no'}",
        "", "## Extensions", ""
    ]
    lines.extend(f"- `{ext}`: {count}" for ext, count in sorted(ext_counts.items()))
    lines += ["", "## Files", "", "| Path | Bytes | SHA-256 |", "|---|---:|---|"]
    lines.extend(f"| `{x['path']}` | {x['size']} | `{x['sha256']}` |" for x in manifest)
    lines += ["", "## Blocked entries", ""]
    lines.extend(f"- `{x['path']}`: {x['reason']}" for x in blocked)
    lines += ["", "## Secret scan", ""]
    lines.extend(f"- `{x['path']}`: {', '.join(x['patterns'])}" for x in secret_hits)
    (out / "inventory.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    if secret_hits or any(x["reason"] == "unsafe_path" for x in blocked):
        raise SystemExit("Unsafe archive content detected; do not publish extracted files.")
    print(f"ACCOUNTING_SOURCE_FILES={len(manifest)}")
    print(f"ACCOUNTING_BLOCKED_FILES={len(blocked)}")
    print(f"ACCOUNTING_TOTAL_BYTES={total}")

if __name__ == "__main__":
    main()
