/*
 * The cards of JęzykiMax: French, Spanish and Dutch at the levels A1, A2
 * and B1 of the Common European Framework. The cards are only in the
 * language being learned, with pictures (emoji), so they need no
 * translation into the languages of the interface.
 *
 * Five kinds of card:
 *   p  a picture; the child picks the word or phrase
 *   w  a word or phrase; the child picks the picture
 *   g  a sentence with a gap (___); the child picks the missing word
 *   q  a question; the child picks the answer that fits
 *   o  a word; the child picks its opposite
 * PICTURES gives each concept both a p and a w card. The wrong answers of
 * p, w and o cards are other concepts or opposites, chosen by the page;
 * gaps and questions list their own three wrong answers.
 *
 * Card ids are "fr.p.apple", "es.g.3" and so on: the number of a gap,
 * question or pair of opposites is its place in its list, so add new ones
 * at the end of a list, and never reuse the id of a concept.
 */
(function (root) {
  'use strict';

  const TARGETS = ['fr', 'es', 'nl'];
  const LEVELS = ['A1', 'A2', 'B1'];

  // id, level, theme, picture, French, Spanish, Dutch. The wrong answers
  // come from the same theme where it has enough.
  const PICTURES = [
    ['apple', 'A1', 'food', '🍎', 'la pomme', 'la manzana', 'de appel'],
    ['banana', 'A1', 'food', '🍌', 'la banane', 'el plátano', 'de banaan'],
    ['bread', 'A1', 'food', '🍞', 'le pain', 'el pan', 'het brood'],
    ['cheese', 'A1', 'food', '🧀', 'le fromage', 'el queso', 'de kaas'],
    ['egg', 'A1', 'food', '🥚', 'l’œuf', 'el huevo', 'het ei'],
    ['milk', 'A1', 'food', '🥛', 'le lait', 'la leche', 'de melk'],
    ['strawberry', 'A1', 'food', '🍓', 'la fraise', 'la fresa', 'de aardbei'],
    ['carrot', 'A1', 'food', '🥕', 'la carotte', 'la zanahoria', 'de wortel'],
    ['cake', 'A1', 'food', '🍰', 'le gâteau', 'el pastel', 'de taart'],

    ['dog', 'A1', 'animals', '🐕', 'le chien', 'el perro', 'de hond'],
    ['cat', 'A1', 'animals', '🐈', 'le chat', 'el gato', 'de kat'],
    ['horse', 'A1', 'animals', '🐎', 'le cheval', 'el caballo', 'het paard'],
    ['cow', 'A1', 'animals', '🐄', 'la vache', 'la vaca', 'de koe'],
    ['bird', 'A1', 'animals', '🐦', 'l’oiseau', 'el pájaro', 'de vogel'],
    ['fish', 'A1', 'animals', '🐟', 'le poisson', 'el pez', 'de vis'],
    ['mouse', 'A1', 'animals', '🐭', 'la souris', 'el ratón', 'de muis'],
    ['rabbit', 'A1', 'animals', '🐇', 'le lapin', 'el conejo', 'het konijn'],

    ['red', 'A1', 'colours', '🔴', 'rouge', 'rojo', 'rood'],
    ['blue', 'A1', 'colours', '🔵', 'bleu', 'azul', 'blauw'],
    ['green', 'A1', 'colours', '🟢', 'vert', 'verde', 'groen'],
    ['yellow', 'A1', 'colours', '🟡', 'jaune', 'amarillo', 'geel'],
    ['black', 'A1', 'colours', '⚫', 'noir', 'negro', 'zwart'],
    ['white', 'A1', 'colours', '⚪', 'blanc', 'blanco', 'wit'],

    ['one', 'A1', 'numbers', '1️⃣', 'un', 'uno', 'één'],
    ['three', 'A1', 'numbers', '3️⃣', 'trois', 'tres', 'drie'],
    ['five', 'A1', 'numbers', '5️⃣', 'cinq', 'cinco', 'vijf'],
    ['seven', 'A1', 'numbers', '7️⃣', 'sept', 'siete', 'zeven'],
    ['eight', 'A1', 'numbers', '8️⃣', 'huit', 'ocho', 'acht'],
    ['ten', 'A1', 'numbers', '🔟', 'dix', 'diez', 'tien'],

    ['baby', 'A1', 'family', '👶', 'le bébé', 'el bebé', 'de baby'],
    ['grandmother', 'A1', 'family', '👵', 'la grand-mère', 'la abuela', 'de oma'],
    ['grandfather', 'A1', 'family', '👴', 'le grand-père', 'el abuelo', 'de opa'],
    ['family', 'A1', 'family', '👨‍👩‍👧‍👦', 'la famille', 'la familia', 'het gezin'],
    ['girl', 'A1', 'family', '👧', 'la fille', 'la niña', 'het meisje'],
    ['boy', 'A1', 'family', '👦', 'le garçon', 'el niño', 'de jongen'],

    ['eye', 'A1', 'body', '👁️', 'l’œil', 'el ojo', 'het oog'],
    ['ear', 'A1', 'body', '👂', 'l’oreille', 'la oreja', 'het oor'],
    ['nose', 'A1', 'body', '👃', 'le nez', 'la nariz', 'de neus'],
    ['mouth', 'A1', 'body', '👄', 'la bouche', 'la boca', 'de mond'],
    ['hand', 'A1', 'body', '✋', 'la main', 'la mano', 'de hand'],
    ['foot', 'A1', 'body', '🦶', 'le pied', 'el pie', 'de voet'],

    ['tshirt', 'A1', 'clothes', '👕', 'le tee-shirt', 'la camiseta', 'het T-shirt'],
    ['trousers', 'A1', 'clothes', '👖', 'le pantalon', 'el pantalón', 'de broek'],
    ['dress', 'A1', 'clothes', '👗', 'la robe', 'el vestido', 'de jurk'],
    ['shoe', 'A1', 'clothes', '👞', 'la chaussure', 'el zapato', 'de schoen'],
    ['cap', 'A1', 'clothes', '🧢', 'la casquette', 'la gorra', 'de pet'],
    ['socks', 'A1', 'clothes', '🧦', 'les chaussettes', 'los calcetines', 'de sokken'],

    ['house', 'A1', 'house', '🏠', 'la maison', 'la casa', 'het huis'],
    ['bed', 'A1', 'house', '🛏️', 'le lit', 'la cama', 'het bed'],
    ['door', 'A1', 'house', '🚪', 'la porte', 'la puerta', 'de deur'],
    ['chair', 'A1', 'house', '🪑', 'la chaise', 'la silla', 'de stoel'],
    ['key', 'A1', 'house', '🔑', 'la clé', 'la llave', 'de sleutel'],

    ['book', 'A1', 'school', '📖', 'le livre', 'el libro', 'het boek'],
    ['pencil', 'A1', 'school', '✏️', 'le crayon', 'el lápiz', 'het potlood'],
    ['backpack', 'A1', 'school', '🎒', 'le sac à dos', 'la mochila', 'de rugzak'],
    ['scissors', 'A1', 'school', '✂️', 'les ciseaux', 'las tijeras', 'de schaar'],
    ['school', 'A1', 'school', '🏫', 'l’école', 'la escuela', 'de school'],

    ['bike', 'A1', 'transport', '🚲', 'le vélo', 'la bicicleta', 'de fiets'],
    ['car', 'A1', 'transport', '🚗', 'la voiture', 'el coche', 'de auto'],
    ['bus', 'A1', 'transport', '🚌', 'le bus', 'el autobús', 'de bus'],
    ['train', 'A1', 'transport', '🚆', 'le train', 'el tren', 'de trein'],
    ['plane', 'A1', 'transport', '✈️', 'l’avion', 'el avión', 'het vliegtuig'],
    ['boat', 'A1', 'transport', '⛵', 'le bateau', 'el barco', 'de boot'],

    ['sun', 'A1', 'nature', '☀️', 'le soleil', 'el sol', 'de zon'],
    ['tree', 'A1', 'nature', '🌳', 'l’arbre', 'el árbol', 'de boom'],
    ['flower', 'A1', 'nature', '🌸', 'la fleur', 'la flor', 'de bloem'],
    ['moon', 'A1', 'nature', '🌙', 'la lune', 'la luna', 'de maan'],
    ['star', 'A1', 'nature', '⭐', 'l’étoile', 'la estrella', 'de ster'],
    ['sea', 'A1', 'nature', '🌊', 'la mer', 'el mar', 'de zee'],

    ['hello', 'A1', 'greetings', '👋', 'Salut !', '¡Hola!', 'Hoi!'],
    ['birthday', 'A1', 'greetings', '🎂', 'Joyeux anniversaire !', '¡Feliz cumpleaños!', 'Fijne verjaardag!'],
    ['goodnight', 'A1', 'greetings', '😴', 'Bonne nuit !', '¡Buenas noches!', 'Welterusten!'],
    ['thanks', 'A1', 'greetings', '🙏', 'Merci !', '¡Gracias!', 'Dank je!'],

    ['hungry', 'A1', 'feelings', '😋', 'J’ai faim.', 'Tengo hambre.', 'Ik heb honger.'],
    ['thirsty', 'A1', 'feelings', '🥤', 'J’ai soif.', 'Tengo sed.', 'Ik heb dorst.'],
    ['cold', 'A1', 'feelings', '🥶', 'J’ai froid.', 'Tengo frío.', 'Ik heb het koud.'],
    ['hot', 'A1', 'feelings', '🥵', 'J’ai chaud.', 'Tengo calor.', 'Ik heb het warm.'],
    ['afraid', 'A1', 'feelings', '😱', 'J’ai peur.', 'Tengo miedo.', 'Ik ben bang.'],

    ['rain', 'A1', 'weather', '🌧️', 'Il pleut.', 'Llueve.', 'Het regent.'],
    ['snow', 'A1', 'weather', '❄️', 'Il neige.', 'Nieva.', 'Het sneeuwt.'],
    ['fine', 'A2', 'weather', '🌤️', 'Il fait beau.', 'Hace buen tiempo.', 'Het is mooi weer.'],
    ['wind', 'A2', 'weather', '🌬️', 'Il y a du vent.', 'Hace viento.', 'Het waait.'],
    ['storm', 'A2', 'weather', '⛈️', 'Il y a de l’orage.', 'Hay tormenta.', 'Het onweert.'],
    ['fog', 'A2', 'weather', '🌫️', 'Il y a du brouillard.', 'Hay niebla.', 'Het is mistig.'],
    ['rainbow', 'A2', 'weather', '🌈', 'l’arc-en-ciel', 'el arcoíris', 'de regenboog'],

    ['doctor', 'A2', 'jobs', '🧑‍⚕️', 'le médecin', 'el médico', 'de dokter'],
    ['teacher', 'A2', 'jobs', '🧑‍🏫', 'le professeur', 'el profesor', 'de leraar'],
    ['chef', 'A2', 'jobs', '🧑‍🍳', 'le cuisinier', 'el cocinero', 'de kok'],
    ['firefighter', 'A2', 'jobs', '🧑‍🚒', 'le pompier', 'el bombero', 'de brandweerman'],
    ['police', 'A2', 'jobs', '👮', 'le policier', 'el policía', 'de politieagent'],
    ['farmer', 'A2', 'jobs', '🧑‍🌾', 'l’agriculteur', 'el agricultor', 'de boer'],

    ['hospital', 'A2', 'town', '🏥', 'l’hôpital', 'el hospital', 'het ziekenhuis'],
    ['shop', 'A2', 'town', '🏪', 'le magasin', 'la tienda', 'de winkel'],
    ['bank', 'A2', 'town', '🏦', 'la banque', 'el banco', 'de bank'],
    ['castle', 'A2', 'town', '🏰', 'le château', 'el castillo', 'het kasteel'],
    ['church', 'A2', 'town', '⛪', 'l’église', 'la iglesia', 'de kerk'],
    ['station', 'A2', 'town', '🚉', 'la gare', 'la estación', 'het station'],

    ['swim', 'A2', 'doing', '🏊', 'nager', 'nadar', 'zwemmen'],
    ['read', 'A2', 'doing', '📚', 'lire', 'leer', 'lezen'],
    ['sing', 'A2', 'doing', '🎤', 'chanter', 'cantar', 'zingen'],
    ['dance', 'A2', 'doing', '💃', 'danser', 'bailar', 'dansen'],
    ['paint', 'A2', 'doing', '🎨', 'peindre', 'pintar', 'schilderen'],
    ['sleep', 'A2', 'doing', '🛌', 'dormir', 'dormir', 'slapen'],
    ['football', 'A2', 'doing', '⚽', 'jouer au foot', 'jugar al fútbol', 'voetballen'],
    ['cook', 'A2', 'doing', '🍳', 'faire la cuisine', 'cocinar', 'koken'],

    ['guitar', 'A2', 'music', '🎸', 'la guitare', 'la guitarra', 'de gitaar'],
    ['piano', 'A2', 'music', '🎹', 'le piano', 'el piano', 'de piano'],
    ['drum', 'A2', 'music', '🥁', 'le tambour', 'el tambor', 'de trommel'],
    ['violin', 'A2', 'music', '🎻', 'le violon', 'el violín', 'de viool'],

    ['sad', 'A2', 'feelings', '😢', 'Je suis triste.', 'Estoy triste.', 'Ik ben verdrietig.'],
    ['sleepy', 'A2', 'feelings', '🥱', 'J’ai sommeil.', 'Tengo sueño.', 'Ik ben moe.'],
    ['headache', 'A2', 'feelings', '🤕', 'J’ai mal à la tête.', 'Me duele la cabeza.', 'Ik heb hoofdpijn.'],
    ['fever', 'A2', 'feelings', '🤒', 'J’ai de la fièvre.', 'Tengo fiebre.', 'Ik heb koorts.'],
    ['lucky', 'A2', 'feelings', '🍀', 'J’ai de la chance.', 'Tengo suerte.', 'Ik heb geluk.'],

    ['recycle', 'B1', 'world', '♻️', 'recycler', 'reciclar', 'recyclen'],
    ['environment', 'B1', 'world', '🌍', 'l’environnement', 'el medio ambiente', 'het milieu'],
    ['vote', 'B1', 'world', '🗳️', 'voter', 'votar', 'stemmen'],
    ['newspaper', 'B1', 'world', '📰', 'le journal', 'el periódico', 'de krant'],
    ['volcano', 'B1', 'world', '🌋', 'le volcan', 'el volcán', 'de vulkaan'],
    ['money', 'B1', 'world', '💶', 'l’argent', 'el dinero', 'het geld'],

    ['holiday', 'B1', 'life', '🏖️', 'les vacances', 'las vacaciones', 'de vakantie'],
    ['appointment', 'B1', 'life', '📅', 'le rendez-vous', 'la cita', 'de afspraak'],
    ['idea', 'B1', 'life', '💡', 'l’idée', 'la idea', 'het idee'],
    ['win', 'B1', 'life', '🏆', 'gagner', 'ganar', 'winnen'],
    ['love', 'B1', 'life', '😍', 'tomber amoureux', 'enamorarse', 'verliefd worden'],
    ['pouring', 'B1', 'life', '☔', 'Il pleut des cordes.', 'Llueve a cántaros.', 'Het regent pijpenstelen.'],
    ['pricey', 'B1', 'life', '💸', 'Ça coûte les yeux de la tête.', 'Cuesta un ojo de la cara.', 'Het kost een rib uit je lijf.'],
  ];

  // Pairs of opposites: level, then [word, opposite] in French, Spanish
  // and Dutch. The card shows the word; the wrong answers are words of
  // other pairs of the same level.
  const OPPOSITES = [
    ['A1', ['grand', 'petit'], ['grande', 'pequeño'], ['groot', 'klein']],
    ['A1', ['chaud', 'froid'], ['caliente', 'frío'], ['warm', 'koud']],
    ['A1', ['le jour', 'la nuit'], ['el día', 'la noche'], ['de dag', 'de nacht']],
    ['A1', ['oui', 'non'], ['sí', 'no'], ['ja', 'nee']],
    ['A1', ['ouvert', 'fermé'], ['abierto', 'cerrado'], ['open', 'dicht']],
    ['A1', ['rapide', 'lent'], ['rápido', 'lento'], ['snel', 'langzaam']],
    ['A1', ['vieux', 'jeune'], ['viejo', 'joven'], ['oud', 'jong']],
    ['A1', ['beaucoup', 'peu'], ['mucho', 'poco'], ['veel', 'weinig']],
    ['A2', ['facile', 'difficile'], ['fácil', 'difícil'], ['makkelijk', 'moeilijk']],
    ['A2', ['toujours', 'jamais'], ['siempre', 'nunca'], ['altijd', 'nooit']],
    ['A2', ['acheter', 'vendre'], ['comprar', 'vender'], ['kopen', 'verkopen']],
    ['A2', ['commencer', 'finir'], ['empezar', 'terminar'], ['beginnen', 'eindigen']],
    ['A2', ['gagner', 'perdre'], ['ganar', 'perder'], ['winnen', 'verliezen']],
    ['A2', ['devant', 'derrière'], ['delante', 'detrás'], ['voor', 'achter']],
    ['A2', ['se lever', 'se coucher'], ['levantarse', 'acostarse'], ['opstaan', 'naar bed gaan']],
    ['A2', ['riche', 'pauvre'], ['rico', 'pobre'], ['rijk', 'arm']],
  ];

  // Sentences with a gap: level, sentence, the right word, three wrong ones.
  const GAPS = {
    fr: [
      ['A1', 'Je ___ Léa.', 'm’appelle', 't’appelles', 's’appellent', 'appelez'],
      ['A1', 'Tu ___ quel âge ?', 'as', 'es', 'ai', 'a'],
      ['A1', 'Nous ___ français.', 'parlons', 'parlez', 'parlent', 'parle'],
      ['A1', 'Il y a ___ chat sur la table.', 'un', 'une', 'des', 'les'],
      ['A1', 'Elle ___ dans un appartement.', 'habite', 'habites', 'habitons', 'habitent'],
      ['A1', 'J’aime ___ chocolat.', 'le', 'la', 'les', 'du'],
      ['A1', 'Le ciel est ___.', 'bleu', 'bleue', 'bleus', 'bleues'],
      ['A1', 'Ma sœur est ___.', 'petite', 'petit', 'petits', 'petites'],
      ['A1', 'Je vais ___ école.', 'à l’', 'au', 'à la', 'aux'],
      ['A1', 'Tu ___ du lait ?', 'veux', 'veut', 'voulez', 'veulent'],
      ['A1', 'Ils ___ au parc.', 'jouent', 'joue', 'jouons', 'jouez'],
      ['A1', 'Je mange une pomme ___ j’ai faim.', 'parce que', 'mais', 'ou', 'donc'],
      ['A2', 'Hier, nous ___ au cinéma.', 'sommes allés', 'avons allé', 'allons', 'irons'],
      ['A2', 'L’année prochaine, nous ___ en Espagne.', 'irons', 'sommes allés', 'allions', 'irez'],
      ['A2', 'Quand j’étais petite, je ___ souvent à la plage.', 'jouais', 'joue', 'jouerai', 'jouer'],
      ['A2', 'Je ___ lève à sept heures.', 'me', 'te', 'se', 'nous'],
      ['A2', 'C’est le livre ___ je préfère.', 'que', 'qui', 'dont', 'où'],
      ['A2', 'Il est ___ grand que son frère.', 'plus', 'très', 'beaucoup', 'trop'],
      ['A2', 'Tu as vu Marie ? – Oui, je ___ ai vue hier.', 'l’', 'la', 'lui', 'le'],
      ['A2', 'Il faut ___ les mains avant de manger.', 'se laver', 'se lave', 'lavé', 'se lavant'],
      ['A2', 'J’ai besoin ___ un stylo.', 'd’', 'de', 'à', 'pour'],
      ['A2', 'Nous habitons ici ___ trois ans.', 'depuis', 'pendant', 'il y a', 'pour'],
      ['A2', 'Il y a beaucoup ___ voitures dans la rue.', 'de', 'des', 'les', 'du'],
      ['A2', 'Je vais ___ boulangerie.', 'à la', 'au', 'à l’', 'aux'],
      ['B1', 'Il faut que tu ___ tes devoirs.', 'fasses', 'fais', 'feras', 'faisais'],
      ['B1', 'Si j’avais de l’argent, j’___ un vélo.', 'achèterais', 'achète', 'achèterai', 'achetais'],
      ['B1', 'Je suis contente que tu ___ là.', 'sois', 'es', 'seras', 'étais'],
      ['B1', 'Quand je suis arrivée, le train ___ déjà parti.', 'était', 'est', 'a', 'sera'],
      ['B1', 'Le film ___ je t’ai parlé est très bon.', 'dont', 'que', 'qui', 'où'],
      ['B1', 'Bien qu’il ___ malade, il est venu.', 'soit', 'est', 'était', 'sera'],
      ['B1', 'Si tu viens, je te ___ mon jardin.', 'montrerai', 'montrerais', 'montrais', 'montré'],
      ['B1', 'J’ai lu tous les livres ___ tu m’as prêtés.', 'que', 'qui', 'dont', 'lesquels'],
      ['B1', 'En ___ le journal, j’ai appris la nouvelle.', 'lisant', 'lire', 'lu', 'lis'],
      ['B1', 'C’est la ville ___ je suis née.', 'où', 'que', 'qui', 'dont'],
      ['B1', 'Je ne pense pas qu’il ___ raison.', 'ait', 'a', 'aura', 'avoir'],
      ['B1', 'Le gâteau a été ___ par ma grand-mère.', 'préparé', 'préparer', 'préparait', 'prépare'],
    ],
    es: [
      ['A1', 'Me ___ Lucía.', 'llamo', 'llamas', 'llama', 'llaman'],
      ['A1', '¿Cuántos años ___?', 'tienes', 'eres', 'estás', 'haces'],
      ['A1', 'Nosotros ___ español.', 'hablamos', 'habláis', 'hablan', 'hablo'],
      ['A1', 'El gato ___ negro.', 'es', 'son', 'eres', 'soy'],
      ['A1', 'Yo ___ en una casa grande.', 'vivo', 'vive', 'vives', 'vivimos'],
      ['A1', 'Me gusta ___ chocolate.', 'el', 'la', 'los', 'las'],
      ['A1', 'La casa es ___.', 'blanca', 'blanco', 'blancos', 'blancas'],
      ['A1', 'Mis hermanos son ___.', 'altos', 'alto', 'alta', 'altas'],
      ['A1', 'Voy ___ colegio.', 'al', 'a el', 'en el', 'a la'],
      ['A1', '¿Dónde ___ el baño?', 'está', 'es', 'hay', 'son'],
      ['A1', 'Ellos ___ al fútbol.', 'juegan', 'juega', 'jugamos', 'juegas'],
      ['A1', 'Como una manzana ___ tengo hambre.', 'porque', 'pero', 'o', 'ni'],
      ['A2', 'Ayer ___ al cine.', 'fuimos', 'vamos', 'iremos', 'vais'],
      ['A2', 'El año pasado ___ a México.', 'viajamos', 'viajaremos', 'viajaríamos', 'viajado'],
      ['A2', 'Cuando era pequeña, ___ mucho en la playa.', 'jugaba', 'juego', 'jugaré', 'jugar'],
      ['A2', 'Yo ___ levanto a las siete.', 'me', 'te', 'se', 'nos'],
      ['A2', 'Mi hermano es ___ alto que yo.', 'más', 'muy', 'tan', 'mucho'],
      ['A2', 'Hace frío, ___ me pongo el abrigo.', 'así que', 'porque', 'aunque', 'si'],
      ['A2', '¿Has visto a Ana? – Sí, ___ he visto hoy.', 'la', 'lo', 'le', 'les'],
      ['A2', 'Necesito ___ las manos antes de comer.', 'lavarme', 'lavo', 'lavado', 'lavando'],
      ['A2', 'Vivimos aquí ___ tres años.', 'desde hace', 'durante', 'hace', 'por'],
      ['A2', 'Hay muchos coches ___ la calle.', 'en', 'a', 'de', 'con'],
      ['A2', 'Este libro es ___ que leí ayer.', 'el', 'lo', 'la', 'los'],
      ['A2', 'Yo ya ___ comido, gracias.', 'he', 'has', 'ha', 'hemos'],
      ['B1', 'Quiero que ___ tus deberes.', 'hagas', 'haces', 'harás', 'hacías'],
      ['B1', 'Si tuviera dinero, ___ una bicicleta.', 'compraría', 'compro', 'compraré', 'compré'],
      ['B1', 'Me alegro de que ___ aquí.', 'estés', 'estás', 'estarás', 'estabas'],
      ['B1', 'Cuando llegué, el tren ya ___ salido.', 'había', 'ha', 'habrá', 'hay'],
      ['B1', 'La película de ___ te hablé es muy buena.', 'la que', 'que', 'el que', 'donde'],
      ['B1', 'Aunque ___ cansada, fue a la fiesta.', 'estaba', 'está', 'estará', 'esté'],
      ['B1', 'Cuando ___ mayor, seré médica.', 'sea', 'soy', 'seré', 'era'],
      ['B1', 'Leí todos los libros ___ me prestaste.', 'que', 'quien', 'cuyos', 'donde'],
      ['B1', '___ el periódico, me enteré de la noticia.', 'Leyendo', 'Leer', 'Leído', 'Leo'],
      ['B1', 'Es la ciudad ___ nací.', 'donde', 'que', 'quien', 'cual'],
      ['B1', 'No creo que ___ razón.', 'tenga', 'tiene', 'tendrá', 'tener'],
      ['B1', 'El pastel fue ___ por mi abuela.', 'preparado', 'preparar', 'preparaba', 'prepara'],
    ],
    nl: [
      ['A1', 'Ik ___ Sara.', 'heet', 'heten', 'hete', 'heetst'],
      ['A1', 'Hoe oud ___ jij?', 'ben', 'bent', 'is', 'zijn'],
      ['A1', 'Wij ___ Nederlands.', 'spreken', 'spreek', 'spreekt', 'sprak'],
      ['A1', 'De kat ___ zwart.', 'is', 'zijn', 'ben', 'bent'],
      ['A1', 'Ik ___ in een groot huis.', 'woon', 'woont', 'wonen', 'woonst'],
      ['A1', '___ meisje speelt buiten.', 'Het', 'De', 'Die', 'Deze'],
      ['A1', 'Ik heb een ___ fiets.', 'rode', 'rood', 'roden', 'roodste'],
      ['A1', 'Dat is een ___ huis.', 'groot', 'grote', 'groten', 'grotes'],
      ['A1', 'Ik ga ___ school.', 'naar', 'in', 'op', 'bij'],
      ['A1', 'Mijn broers ___ voetbal.', 'spelen', 'speelt', 'speel', 'spelt'],
      ['A1', 'Waar ___ de wc?', 'is', 'zijn', 'ben', 'heeft'],
      ['A1', 'Ik eet een appel, ___ ik heb honger.', 'want', 'maar', 'of', 'dus'],
      ['A2', 'Gisteren ___ wij naar de bioscoop.', 'gingen', 'gaan', 'ging', 'gegaan'],
      ['A2', 'Volgend jaar ___ we naar Spanje.', 'gaan', 'gingen', 'gegaan', 'gaat'],
      ['A2', 'Toen ik klein was, ___ ik vaak op het strand.', 'speelde', 'speel', 'gespeeld', 'spelen'],
      ['A2', 'Ik ___ om zeven uur op.', 'sta', 'staat', 'staan', 'opsta'],
      ['A2', 'Mijn broer is ___ dan ik.', 'groter', 'groot', 'grootste', 'meer groot'],
      ['A2', 'Het is koud, ___ trek ik een jas aan.', 'dus', 'want', 'omdat', 'maar'],
      ['A2', 'Heb je Anna gezien? – Ja, ik heb ___ vandaag gezien.', 'haar', 'hem', 'zij', 'hun'],
      ['A2', 'Ik moet mijn handen ___ voor het eten.', 'wassen', 'was', 'gewassen', 'wast'],
      ['A2', 'Ik woon ___ 2019 in Tilburg.', 'sinds', 'voor', 'tijdens', 'over'],
      ['A2', 'Ik wacht ___ de bus.', 'op', 'naar', 'voor', 'aan'],
      ['A2', 'Dit is het boek ___ ik gisteren las.', 'dat', 'die', 'wat', 'wie'],
      ['A2', 'Ik heb al ___, dank je.', 'gegeten', 'eten', 'eet', 'at'],
      ['B1', 'Als ik veel geld had, ___ ik een fiets kopen.', 'zou', 'zal', 'ga', 'heb'],
      ['B1', 'Ik denk ___ hij gelijk heeft.', 'dat', 'of', 'wat', 'als'],
      ['B1', 'Toen ik aankwam, ___ de trein al vertrokken.', 'was', 'is', 'had', 'wordt'],
      ['B1', 'De film ___ ik je over vertelde, is erg goed.', 'waar', 'die', 'wat', 'dat'],
      ['B1', 'Hoewel hij ziek ___, kwam hij toch.', 'was', 'is', 'zal', 'ben'],
      ['B1', 'Ik weet niet ___ hij morgen komt.', 'of', 'als', 'wat', 'omdat'],
      ['B1', 'Het huis ___ in 1900 gebouwd.', 'werd', 'had', 'heeft', 'werden'],
      ['B1', 'Ik heb alle boeken gelezen ___ je me hebt geleend.', 'die', 'dat', 'wat', 'wie'],
      ['B1', 'Ik ben erg blij ___ mijn nieuwe fiets.', 'met', 'op', 'aan', 'naar'],
      ['B1', 'Dat is de stad ___ ik geboren ben.', 'waar', 'die', 'dat', 'wat'],
      ['B1', 'Hij doet alsof hij me niet ___.', 'ziet', 'zien', 'zie', 'gezien'],
      ['B1', 'De taart is door mijn oma ___.', 'gebakken', 'bakken', 'bakte', 'bakt'],
    ],
  };

  // Questions: level, question, the answer that fits, three that don't.
  const QUESTIONS = {
    fr: [
      ['A1', 'Comment tu t’appelles ?', 'Je m’appelle Léa.', 'J’ai onze ans.', 'J’habite à Lyon.', 'Je vais bien, merci.'],
      ['A1', 'Quel âge as-tu ?', 'J’ai onze ans.', 'Je m’appelle Léa.', 'Il est onze heures.', 'J’aime le chocolat.'],
      ['A1', 'Ça va ?', 'Oui, ça va bien, merci.', 'Je suis à l’école.', 'C’est un chat.', 'À demain.'],
      ['A1', 'Où habites-tu ?', 'J’habite à Tilburg.', 'J’ai deux frères.', 'Je suis grande.', 'Demain.'],
      ['A1', 'Qu’est-ce que tu aimes manger ?', 'J’aime les pâtes.', 'Je joue au foot.', 'Il est midi.', 'Je suis en retard.'],
      ['A1', 'Quelle heure est-il ?', 'Il est trois heures.', 'J’ai trois ans.', 'Il fait chaud.', 'C’est lundi.'],
      ['A1', 'Tu as un animal ?', 'Oui, j’ai un chien.', 'Oui, je suis un chien.', 'Non, il est huit heures.', 'J’habite en France.'],
      ['A1', 'Merci beaucoup !', 'De rien !', 'Bonne nuit !', 'Au secours !', 'Enchantée !'],
      ['A2', 'Qu’est-ce que tu as fait hier ?', 'Je suis allée à la piscine.', 'Je vais aller à la piscine.', 'Demain, je vais nager.', 'La piscine est grande.'],
      ['A2', 'Qu’est-ce que tu vas faire ce week-end ?', 'Je vais rendre visite à ma grand-mère.', 'J’ai rendu visite à ma grand-mère.', 'Ma grand-mère a soixante ans.', 'C’était super.'],
      ['A2', 'Quel temps fait-il ?', 'Il pleut et il fait froid.', 'Il est quatre heures.', 'Il fait du vélo.', 'J’ai beaucoup de temps.'],
      ['A2', 'Tu peux m’aider ?', 'Oui, bien sûr !', 'Non, je n’ai pas faim.', 'Bon appétit !', 'Il est parti hier.'],
      ['A2', 'Combien coûte ce livre ?', 'Il coûte dix euros.', 'Il est très intéressant.', 'Je l’ai lu hier.', 'Il a dix pages.'],
      ['A2', 'Pourquoi tu es en retard ?', 'Parce que j’ai raté le bus.', 'Avec mon frère.', 'À neuf heures.', 'Dans la cuisine.'],
      ['A2', 'Où est la gare ?', 'Tout droit, puis à gauche.', 'À huit heures.', 'Avec ma mère.', 'Parce qu’il pleut.'],
      ['A2', 'Tu veux venir à ma fête ?', 'Oui, avec plaisir !', 'Hier soir.', 'Il a douze ans.', 'Dans la cuisine.'],
      ['B1', 'Qu’est-ce que tu ferais si tu gagnais au loto ?', 'Je ferais le tour du monde.', 'J’ai fait le tour du monde.', 'Je gagne souvent.', 'Le loto, c’est demain.'],
      ['B1', 'Depuis combien de temps apprends-tu le français ?', 'Depuis deux ans.', 'Dans deux ans.', 'Pendant les vacances.', 'Avec ma prof.'],
      ['B1', 'Tu es déjà allée à Paris ?', 'Oui, j’y suis allée l’année dernière.', 'Oui, j’irai l’année prochaine.', 'Paris est en France.', 'Non, il fait beau à Paris.'],
      ['B1', 'Qu’est-ce que tu as pensé du film ?', 'Je l’ai trouvé passionnant.', 'Je pense à mes vacances.', 'Il commence à huit heures.', 'Au cinéma du centre.'],
      ['B1', 'Pourriez-vous parler plus lentement, s’il vous plaît ?', 'Bien sûr, excusez-moi.', 'Je cours très vite.', 'Oui, il parle français.', 'C’est loin d’ici.'],
      ['B1', 'Qu’est-ce qui s’est passé ?', 'Je suis tombée de vélo.', 'Je vais tomber.', 'Mon vélo est rouge.', 'Je passe chez toi.'],
      ['B1', 'Tu préfères la mer ou la montagne ?', 'La mer, parce que j’adore nager.', 'Oui, je préfère.', 'La montagne est haute.', 'Je vais à la mer demain.'],
      ['B1', 'À quoi sert cet objet ?', 'Il sert à ouvrir les bouteilles.', 'Il est en métal.', 'Il coûte deux euros.', 'Je l’ai acheté hier.'],
    ],
    es: [
      ['A1', '¿Cómo te llamas?', 'Me llamo Lucía.', 'Tengo once años.', 'Vivo en Madrid.', 'Estoy bien, gracias.'],
      ['A1', '¿Cuántos años tienes?', 'Tengo once años.', 'Me llamo Lucía.', 'Son las once.', 'Me gusta el chocolate.'],
      ['A1', '¿Qué tal?', 'Muy bien, gracias.', 'Estoy en el colegio.', 'Es un gato.', 'Hasta mañana.'],
      ['A1', '¿Dónde vives?', 'Vivo en Tilburg.', 'Tengo dos hermanos.', 'Soy alta.', 'Mañana.'],
      ['A1', '¿Qué te gusta comer?', 'Me gusta la pasta.', 'Juego al fútbol.', 'Son las doce.', 'Llego tarde.'],
      ['A1', '¿Qué hora es?', 'Son las tres.', 'Tengo tres años.', 'Hace calor.', 'Es lunes.'],
      ['A1', '¿Tienes una mascota?', 'Sí, tengo un perro.', 'Sí, soy un perro.', 'No, son las ocho.', 'Vivo en España.'],
      ['A1', '¡Muchas gracias!', '¡De nada!', '¡Buenas noches!', '¡Socorro!', '¡Mucho gusto!'],
      ['A2', '¿Qué hiciste ayer?', 'Fui a la piscina.', 'Voy a ir a la piscina.', 'Mañana voy a nadar.', 'La piscina es grande.'],
      ['A2', '¿Qué vas a hacer este fin de semana?', 'Voy a visitar a mi abuela.', 'Visité a mi abuela.', 'Mi abuela tiene sesenta años.', 'Fue genial.'],
      ['A2', '¿Qué tiempo hace?', 'Llueve y hace frío.', 'Son las cuatro.', 'Monta en bici.', 'Tengo mucho tiempo.'],
      ['A2', '¿Me puedes ayudar?', '¡Sí, claro!', 'No, no tengo hambre.', '¡Que aproveche!', 'Se fue ayer.'],
      ['A2', '¿Cuánto cuesta este libro?', 'Cuesta diez euros.', 'Es muy interesante.', 'Lo leí ayer.', 'Tiene diez páginas.'],
      ['A2', '¿Por qué llegas tarde?', 'Porque perdí el autobús.', 'Con mi hermano.', 'A las nueve.', 'En la cocina.'],
      ['A2', '¿Dónde está la estación?', 'Todo recto y luego a la izquierda.', 'A las ocho.', 'Con mi madre.', 'Porque llueve.'],
      ['A2', '¿Quieres venir a mi fiesta?', '¡Sí, con mucho gusto!', 'Ayer por la noche.', 'Tiene doce años.', 'Está en la cocina.'],
      ['B1', '¿Qué harías si te tocara la lotería?', 'Daría la vuelta al mundo.', 'Di la vuelta al mundo.', 'Gano a menudo.', 'La lotería es mañana.'],
      ['B1', '¿Desde cuándo estudias español?', 'Desde hace dos años.', 'Dentro de dos años.', 'Durante las vacaciones.', 'Con mi profesora.'],
      ['B1', '¿Has estado alguna vez en Madrid?', 'Sí, estuve allí el año pasado.', 'Sí, iré el año que viene.', 'Madrid está en España.', 'No, hace sol en Madrid.'],
      ['B1', '¿Qué te pareció la película?', 'Me pareció emocionante.', 'Me parezco a mi madre.', 'Empieza a las ocho.', 'En el cine del centro.'],
      ['B1', '¿Podría hablar más despacio, por favor?', 'Claro, perdone.', 'Corro muy rápido.', 'Sí, habla español.', 'Está lejos de aquí.'],
      ['B1', '¿Qué ha pasado?', 'Me he caído de la bici.', 'Me voy a caer.', 'Mi bici es roja.', 'Paso por tu casa.'],
      ['B1', '¿Prefieres el mar o la montaña?', 'El mar, porque me encanta nadar.', 'Sí, prefiero.', 'La montaña es alta.', 'Mañana voy al mar.'],
      ['B1', '¿Para qué sirve este objeto?', 'Sirve para abrir botellas.', 'Es de metal.', 'Cuesta dos euros.', 'Lo compré ayer.'],
    ],
    nl: [
      ['A1', 'Hoe heet je?', 'Ik heet Sara.', 'Ik ben elf jaar.', 'Ik woon in Tilburg.', 'Goed, dank je.'],
      ['A1', 'Hoe oud ben je?', 'Ik ben elf jaar.', 'Ik heet Sara.', 'Het is elf uur.', 'Ik hou van chocola.'],
      ['A1', 'Hoe gaat het?', 'Goed, dank je!', 'Ik ben op school.', 'Dat is een kat.', 'Tot morgen.'],
      ['A1', 'Waar woon je?', 'Ik woon in Tilburg.', 'Ik heb twee broers.', 'Ik ben groot.', 'Morgen.'],
      ['A1', 'Wat eet je graag?', 'Ik eet graag pasta.', 'Ik voetbal graag.', 'Het is twaalf uur.', 'Ik ben te laat.'],
      ['A1', 'Hoe laat is het?', 'Het is drie uur.', 'Ik ben drie jaar.', 'Het is warm.', 'Het is maandag.'],
      ['A1', 'Heb je een huisdier?', 'Ja, ik heb een hond.', 'Ja, ik ben een hond.', 'Nee, het is acht uur.', 'Ik woon in Nederland.'],
      ['A1', 'Dank je wel!', 'Graag gedaan!', 'Welterusten!', 'Help!', 'Aangenaam!'],
      ['A2', 'Wat heb je gisteren gedaan?', 'Ik ben naar het zwembad gegaan.', 'Ik ga morgen naar het zwembad.', 'Het zwembad is groot.', 'Ik ga zwemmen.'],
      ['A2', 'Wat ga je dit weekend doen?', 'Ik ga bij mijn oma op bezoek.', 'Ik ben bij mijn oma geweest.', 'Mijn oma is zestig jaar.', 'Het was leuk.'],
      ['A2', 'Wat voor weer is het?', 'Het regent en het is koud.', 'Het is vier uur.', 'Hij fietst.', 'Ik heb veel tijd.'],
      ['A2', 'Kun je me helpen?', 'Ja, natuurlijk!', 'Nee, ik heb geen honger.', 'Eet smakelijk!', 'Hij is gisteren vertrokken.'],
      ['A2', 'Hoeveel kost dit boek?', 'Het kost tien euro.', 'Het is heel spannend.', 'Ik heb het gisteren gelezen.', 'Het heeft tien bladzijden.'],
      ['A2', 'Waarom ben je te laat?', 'Omdat ik de bus heb gemist.', 'Met mijn broer.', 'Om negen uur.', 'In de keuken.'],
      ['A2', 'Waar is het station?', 'Rechtdoor en dan naar links.', 'Om acht uur.', 'Met mijn moeder.', 'Omdat het regent.'],
      ['A2', 'Kom je naar mijn feestje?', 'Ja, leuk!', 'Gisteravond.', 'Hij is twaalf jaar.', 'In de keuken.'],
      ['B1', 'Wat zou je doen als je de loterij won?', 'Ik zou een wereldreis maken.', 'Ik heb een wereldreis gemaakt.', 'Ik win vaak.', 'De loterij is morgen.'],
      ['B1', 'Hoelang leer je al Frans?', 'Al twee jaar.', 'Over twee jaar.', 'In de vakantie.', 'Met mijn juf.'],
      ['B1', 'Ben je ooit in Parijs geweest?', 'Ja, vorig jaar.', 'Ja, ik ga volgend jaar.', 'Parijs ligt in Frankrijk.', 'Nee, het is mooi weer in Parijs.'],
      ['B1', 'Wat vond je van de film?', 'Ik vond hem heel spannend.', 'Ik vond mijn sleutels.', 'Hij begint om acht uur.', 'In de bioscoop in het centrum.'],
      ['B1', 'Kunt u wat langzamer praten?', 'Natuurlijk, sorry.', 'Ik ren heel snel.', 'Ja, hij spreekt Nederlands.', 'Het is ver hier vandaan.'],
      ['B1', 'Wat is er gebeurd?', 'Ik ben van mijn fiets gevallen.', 'Ik ga vallen.', 'Mijn fiets is rood.', 'Ik kom bij je langs.'],
      ['B1', 'Heb je liever de zee of de bergen?', 'De zee, want ik zwem heel graag.', 'Ja, liever wel.', 'De bergen zijn hoog.', 'Morgen ga ik naar zee.'],
      ['B1', 'Waar is dit voor?', 'Om flessen mee open te maken.', 'Het is van metaal.', 'Het kost twee euro.', 'Ik heb het gisteren gekocht.'],
    ],
  };

  // French puts a space before ? ! : and ; – a no-break space, so it stays
  // on the line of the word before it.
  const tidy = (lang, text) => (lang === 'fr' ? text.replace(/ ([?!:;])/g, ' $1') : text);

  // The cards of each language. number is the card_id in the review log.
  const KINDS = ['p', 'w', 'g', 'q', 'o'];
  const CARDS = {};
  TARGETS.forEach((lang, l) => {
    const cards = [];
    const add = (kind, key, i, card) => cards.push({
      id: lang + '.' + kind + '.' + key,
      number: (l + 1) * 10000 + KINDS.indexOf(kind) * 1000 + i + 1,
      lang,
      kind,
      ...card,
    });
    PICTURES.forEach(([key, level, theme, picture, ...words], i) => {
      const word = tidy(lang, words[l]);
      add('p', key, i, { level, theme, show: picture, answer: word, label: word });
      add('w', key, i, { level, theme, show: word, answer: picture, label: word });
    });
    GAPS[lang].forEach(([level, sentence, answer, ...wrong], i) => {
      add('g', i + 1, i, { level, show: tidy(lang, sentence), answer, wrong, label: tidy(lang, sentence) });
    });
    QUESTIONS[lang].forEach(([level, question, answer, ...wrong], i) => {
      add('q', i + 1, i, { level, show: tidy(lang, question), answer: tidy(lang, answer), wrong: wrong.map((w) => tidy(lang, w)), label: tidy(lang, question) });
    });
    OPPOSITES.forEach(([level, ...pairs], i) => {
      const [word, opposite] = pairs[l];
      add('o', i + 1, i, { level, show: word, answer: opposite, label: word + ' ↔ ' + opposite });
    });
    CARDS[lang] = cards;
  });

  root.LANGUAGE_TARGETS = TARGETS;
  root.LANGUAGE_LEVELS = LEVELS;
  root.LANGUAGE_CARDS = CARDS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
