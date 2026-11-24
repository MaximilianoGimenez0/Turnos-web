const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap';

export function wrapA4Document({ title, bodyHtml }) {
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1240, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${GOOGLE_FONTS_HREF}" rel="stylesheet" />
  <link rel="stylesheet" href="../src/styles/tokens.css" />
  <link rel="stylesheet" href="../src/styles/pdf-a4.css" />
</head>
<body>
${bodyHtml}
</body>
</html>
`;
}

export function wrapCardDocument({ title, bodyHtml, singleCard = true }) {
  const bodyClass = singleCard ? ' class="single-card"' : '';
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1600, initial-scale=1.0" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${GOOGLE_FONTS_HREF}" rel="stylesheet" />
  <link rel="stylesheet" href="../src/styles/tokens.css" />
  <link rel="stylesheet" href="../src/styles/business-card.css" />
</head>
<body${bodyClass}>
${bodyHtml}
</body>
</html>
`;
}
