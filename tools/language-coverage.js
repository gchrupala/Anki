/*
 * How often each picture concept of JęzykiMax comes back on other cards:
 * the gaps and questions that list it in their uses. Run with
 *
 *   node tools/language-coverage.js        (all languages, summary)
 *   node tools/language-coverage.js nl     (one language, concept by concept)
 */
require('../languages-translations.js');
require('../languages.js');

const { LANGUAGE_CARDS, LANGUAGE_TARGETS } = globalThis;
const only = process.argv[2];

for (const lang of only ? [only] : LANGUAGE_TARGETS) {
  const cards = LANGUAGE_CARDS[lang];
  const pictures = cards.filter((c) => c.kind === 'p');
  const users = {};
  for (const c of cards) for (const id of c.uses || []) (users[id] = users[id] || []).push(c.id);
  const themes = [...new Set(pictures.map((c) => c.theme))];
  const covered = (c) => (users[c.id.split('.')[2]] || []).length >= 2;
  console.log(`${lang}: ${pictures.filter(covered).length} of ${pictures.length} concepts on 2 or more other cards, `
    + `${pictures.filter((c) => !users[c.id.split('.')[2]]).length} on none`);
  for (const theme of themes) {
    const inTheme = pictures.filter((c) => c.theme === theme);
    console.log(`  ${theme.padEnd(12)} ${inTheme.filter(covered).length}/${inTheme.length}`);
    if (!only) continue;
    for (const c of inTheme) {
      const used = users[c.id.split('.')[2]] || [];
      console.log(`    ${String(used.length).padStart(2)}  ${c.answer.padEnd(28)} ${used.join(' ')}`);
    }
  }
}
