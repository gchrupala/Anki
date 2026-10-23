const test = require('node:test');
const assert = require('node:assert/strict');
const VOICE = require('../voice.js');

const words = ['la pomme', 'la banane', 'le pain', 'le fromage'];

test('a word said alone, among other words, or nearly right', () => {
  assert.equal(VOICE.pick(['la pomme'], words), 0);
  assert.equal(VOICE.pick(['La Pomme.'], words), 0);
  assert.equal(VOICE.pick(["c'est la pomme"], words), 0);
  assert.equal(VOICE.pick(['la pome'], words), 0);
  assert.equal(VOICE.pick(['le pain'], words), 2);
  assert.equal(VOICE.pick(['quelque chose', 'le fromage'], words), 3);
});

test('a word without its article', () => {
  assert.equal(VOICE.pick(['pomme'], words), 0);
  assert.equal(VOICE.pick(['fromage'], words), 3);
});

test('nothing picked when nothing is clearly closer', () => {
  assert.equal(VOICE.pick(['je ne sais pas'], words), -1);
  assert.equal(VOICE.pick([''], words), -1);
  assert.equal(VOICE.pick([], words), -1);
  assert.equal(VOICE.pick(['la'], words), -1);
  assert.equal(VOICE.pick(['le'], words), -1);
});

test('the answer to a question, with or without its punctuation and accents', () => {
  const answers = ['Je m’appelle Léa.', 'J’ai onze ans.', 'J’habite à Paris.', 'Je vais bien.'];
  assert.equal(VOICE.pick(["je m'appelle léa"], answers), 0);
  assert.equal(VOICE.pick(['je m appelle lea'], answers), 0);
  assert.equal(VOICE.pick(["j'ai 11 ans"], answers), 1);
  assert.equal(VOICE.pick(['Oui, j’ai un frère et une sœur'], ['Oui, j’ai un frère et une sœur.', 'Oui, j’ai deux chats.', 'Il habite à Tilburg.', 'J’ai onze ans.']), 0);
});

test('a gap, said alone or with its sentence', () => {
  const context = ['Ma mère achète ', ' baguette.'];
  const options = ['une', 'des', 'un', 'la'];
  assert.equal(VOICE.pick(['une'], options, context), 0);
  assert.equal(VOICE.pick(['ma mère achète une baguette'], options, context), 0);
  assert.equal(VOICE.pick(['achète une baguette'], options, context), 0);
  assert.equal(VOICE.pick(['ma mère achète des baguettes'], options, context), 1);
  assert.equal(VOICE.pick(['Nous allons à la piscine le mercredi'], ['allons', 'allez', 'va', 'vont'], ['Nous ', ' à la piscine le mercredi.']), 0);
  // A word of the sentence that is also an answer does not count.
  const pet = ['', ' chat et le chien.'];
  assert.equal(VOICE.pick(['la chat et le chien'], ['le', 'la', 'les', 'un'], pet), 1);
});

test('the other languages learned', () => {
  assert.equal(VOICE.pick(['el plátano'], ['la manzana', 'el plátano', 'el pan', 'el queso']), 1);
  assert.equal(VOICE.pick(['de kaas'], ['de appel', 'de banaan', 'het brood', 'de kaas']), 3);
  assert.equal(VOICE.pick(['il formaggio'], ['la mela', 'la banana', 'il pane', 'il formaggio']), 3);
  assert.equal(VOICE.pick(['jabłko'], ['jabłko', 'banan', 'chleb', 'ser']), 0);
  assert.equal(VOICE.pick(['jablko'], ['jabłko', 'banan', 'chleb', 'ser']), 0);
});

test('answers that are forms of one word: the one heard word for word', () => {
  const tennis = ['tennist', 'getennist', 'tennissen', 'tennis'];
  const context = ['Ik ', ' elke dinsdag met mijn vriendin.'];
  assert.equal(VOICE.pick(['tennis'], tennis, context), 3);
  assert.equal(VOICE.pick(['Tennis'], tennis, context), 3);
  assert.equal(VOICE.pick(['tennist'], tennis, context), 0);
  assert.equal(VOICE.pick(['ik tennis elke dinsdag met mijn vriendin'], tennis, context), 3);
  const guitars = ['gitaars', 'gitaar', 'gitaaren', 'gitaren'];
  const two = ['Mijn broer heeft twee ', ': een gewone en een elektrische.'];
  assert.equal(VOICE.pick(['gitaar'], guitars, two), 1);
  assert.equal(VOICE.pick(['gitaren'], guitars, two), 3);
  assert.equal(VOICE.pick(['mijn broer heeft twee gitaren een gewone en een elektrische'], guitars, two), 3);
});

test('the likeliest text heard counts first', () => {
  assert.equal(VOICE.pick(['tennist', 'tennis'], ['tennist', 'getennist', 'tennissen', 'tennis']), 0);
  assert.equal(VOICE.pick(['tenis', 'tennis'], ['tennist', 'getennist', 'tennissen', 'tennis']), 3);
});

test('an answer that holds another', () => {
  assert.equal(VOICE.pick(['de la'], ['de la', 'la', 'le', 'du']), 0);
  assert.equal(VOICE.pick(['la'], ['de la', 'la', 'le', 'du']), 1);
  assert.equal(VOICE.pick(['le du'], ['de la', 'la', 'le', 'du']), -1);
});
