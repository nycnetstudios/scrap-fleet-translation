# Contributing translations / Contribuindo com traduções

## File format

Translation files are UTF-8 CSV files with exactly these columns:

```text
key,en,translation
```

- `key` is a stable technical identifier. Never translate or rename it.
- `en` is the English reference. Never edit it in a translation file.
- `translation` is the only column contributors should edit.
- Keep placeholders exactly as written, including `{name}`, `%d`, `%s` and `\n`.
- Use literal `\n` for line breaks; do not insert a physical line break inside a cell.
- Empty translations are allowed while work is in progress and fall back to English in the game.
- Save the file with a valid locale name, for example `es.csv`, `pt_BR.csv` or `zh_CN.csv`.

## Recommended workflow

1. Fork this repository.
2. Copy `translations/template.csv` to `translations/<locale>.csv`.
3. Translate the `translation` column.
4. Run `node scripts/validate_translations.mjs` locally if Node.js is available.
5. Open a Pull Request and mention the language, locale and game version used.

Small corrections may be submitted through the translation issue form instead.

## Review

Automated checks validate file structure, duplicate or missing keys, the English reference and placeholders. A maintainer still reviews tone, terminology and context before merging. Translation acceptance does not guarantee inclusion in the next build.

## Português

- Edite somente a coluna `translation`.
- Não altere as colunas `key` e `en`.
- Preserve exatamente placeholders como `{name}`, `%d`, `%s` e `\n`.
- Use nomes de locale como `es`, `fr_CA` ou `pt_BR`.
- Traduções vazias são permitidas durante o trabalho e usam o inglês como fallback no jogo.
- Antes do envio, execute `node scripts/validate_translations.mjs` se tiver Node.js instalado.

Ao enviar uma contribuição, você declara que criou ou tem permissão para fornecer o texto e autoriza a NYC Net Studios a usar, adaptar e distribuir essa tradução como parte de STARGRAVE.
