#!/usr/bin/env python3
"""Validate community translation CSVs using only the Python standard library."""

from __future__ import annotations

import csv
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "reference" / "source.csv"
TRANSLATIONS_DIR = ROOT / "translations"
PLACEHOLDER = re.compile(r"\{[^{}]+\}|%(?:\d+\$)?[sdif]")
LOCALE_NAME = re.compile(r"^(template|[a-z]{2,3}(?:_[A-Z]{2})?)\.csv$")


def read_rows(path: Path, expected_header: list[str]) -> list[dict[str, str]]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != expected_header:
            raise ValueError(f"invalid header {reader.fieldnames!r}; expected {expected_header!r}")
        return list(reader)


def placeholders(value: str) -> list[str]:
    return sorted(PLACEHOLDER.findall(value))


def validate_file(path: Path, source: dict[str, str], source_order: list[str]) -> list[str]:
    errors: list[str] = []
    if not LOCALE_NAME.fullmatch(path.name):
        errors.append(f"{path}: invalid locale filename")
    try:
        rows = read_rows(path, ["key", "en", "translation"])
    except (OSError, UnicodeError, csv.Error, ValueError) as exc:
        return [f"{path}: {exc}"]
    seen: set[str] = set()
    order: list[str] = []
    for line, row in enumerate(rows, start=2):
        key = row["key"].strip()
        english = row["en"]
        translated = row["translation"]
        if not key:
            errors.append(f"{path}:{line}: empty key")
            continue
        if key in seen:
            errors.append(f"{path}:{line}: duplicate key {key}")
        seen.add(key)
        order.append(key)
        if key not in source:
            errors.append(f"{path}:{line}: unknown key {key}")
            continue
        if english != source[key]:
            errors.append(f"{path}:{line}: English reference changed for {key}")
        if "\n" in translated or "\r" in translated:
            errors.append(f"{path}:{line}: use literal \\n instead of a physical line break")
        if translated and placeholders(translated) != placeholders(english):
            errors.append(f"{path}:{line}: placeholders differ for {key}: {placeholders(english)} != {placeholders(translated)}")
    missing = [key for key in source_order if key not in seen]
    if missing:
        errors.append(f"{path}: missing {len(missing)} keys: {', '.join(missing[:8])}")
    if order != source_order:
        errors.append(f"{path}: keys must keep the same order as reference/source.csv")
    return errors


def main() -> int:
    try:
        source_rows = read_rows(SOURCE_PATH, ["key", "en"])
    except (OSError, UnicodeError, csv.Error, ValueError) as exc:
        print(f"ERROR: {SOURCE_PATH}: {exc}")
        return 1
    source_order = [row["key"].strip() for row in source_rows]
    if len(source_order) != len(set(source_order)):
        print("ERROR: duplicate keys in reference/source.csv")
        return 1
    source = {row["key"].strip(): row["en"] for row in source_rows}
    files = sorted(TRANSLATIONS_DIR.glob("*.csv"))
    errors: list[str] = []
    for path in files:
        errors.extend(validate_file(path, source, source_order))
    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        return 1
    print(f"TRANSLATION_VALIDATION_OK:{len(files)} files:{len(source_order)} keys")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
