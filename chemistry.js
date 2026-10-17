/*
 * The substances of ChemiaMax: elements and common compounds a child meets
 * at home, in nature and in school chemistry. Each row: number, group, formula, then
 * [name, everyday name or ''] in Polish, English, Dutch, Spanish and Persian
 * (the order of LANGS). Polish names follow Polish school chemistry, e.g.
 * "tlenek węgla(IV)" with "dwutlenek węgla" as the everyday name.
 *
 * The number is the card_id in the review log: keep the numbers when rows
 * are added or moved. No two rows may share a formula (glucose and fructose,
 * for example, are both C6H12O6, so only glucose is here).
 *
 * Groups: EL elements, OX oxides, AC acids, BA bases, SA salts, ORG organic
 * compounds. Elements are written as they occur: gases such as oxygen as
 * molecules (O2), noble gases and metals as single atoms (He, Fe), and
 * sulfur, carbon and phosphorus by their symbol (S, C, P).
 */
(function (root) {
  'use strict';

  const LANGS = ['pl', 'en', 'nl', 'es', 'fa'];
  const ROWS = [
    [1, 'OX', 'H2O', ['Woda', ''], ['Water', ''], ['Water', ''], ['Agua', ''], ['آب', '']],
    [2, 'OX', 'H2O2', ['Nadtlenek wodoru', 'woda utleniona'], ['Hydrogen peroxide', ''], ['Waterstofperoxide', ''], ['Peróxido de hidrógeno', 'agua oxigenada'], ['هیدروژن پراکسید', 'آب اکسیژنه']],
    [3, 'OX', 'CO2', ['Tlenek węgla(IV)', 'dwutlenek węgla'], ['Carbon dioxide', ''], ['Koolstofdioxide', 'koolzuurgas'], ['Dióxido de carbono', ''], ['کربن دی‌اکسید', '']],
    [4, 'OX', 'CO', ['Tlenek węgla(II)', 'czad'], ['Carbon monoxide', ''], ['Koolstofmonoxide', ''], ['Monóxido de carbono', ''], ['کربن مونوکسید', '']],
    [5, 'OX', 'SO2', ['Tlenek siarki(IV)', 'dwutlenek siarki'], ['Sulfur dioxide', ''], ['Zwaveldioxide', ''], ['Dióxido de azufre', ''], ['گوگرد دی‌اکسید', '']],
    [6, 'OX', 'NO2', ['Tlenek azotu(IV)', 'dwutlenek azotu'], ['Nitrogen dioxide', ''], ['Stikstofdioxide', ''], ['Dióxido de nitrógeno', ''], ['نیتروژن دی‌اکسید', '']],
    [7, 'OX', 'N2O', ['Tlenek azotu(I)', 'gaz rozweselający'], ['Nitrous oxide', 'laughing gas'], ['Distikstofmonoxide', 'lachgas'], ['Óxido nitroso', 'gas de la risa'], ['دی‌نیتروژن مونوکسید', 'گاز خنده']],
    [8, 'OX', 'CaO', ['Tlenek wapnia', 'wapno palone'], ['Calcium oxide', 'quicklime'], ['Calciumoxide', 'ongebluste kalk'], ['Óxido de calcio', 'cal viva'], ['کلسیم اکسید', 'آهک زنده']],
    [9, 'OX', 'MgO', ['Tlenek magnezu', ''], ['Magnesium oxide', ''], ['Magnesiumoxide', ''], ['Óxido de magnesio', ''], ['منیزیم اکسید', '']],
    [10, 'OX', 'Fe2O3', ['Tlenek żelaza(III)', 'rdza'], ['Iron(III) oxide', 'rust'], ['IJzer(III)oxide', 'roest'], ['Óxido de hierro(III)', 'herrumbre'], ['آهن(III) اکسید', 'زنگ آهن']],
    [11, 'OX', 'Al2O3', ['Tlenek glinu', ''], ['Aluminium oxide', ''], ['Aluminiumoxide', ''], ['Óxido de aluminio', ''], ['آلومینیم اکسید', '']],
    [12, 'OX', 'SiO2', ['Tlenek krzemu(IV)', 'piasek, kwarc'], ['Silicon dioxide', 'sand, quartz'], ['Siliciumdioxide', 'zand, kwarts'], ['Dióxido de silicio', 'arena, cuarzo'], ['سیلیسیم دی‌اکسید', 'ماسه، کوارتز']],
    [13, 'OX', 'ZnO', ['Tlenek cynku', ''], ['Zinc oxide', ''], ['Zinkoxide', ''], ['Óxido de zinc', ''], ['روی اکسید', '']],
    [14, 'OX', 'TiO2', ['Tlenek tytanu(IV)', 'biel tytanowa'], ['Titanium dioxide', ''], ['Titaandioxide', ''], ['Dióxido de titanio', ''], ['تیتانیم دی‌اکسید', '']],
    [15, 'AC', 'HCl', ['Chlorowodór', 'kwas solny'], ['Hydrogen chloride', 'hydrochloric acid'], ['Waterstofchloride', 'zoutzuur'], ['Cloruro de hidrógeno', 'ácido clorhídrico'], ['هیدروژن کلرید', 'جوهر نمک']],
    [16, 'AC', 'H2SO4', ['Kwas siarkowy(VI)', ''], ['Sulfuric acid', ''], ['Zwavelzuur', ''], ['Ácido sulfúrico', ''], ['سولفوریک اسید', 'جوهر گوگرد']],
    [17, 'AC', 'HNO3', ['Kwas azotowy(V)', ''], ['Nitric acid', ''], ['Salpeterzuur', ''], ['Ácido nítrico', ''], ['نیتریک اسید', '']],
    [18, 'AC', 'H3PO4', ['Kwas fosforowy(V)', ''], ['Phosphoric acid', ''], ['Fosforzuur', ''], ['Ácido fosfórico', ''], ['فسفریک اسید', '']],
    [19, 'AC', 'H2CO3', ['Kwas węglowy', ''], ['Carbonic acid', ''], ['Koolzuur', ''], ['Ácido carbónico', ''], ['کربنیک اسید', '']],
    [20, 'AC', 'H2S', ['Siarkowodór', ''], ['Hydrogen sulfide', ''], ['Waterstofsulfide', 'zwavelwaterstof'], ['Sulfuro de hidrógeno', ''], ['هیدروژن سولفید', '']],
    [21, 'BA', 'NaOH', ['Wodorotlenek sodu', 'soda kaustyczna'], ['Sodium hydroxide', 'caustic soda'], ['Natriumhydroxide', 'natronloog'], ['Hidróxido de sodio', 'sosa cáustica'], ['سدیم هیدروکسید', 'سود سوزآور']],
    [22, 'BA', 'KOH', ['Wodorotlenek potasu', ''], ['Potassium hydroxide', ''], ['Kaliumhydroxide', ''], ['Hidróxido de potasio', ''], ['پتاسیم هیدروکسید', '']],
    [23, 'BA', 'Ca(OH)2', ['Wodorotlenek wapnia', 'wapno gaszone'], ['Calcium hydroxide', 'slaked lime'], ['Calciumhydroxide', 'gebluste kalk'], ['Hidróxido de calcio', 'cal apagada'], ['کلسیم هیدروکسید', 'آهک مرده']],
    [24, 'BA', 'Mg(OH)2', ['Wodorotlenek magnezu', ''], ['Magnesium hydroxide', 'milk of magnesia'], ['Magnesiumhydroxide', ''], ['Hidróxido de magnesio', 'leche de magnesia'], ['منیزیم هیدروکسید', 'شیر منیزی']],
    [25, 'BA', 'NH3', ['Amoniak', ''], ['Ammonia', ''], ['Ammoniak', ''], ['Amoníaco', ''], ['آمونیاک', '']],
    [26, 'SA', 'NaCl', ['Chlorek sodu', 'sól kuchenna'], ['Sodium chloride', 'table salt'], ['Natriumchloride', 'keukenzout'], ['Cloruro de sodio', 'sal de mesa'], ['سدیم کلرید', 'نمک طعام']],
    [27, 'SA', 'KCl', ['Chlorek potasu', ''], ['Potassium chloride', ''], ['Kaliumchloride', ''], ['Cloruro de potasio', ''], ['پتاسیم کلرید', '']],
    [28, 'SA', 'CaCl2', ['Chlorek wapnia', ''], ['Calcium chloride', ''], ['Calciumchloride', ''], ['Cloruro de calcio', ''], ['کلسیم کلرید', '']],
    [29, 'SA', 'NaHCO3', ['Wodorowęglan sodu', 'soda oczyszczona'], ['Sodium bicarbonate', 'baking soda'], ['Natriumwaterstofcarbonaat', 'zuiveringszout'], ['Bicarbonato de sodio', ''], ['سدیم بی‌کربنات', 'جوش شیرین']],
    [30, 'SA', 'Na2CO3', ['Węglan sodu', 'soda'], ['Sodium carbonate', 'washing soda'], ['Natriumcarbonaat', 'soda'], ['Carbonato de sodio', ''], ['سدیم کربنات', '']],
    [31, 'SA', 'CaCO3', ['Węglan wapnia', 'kreda, wapień'], ['Calcium carbonate', 'chalk, limestone'], ['Calciumcarbonaat', 'krijt, kalksteen'], ['Carbonato de calcio', 'tiza, caliza'], ['کلسیم کربنات', 'گچ تحریر، سنگ آهک']],
    [32, 'SA', 'CaSO4', ['Siarczan(VI) wapnia', 'gips'], ['Calcium sulfate', 'gypsum'], ['Calciumsulfaat', 'gips'], ['Sulfato de calcio', 'yeso'], ['کلسیم سولفات', 'گچ']],
    [33, 'SA', 'CuSO4', ['Siarczan(VI) miedzi(II)', ''], ['Copper(II) sulfate', ''], ['Koper(II)sulfaat', ''], ['Sulfato de cobre(II)', ''], ['مس(II) سولفات', 'کات کبود']],
    [34, 'SA', 'MgSO4', ['Siarczan(VI) magnezu', 'sól gorzka'], ['Magnesium sulfate', 'Epsom salt'], ['Magnesiumsulfaat', 'bitterzout'], ['Sulfato de magnesio', 'sal de Epsom'], ['منیزیم سولفات', 'نمک فرانسه']],
    [35, 'SA', 'KNO3', ['Azotan(V) potasu', 'saletra'], ['Potassium nitrate', 'saltpetre'], ['Kaliumnitraat', 'salpeter'], ['Nitrato de potasio', 'salitre'], ['پتاسیم نیترات', 'شوره']],
    [36, 'SA', 'NaF', ['Fluorek sodu', ''], ['Sodium fluoride', ''], ['Natriumfluoride', ''], ['Fluoruro de sodio', ''], ['سدیم فلوئورید', '']],
    [37, 'SA', 'NaClO', ['Chloran(I) sodu', 'podchloryn sodu, wybielacz'], ['Sodium hypochlorite', 'bleach'], ['Natriumhypochloriet', 'bleekwater'], ['Hipoclorito de sodio', 'lejía'], ['سدیم هیپوکلریت', 'سفیدکننده']],
    [38, 'SA', 'NH4Cl', ['Chlorek amonu', 'salmiak'], ['Ammonium chloride', 'sal ammoniac'], ['Ammoniumchloride', 'salmiak'], ['Cloruro de amonio', ''], ['آمونیوم کلرید', 'نشادر']],
    [39, 'ORG', 'CH4', ['Metan', ''], ['Methane', ''], ['Methaan', ''], ['Metano', ''], ['متان', '']],
    [40, 'ORG', 'C3H8', ['Propan', ''], ['Propane', ''], ['Propaan', ''], ['Propano', ''], ['پروپان', '']],
    [41, 'ORG', 'C4H10', ['Butan', ''], ['Butane', ''], ['Butaan', ''], ['Butano', ''], ['بوتان', '']],
    [42, 'ORG', 'C2H4', ['Eten', 'etylen'], ['Ethene', 'ethylene'], ['Etheen', 'ethyleen'], ['Eteno', 'etileno'], ['اتن', 'اتیلن']],
    [43, 'ORG', 'C2H2', ['Etyn', 'acetylen'], ['Ethyne', 'acetylene'], ['Ethyn', 'acetyleen'], ['Etino', 'acetileno'], ['اتین', 'استیلن']],
    [44, 'ORG', 'C6H6', ['Benzen', ''], ['Benzene', ''], ['Benzeen', ''], ['Benceno', ''], ['بنزن', '']],
    [45, 'ORG', 'C2H5OH', ['Etanol', 'alkohol etylowy'], ['Ethanol', 'alcohol'], ['Ethanol', 'alcohol'], ['Etanol', 'alcohol'], ['اتانول', 'الکل']],
    [46, 'ORG', 'CH3COOH', ['Kwas octowy', 'ocet'], ['Acetic acid', 'vinegar'], ['Azijnzuur', 'azijn'], ['Ácido acético', 'vinagre'], ['استیک اسید', 'سرکه']],
    [47, 'ORG', 'C6H12O6', ['Glukoza', 'cukier gronowy'], ['Glucose', ''], ['Glucose', 'druivensuiker'], ['Glucosa', ''], ['گلوکز', 'قند انگور']],
    [48, 'ORG', 'C12H22O11', ['Sacharoza', 'cukier'], ['Sucrose', 'sugar'], ['Sacharose', 'suiker'], ['Sacarosa', 'azúcar'], ['ساکارز', 'شکر']],
    [49, 'ORG', 'C3H6O', ['Aceton', ''], ['Acetone', ''], ['Aceton', ''], ['Acetona', ''], ['استون', '']],
    [50, 'ORG', 'C6H8O7', ['Kwas cytrynowy', ''], ['Citric acid', ''], ['Citroenzuur', ''], ['Ácido cítrico', ''], ['سیتریک اسید', 'جوهر لیمو']],
    [51, 'ORG', 'C6H8O6', ['Kwas askorbinowy', 'witamina C'], ['Ascorbic acid', 'vitamin C'], ['Ascorbinezuur', 'vitamine C'], ['Ácido ascórbico', 'vitamina C'], ['اسکوربیک اسید', 'ویتامین ث']],
    [52, 'ORG', 'C8H10N4O2', ['Kofeina', ''], ['Caffeine', ''], ['Cafeïne', ''], ['Cafeína', ''], ['کافئین', '']],
    [53, 'ORG', 'CO(NH2)2', ['Mocznik', ''], ['Urea', ''], ['Ureum', ''], ['Urea', ''], ['اوره', '']],
    [54, 'EL', 'H2', ['Wodór', ''], ['Hydrogen', ''], ['Waterstof', ''], ['Hidrógeno', ''], ['هیدروژن', '']],
    [55, 'EL', 'O2', ['Tlen', ''], ['Oxygen', ''], ['Zuurstof', ''], ['Oxígeno', ''], ['اکسیژن', '']],
    [56, 'EL', 'N2', ['Azot', ''], ['Nitrogen', ''], ['Stikstof', ''], ['Nitrógeno', ''], ['نیتروژن', '']],
    [57, 'EL', 'Cl2', ['Chlor', ''], ['Chlorine', ''], ['Chloor', ''], ['Cloro', ''], ['کلر', '']],
    [58, 'EL', 'F2', ['Fluor', ''], ['Fluorine', ''], ['Fluor', ''], ['Flúor', ''], ['فلوئور', '']],
    [59, 'EL', 'O3', ['Ozon', ''], ['Ozone', ''], ['Ozon', ''], ['Ozono', ''], ['ازون', '']],
    [60, 'EL', 'He', ['Hel', ''], ['Helium', ''], ['Helium', ''], ['Helio', ''], ['هلیم', '']],
    [61, 'EL', 'Ne', ['Neon', ''], ['Neon', ''], ['Neon', ''], ['Neón', ''], ['نئون', '']],
    [62, 'EL', 'Ar', ['Argon', ''], ['Argon', ''], ['Argon', ''], ['Argón', ''], ['آرگون', '']],
    [63, 'EL', 'Br2', ['Brom', ''], ['Bromine', ''], ['Broom', ''], ['Bromo', ''], ['برم', '']],
    [64, 'EL', 'I2', ['Jod', ''], ['Iodine', ''], ['Jood', ''], ['Yodo', ''], ['ید', '']],
    [65, 'EL', 'S', ['Siarka', ''], ['Sulfur', ''], ['Zwavel', ''], ['Azufre', ''], ['گوگرد', '']],
    [66, 'EL', 'C', ['Węgiel', 'diament, grafit'], ['Carbon', 'diamond, graphite'], ['Koolstof', 'diamant, grafiet'], ['Carbono', 'diamante, grafito'], ['کربن', 'الماس، گرافیت']],
    [67, 'EL', 'P', ['Fosfor', ''], ['Phosphorus', ''], ['Fosfor', ''], ['Fósforo', ''], ['فسفر', '']],
    [68, 'EL', 'Si', ['Krzem', ''], ['Silicon', ''], ['Silicium', ''], ['Silicio', ''], ['سیلیسیم', '']],
    [69, 'EL', 'Fe', ['Żelazo', ''], ['Iron', ''], ['IJzer', ''], ['Hierro', ''], ['آهن', '']],
    [70, 'EL', 'Cu', ['Miedź', ''], ['Copper', ''], ['Koper', ''], ['Cobre', ''], ['مس', '']],
    [71, 'EL', 'Au', ['Złoto', ''], ['Gold', ''], ['Goud', ''], ['Oro', ''], ['طلا', '']],
    [72, 'EL', 'Ag', ['Srebro', ''], ['Silver', ''], ['Zilver', ''], ['Plata', ''], ['نقره', '']],
    [73, 'EL', 'Al', ['Glin', 'aluminium'], ['Aluminium', ''], ['Aluminium', ''], ['Aluminio', ''], ['آلومینیم', '']],
    [74, 'EL', 'Zn', ['Cynk', ''], ['Zinc', ''], ['Zink', ''], ['Zinc', ''], ['روی', '']],
    [75, 'EL', 'Hg', ['Rtęć', ''], ['Mercury', ''], ['Kwik', ''], ['Mercurio', ''], ['جیوه', '']],
    [76, 'EL', 'Pb', ['Ołów', ''], ['Lead', ''], ['Lood', ''], ['Plomo', ''], ['سرب', '']],
    [77, 'EL', 'Sn', ['Cyna', ''], ['Tin', ''], ['Tin', ''], ['Estaño', ''], ['قلع', '']],
    [78, 'EL', 'Na', ['Sód', ''], ['Sodium', ''], ['Natrium', ''], ['Sodio', ''], ['سدیم', '']],
    [79, 'EL', 'K', ['Potas', ''], ['Potassium', ''], ['Kalium', ''], ['Potasio', ''], ['پتاسیم', '']],
    [80, 'EL', 'Ca', ['Wapń', ''], ['Calcium', ''], ['Calcium', ''], ['Calcio', ''], ['کلسیم', '']],
    [81, 'EL', 'Mg', ['Magnez', ''], ['Magnesium', ''], ['Magnesium', ''], ['Magnesio', ''], ['منیزیم', '']],
  ];

  root.COMPOUNDS = ROWS.map(([number, group, formula, ...names]) => ({
    number,
    group,
    formula,
    name: Object.fromEntries(LANGS.map((l, i) => [l, names[i][0]])),
    nick: Object.fromEntries(LANGS.map((l, i) => [l, names[i][1]])),
  }));
  root.COMPOUND_GROUPS = ['EL', 'OX', 'AC', 'BA', 'SA', 'ORG'];
})(typeof globalThis !== 'undefined' ? globalThis : this);
