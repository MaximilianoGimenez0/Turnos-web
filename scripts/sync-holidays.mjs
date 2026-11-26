#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

export const DEFAULT_HOLIDAYS_YEAR = 2026;
export const DEFAULT_HOLIDAYS_TIMEZONE = 'America/Argentina/Buenos_Aires';
export const DEFAULT_HOLIDAYS_OUTPUT_PATH = path.join(REPO_ROOT, 'src', 'data', 'holidays.json');

export const buildOfficialArgentinaHolidaysUrl = (year = DEFAULT_HOLIDAYS_YEAR) =>
  `https://www.argentina.gob.ar/sites/default/files/holidays-${year}-es.json`;

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const stripDiacritics = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const normalizeHolidayType = (rawType, rawDescription = '') => {
  const combined = stripDiacritics(`${rawType ?? ''} ${rawDescription ?? ''}`)
    .toLowerCase()
    .trim();

  if (combined.includes('inamovible')) return 'inamovible';
  if (combined.includes('trasladable')) return 'trasladable';
  if (combined.includes('turist') || combined.includes('puente')) return 'turistico';
  if (combined.includes('no laborable') || combined.includes('nolaborable')) return 'no_laborable';
  return 'otro';
};

export const transformOfficialHolidaysDataset = (raw, options = {}) => {
  const elements = raw?.mainEntity?.itemListElement;
  if (!Array.isArray(elements) || elements.length === 0) {
    throw new Error(
      'El JSON descargado no contiene un arreglo válido en mainEntity.itemListElement.'
    );
  }

  const byDate = new Map();
  let detectedYear = Number.isInteger(options.year) ? options.year : null;

  for (const entry of elements) {
    const item = entry?.item ?? entry;
    const date = typeof item?.startDate === 'string' ? item.startDate.trim() : '';
    const name = typeof item?.name === 'string' ? item.name.trim() : '';
    const description = typeof item?.description === 'string' ? item.description.trim() : '';
    const rawType =
      typeof item?.additionalProperty?.value === 'string'
        ? item.additionalProperty.value.trim()
        : '';

    if (!DATE_KEY_PATTERN.test(date) || !name) {
      continue;
    }

    if (detectedYear === null) {
      detectedYear = Number(date.slice(0, 4));
    }

    const type = normalizeHolidayType(rawType, description);
    const normalizedDescription =
      description ||
      (type === 'inamovible'
        ? 'Feriado inamovible'
        : type === 'trasladable'
        ? 'Feriado trasladable'
        : type === 'turistico'
        ? 'Feriado turístico'
        : type === 'no_laborable'
        ? 'Día no laborable'
        : 'Feriado nacional');

    const existing = byDate.get(date);
    if (!existing) {
      byDate.set(date, {
        date,
        name,
        description: normalizedDescription,
        type,
      });
    } else if (!existing.name.toLowerCase().includes(name.toLowerCase())) {
      existing.name = `${existing.name} / ${name}`;
    }
  }

  const holidays = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  if (holidays.length === 0) {
    throw new Error('No se encontraron feriados con fecha YYYY-MM-DD válida en el dataset.');
  }

  const timezone =
    typeof raw?.additionalProperty?.value === 'string' &&
    raw?.additionalProperty?.name === 'timezone' &&
    raw.additionalProperty.value.trim()
      ? raw.additionalProperty.value.trim()
      : DEFAULT_HOLIDAYS_TIMEZONE;

  const finalYear = detectedYear ?? DEFAULT_HOLIDAYS_YEAR;
  const source = options.source || buildOfficialArgentinaHolidaysUrl(finalYear);

  return {
    source,
    country: 'AR',
    timezone,
    year: finalYear,
    holidays,
  };
};

export const parseSyncHolidaysArgs = (argv = []) => {
  const parsed = {
    year: DEFAULT_HOLIDAYS_YEAR,
    url: '',
    out: DEFAULT_HOLIDAYS_OUTPUT_PATH,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    } else if (arg === '--year' || arg.startsWith('--year=')) {
      const rawVal = arg.includes('=') ? arg.split('=')[1] : argv[++i];
      const yr = Number(rawVal);
      if (!Number.isInteger(yr) || yr < 2000 || yr > 2100) {
        throw new Error(`Año inválido "${rawVal ?? ''}". Usá un año de 4 dígitos (ej. 2026).`);
      }
      parsed.year = yr;
    } else if (arg === '--url' || arg.startsWith('--url=')) {
      const rawVal = arg.includes('=') ? arg.slice('--url='.length) : argv[++i];
      if (!rawVal || !/^https?:\/\//i.test(rawVal)) {
        throw new Error(`URL inválida "${rawVal ?? ''}". Debe comenzar con http:// o https://.`);
      }
      parsed.url = rawVal.trim();
    } else if (arg === '--out' || arg.startsWith('--out=')) {
      const rawVal = arg.includes('=') ? arg.slice('--out='.length) : argv[++i];
      if (!rawVal || !rawVal.trim()) {
        throw new Error('El parámetro --out requiere una ruta de archivo válida.');
      }
      parsed.out = path.resolve(REPO_ROOT, rawVal.trim());
    } else {
      throw new Error(`Argumento desconocido: ${arg}`);
    }
  }

  return parsed;
};

const printHelp = () => {
  console.log(`
Sincronización de Feriados Oficiales (Argentina) -> src/data/holidays.json

Uso:
  npm run holidays:sync
  npm run holidays:sync -- --year 2026
  npm run holidays:sync -- --url https://www.argentina.gob.ar/sites/default/files/holidays-2026-es.json --dry-run

Opciones:
  --year <YYYY>   Año calendario a descargar (default: ${DEFAULT_HOLIDAYS_YEAR})
  --url <url>     Sobrescribe la URL fuente oficial
  --out <ruta>    Archivo de salida (default: src/data/holidays.json)
  --dry-run       Descarga y valida sin modificar archivos en disco
  -h, --help      Muestra esta ayuda
`.trim());
};

export const runSyncHolidays = async (argv = process.argv.slice(2)) => {
  const args = parseSyncHolidaysArgs(argv);
  if (args.help) {
    printHelp();
    return null;
  }

  const targetUrl = args.url || buildOfficialArgentinaHolidaysUrl(args.year);
  console.log(`[holidays:sync] Descargando feriados desde ${targetUrl}...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  let response;
  try {
    response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status} al descargar ${targetUrl}`);
  }

  // Decode strictly as UTF-8 regardless of platform locale
  const rawBuffer = Buffer.from(await response.arrayBuffer());
  const rawText = rawBuffer.toString('utf8');
  const rawJson = JSON.parse(rawText);

  const normalized = transformOfficialHolidaysDataset(rawJson, {
    year: args.year,
    source: targetUrl,
  });

  const first = normalized.holidays[0];
  const last = normalized.holidays[normalized.holidays.length - 1];

  if (args.dryRun) {
    console.log(
      `[holidays:sync] --dry-run OK: ${normalized.holidays.length} feriados (${normalized.year}) desde ${first.date} (${first.name}) hasta ${last.date} (${last.name}). No se escribió en disco.`
    );
    return normalized;
  }

  mkdirSync(path.dirname(args.out), { recursive: true });
  writeFileSync(args.out, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');

  console.log(
    `[holidays:sync] Archivo actualizado: ${path.relative(REPO_ROOT, args.out)} (${normalized.holidays.length} feriados de ${normalized.year}, ${first.date} .. ${last.date}).`
  );
  return normalized;
};

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectExecution) {
  runSyncHolidays().catch((err) => {
    console.error(`[holidays:sync] Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  });
}
