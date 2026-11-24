import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const useColor = Boolean(output.isTTY) && !process.env.NO_COLOR;

const wrap = (code, text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : String(text));

export const colors = {
  bold: (t) => wrap('1', t),
  dim: (t) => wrap('2', t),
  red: (t) => wrap('31', t),
  green: (t) => wrap('32', t),
  yellow: (t) => wrap('33', t),
  cyan: (t) => wrap('36', t),
};

export const printBanner = (title, subtitle = '') => {
  console.log('');
  console.log(colors.bold(colors.cyan(`▸ ${title}`)));
  if (subtitle) {
    console.log(colors.dim(`  ${subtitle}`));
  }
  console.log('');
};

export const printTable = (columns, rows) => {
  if (!rows.length) {
    console.log(colors.dim('  (sin registros)'));
    return;
  }

  const widths = columns.map((col) =>
    Math.max(
      col.label.length,
      ...rows.map((row) => String(row[col.key] ?? '').length)
    )
  );

  const headerLine = columns
    .map((col, idx) => col.label.padEnd(widths[idx]))
    .join('  ');
  const sepLine = widths.map((w) => '─'.repeat(w)).join('  ');

  console.log(`  ${colors.bold(headerLine)}`);
  console.log(`  ${colors.dim(sepLine)}`);
  for (const row of rows) {
    const line = columns
      .map((col, idx) => String(row[col.key] ?? '').padEnd(widths[idx]))
      .join('  ');
    console.log(`  ${line}`);
  }
};

export const askText = async (question) => {
  if (!input.isTTY) {
    throw new Error(
      'Se requiere interacción en consola o pasar el valor mediante flags (ej. --yes).'
    );
  }
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
};

export const askConfirmationPhrase = async (expectedPhrase, warningText = '') => {
  if (warningText) {
    console.log(colors.yellow(warningText));
  }
  const typed = await askText(`Escribí exactamente "${expectedPhrase}" para confirmar: `);
  return typed === expectedPhrase;
};
