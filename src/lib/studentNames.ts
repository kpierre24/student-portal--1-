import stringSimilarity from 'string-similarity';

export const EXCLUDED_STUDENTS = [
  'gale agrant',
  'gillian selkridge',
  'sam selk',
];

export const isExcludedStudent = (name?: string): boolean => {
  if (!name || typeof name !== 'string') return false;
  const lower = name.toLowerCase().trim();
  return EXCLUDED_STUDENTS.some(excluded => lower.includes(excluded));
};

export const MANUAL_ALIASES: Record<string, string> = {
  // Shellon Liddell (synced with Shellon Massiah)
  'shellon liddel': 'Shellon Liddell',
  'shellon liddell': 'Shellon Liddell',
  'shellon  liddel': 'Shellon Liddell',
  'shellon  liddell': 'Shellon Liddell',
  'shellon liddel-selby': 'Shellon Liddell',
  'shellon liddell-selby': 'Shellon Liddell',
  'shellon liddel selby': 'Shellon Liddell',
  'shellon liddell selby': 'Shellon Liddell',
  's liddel': 'Shellon Liddell',
  's. liddel': 'Shellon Liddell',
  's liddell': 'Shellon Liddell',
  's. liddell': 'Shellon Liddell',
  'uvanie@yahoo.com': 'Shellon Liddell',
  'shellon massiah': 'Shellon Liddell',
  'shellon  massiah': 'Shellon Liddell',
  'shellon messiah': 'Shellon Liddell',
  's massiah': 'Shellon Liddell',
  's. massiah': 'Shellon Liddell',
  'massiahshellon@gmail.com': 'Shellon Liddell',

  // Niomi Loverne Joseph Marksman
  'niomi': 'Niomi Loverne Joseph Marksman',
  'niomi.': 'Niomi Loverne Joseph Marksman',
  'niomi marksman': 'Niomi Loverne Joseph Marksman',
  'niomi joseph': 'Niomi Loverne Joseph Marksman',
  'niomi loverne': 'Niomi Loverne Joseph Marksman',
  'niomi laverne': 'Niomi Loverne Joseph Marksman',
  'loverne joseph': 'Niomi Loverne Joseph Marksman',
  'laverne joseph marksman': 'Niomi Loverne Joseph Marksman',
  'niomi loverne joseph': 'Niomi Loverne Joseph Marksman',
  'niomi laverne joseph': 'Niomi Loverne Joseph Marksman',
  'niomi loverne joseph marksman': 'Niomi Loverne Joseph Marksman',
  'niomi laverne joseph marksman': 'Niomi Loverne Joseph Marksman',
  'niomi. laverne joseph marksman': 'Niomi Loverne Joseph Marksman',
  'lovernejosephempress@gmail.com': 'Niomi Loverne Joseph Marksman',

  // Krystal Mohammed
  'krystal mohammed': 'Krystal Mohammed',
  'krystal mohamed': 'Krystal Mohammed',
  'k mohammed': 'Krystal Mohammed',
  'k. mohammed': 'Krystal Mohammed',
  'krystal': 'Krystal Mohammed',
  'krystalmoh02@gmail.com': 'Krystal Mohammed',
  'krystalmoh2@gmail.com': 'Krystal Mohammed',

  // Vanessa Mohammed (distinct student)
  'vanessa': 'Vanessa Mohammed',
  'vanessa mohammed': 'Vanessa Mohammed',
  'vanessa  mohammed': 'Vanessa Mohammed',
  'v mohammed': 'Vanessa Mohammed',
  'v. mohammed': 'Vanessa Mohammed',

  // Denise Edwards
  'denise edwards': 'Denise Edwards',
  'deniseedwards6561@gmail.com': 'Denise Edwards',
  'deniseedwards6561@gmeil.com': 'Denise Edwards',
  'denise edwards6561@gmail.com': 'Denise Edwards',
  'denise edwards 6561@gmail.com': 'Denise Edwards',
  'd edwards': 'Denise Edwards',
  'd. edwards': 'Denise Edwards',

  // Kabrina Morris-Jack
  'kabrina': 'Kabrina Morris-Jack',
  'kabrina jack': 'Kabrina Morris-Jack',
  'kabrina morris jack': 'Kabrina Morris-Jack',
  'kabrina morris-jack': 'Kabrina Morris-Jack',
  'kabrinamorrisjack': 'Kabrina Morris-Jack',

  // Mishael Daniel
  'mishael daniel': 'Mishael Daniel',
  'mishaeldaniel06@gmail.com': 'Mishael Daniel',
  'mishaeldaniel06@gmeil.com': 'Mishael Daniel',
  'mishael daniel06@gmail.com': 'Mishael Daniel',
  'mishael daniel06@gmeil.com': 'Mishael Daniel',

  // Colette Blackburne-Joseph
  'colette blackburn joseph': 'Colette Blackburne-Joseph',
  'colette blackburne joseph': 'Colette Blackburne-Joseph',
  'colette blackburne joseph ': 'Colette Blackburne-Joseph',
  'colette blackburn': 'Colette Blackburne-Joseph',
  'colette blackburne': 'Colette Blackburne-Joseph',
  'colette blackburne-joseph': 'Colette Blackburne-Joseph',
  'colette blackburne -joseph': 'Colette Blackburne-Joseph',

  // Ingrid Bonval-Butcher
  'ingrid': 'Ingrid Bonval-Butcher',
  'ingrid butcher': 'Ingrid Bonval-Butcher',
  'ingrid bonval butcher': 'Ingrid Bonval-Butcher',
  'ingrid bonval-butcher': 'Ingrid Bonval-Butcher',
  'ingrid bonval-butcher k': 'Ingrid Bonval-Butcher',

  // Julie-Ann Fernandes-Charles
  'julie charles': 'Julie-Ann Fernandes-Charles',
  'julie-ann charles': 'Julie-Ann Fernandes-Charles',
  'julie ann fernandes charles': 'Julie-Ann Fernandes-Charles',
  'julie-ann fernandes-charles': 'Julie-Ann Fernandes-Charles',

  // Marlene Walker-Castle
  'marlene walker': 'Marlene Walker-Castle',
  'marlene walker castle': 'Marlene Walker-Castle',
  'marlene walker-castle': 'Marlene Walker-Castle',

  // Regina Joseph-Gonzales
  'regina joseph-gonzales': 'Regina Joseph-Gonzales',
  'regina joseph gonzales': 'Regina Joseph-Gonzales',
  'regina gonzales': 'Regina Joseph-Gonzales',
  'regina joseph': 'Regina Joseph-Gonzales',
  'regina joseph- gonzales': 'Regina Joseph-Gonzales',
  'regina joseph - gonzales': 'Regina Joseph-Gonzales',

  // Whitney Tracey Seelochan
  'whitney tracey seelochan': 'Whitney Tracey Seelochan',
  'whitney seelochan': 'Whitney Tracey Seelochan',

  // Racine Roy
  'racian': 'Racine Roy',
  'racian roy': 'Racine Roy',
  'racine roy': 'Racine Roy',

  // Kemrolene Bowens-Opadeyi
  'kemrolene opadeyi': 'Kemrolene Bowens-Opadeyi',
  'kemrolene bowens-opadeyi': 'Kemrolene Bowens-Opadeyi',

  // Keyshana Gomes
  'keyshana gomes': 'Keyshana Gomes',
  'ice4evah@gmail.com': 'Keyshana Gomes',

  // Jenetta Pierre
  'jenetta pierre': 'Jenetta Pierre',
  'jenetta.pierre04@gmail.com': 'Jenetta Pierre',

  // Nevillean Dundas
  'nevillean dundas': 'Nevillean Dundas',
  'nevellean dundas': 'Nevillean Dundas',

  // Alicia Noray Bowles
  'alicia noray bowles': 'Alicia Noray Bowles',
  'alicia bowles': 'Alicia Noray Bowles',

  // Anne-Marie Davis
  'anne marie davis': 'Anne-Marie Davis',
  'anne-marie davis': 'Anne-Marie Davis',

  // Susan Sparks
  'susan spark': 'Susan Sparks',
  'susan sparks': 'Susan Sparks',
  'susan  spark': 'Susan Sparks',
  'susan  sparks': 'Susan Sparks',
  's spark': 'Susan Sparks',
  's. spark': 'Susan Sparks',
  's sparks': 'Susan Sparks',
  's. sparks': 'Susan Sparks',
  'spark susan': 'Susan Sparks',
  'sparks susan': 'Susan Sparks',
  'susansparks': 'Susan Sparks',
  'susanspark': 'Susan Sparks',

  // Wendy Woodruffe
  'wendy woodruffe': 'Wendy Woodruffe',
  'wendy wondruffe': 'Wendy Woodruffe',

  // Racquel Gumbs
  'racquel gumbs': 'Racquel Gumbs',
  'raquel gumbs': 'Racquel Gumbs',

  // Kathleen Joseph-Sandy
  'kathleen joseph-sandy': 'Kathleen Joseph-Sandy',
  'kathleen  joseph-sandy': 'Kathleen Joseph-Sandy',

  // Richard Roberts
  'richard roberts': 'Richard Roberts',
  'richard  roberts': 'Richard Roberts',

  // Tessa Phipps
  'tessa phipps': 'Tessa Phipps',
  'tessa  phipps': 'Tessa Phipps',

  // Afeshia Burke
  'afeshia': 'Afeshia Burke',
  'afeshia burke': 'Afeshia Burke',

  // Rennie Bowles
  'rennie': 'Rennie Bowles',
  'rennie bowles': 'Rennie Bowles',

  // Roxanne Sealey
  'roxanne': 'Roxanne Sealey',
  'roxanne sealey': 'Roxanne Sealey',

  // Diana Selkridge & Beverly Selkridge
  'diana selkridge': 'Diana Selkridge',
  'beverly selkridge': 'Beverly Selkridge',
  'vikash ramnarace': 'Vikash Ramnarace',
  'francisca swift': 'Francisca Swift',
  'jessica fiddler': 'Jessica Fiddler',
  'tricia worrell': 'Tricia Worrell',
  'jovanka williams': 'Jovanka Williams',
  'felicia williams': 'Felicia Williams',
  'candy webb': 'Candy Webb',
  'claudia cashe': 'Claudia Cashe',
  'kristy alexander': 'Kristy Alexander',
  'jerzelle whiteman': 'Jerzelle Whiteman',
  'catherine vidale': 'Catherine Vidale',
  'natalie webb lewis': 'Natalie Webb Lewis',
  'leslie inniss': 'Leslie Inniss',
  'josanne pompey': 'Josanne Pompey',
  'lynton pompey': 'Lynton Pompey',
  'atiya williams': 'Atiya Williams',
  'zahra andrews': 'Zahra Andrews',
  'kadijah daniel': 'Kadijah Daniel',
  'stacey waithe': 'Stacey Waithe',
  'javier marks': 'Javier Marks',
  'gale': 'Gale Agrant',
  'gillian': 'Gillian Selkridge',
};

export const normalizeStudentName = (str: string): string => (str || '').toLowerCase().trim().replace(/[\u00A0\s]+/g, ' ');

export const getCanonicalNamesMap = (rawNames: string[]): Map<string, string> => {
  const nameGroups: string[][] = [];
  const canonicalNames = new Map<string, string>();

  // Helper to normalize strings for comparison
  const normalize = normalizeStudentName;

  rawNames.forEach((rawName: string) => {
    if (!rawName) return;
    const lowerRaw = normalize(rawName);
    const explicitCanonical = MANUAL_ALIASES[lowerRaw];
    const normalizedRaw = lowerRaw.replace(/[^a-z0-9 ]/g, ' ').trim();

    let foundGroup = false;
    for (const group of nameGroups) {
      const representative = group[0];
      const lowerRep = normalize(representative);
      const explicitRepCanonical = MANUAL_ALIASES[lowerRep];

      // If both map to the same manual alias, group together immediately
      if (explicitCanonical && explicitRepCanonical && explicitCanonical === explicitRepCanonical) {
        group.push(rawName);
        foundGroup = true;
        break;
      }
      if (explicitCanonical && group.some((n: string) => MANUAL_ALIASES[normalize(n)] === explicitCanonical)) {
        group.push(rawName);
        foundGroup = true;
        break;
      }

      // If both have different explicit canonical names, do NOT merge
      if (explicitCanonical && explicitRepCanonical && explicitCanonical !== explicitRepCanonical) {
        continue;
      }

      const normalizedRep = lowerRep.replace(/[^a-z0-9 ]/g, ' ').trim();
      const rawCompact = normalizedRaw.replace(/\s/g, '');
      const repCompact = normalizedRep.replace(/\s/g, '');
      const rawNoDigits = rawCompact.replace(/\d+/g, '').replace(/@.*$/, '');
      const repNoDigits = repCompact.replace(/\d+/g, '').replace(/@.*$/, '');

      if (rawCompact === repCompact || (rawNoDigits.length > 4 && rawNoDigits === repNoDigits)) {
        group.push(rawName);
        foundGroup = true;
        break;
      }
      
      const rawParts = normalizedRaw.split(/\s+/).filter(Boolean);
      const repParts = normalizedRep.split(/\s+/).filter(Boolean);

      // Prevent merging distinct students with different last names
      if (rawParts.length >= 2 && repParts.length >= 2) {
        const rawFirst = rawParts[0];
        const rawLast = rawParts[rawParts.length - 1];
        const repFirst = repParts[0];
        const repLast = repParts[repParts.length - 1];

        // If last names are different and not initials or compound, keep separate
        if (rawLast !== repLast && rawLast.length > 2 && repLast.length > 2) {
          const isCompoundSurname = rawLast.includes(repLast) || repLast.includes(rawLast);
          if (!isCompoundSurname && rawFirst !== rawLast) {
            continue;
          }
        }

        if (rawLast === repLast && rawFirst[0] === repFirst[0] && (rawFirst.length === 1 || repFirst.length === 1)) {
          group.push(rawName);
          foundGroup = true;
          break;
        }
      }

      const sim = stringSimilarity.compareTwoStrings(normalizedRaw, normalizedRep);
      if (sim > 0.8) {
        group.push(rawName);
        foundGroup = true;
        break;
      }
      
      const shorter = rawParts.length < repParts.length ? rawParts : repParts;
      const longer = rawParts.length < repParts.length ? repParts : rawParts;
      
      if (shorter.length > 0 && longer.length > 0) {
        let allPartsMatch = true;
        for (const sPart of shorter) {
          let bestMatch = 0;
          for (const lPart of longer) {
            const partSim = stringSimilarity.compareTwoStrings(sPart, lPart);
            if (partSim > bestMatch) bestMatch = partSim;
          }
          if (bestMatch < 0.75) {
            allPartsMatch = false;
            break;
          }
        }
        
        if (allPartsMatch && shorter.join('').length >= 4) {
          group.push(rawName);
          foundGroup = true;
          break;
        }
      }
    }
    
    if (!foundGroup) {
      nameGroups.push([rawName]);
    }
  });
  
  nameGroups.forEach((group: string[]) => {
    let canonical = group[0];
    for (const name of group) {
      const alias = MANUAL_ALIASES[normalize(name)];
      if (alias) {
        canonical = alias;
        break;
      }
    }

    if (!Object.values(MANUAL_ALIASES).includes(canonical)) {
      for (const name of group) {
        if (name.length > canonical.length && !name.includes('@')) {
          canonical = name;
        }
      }
    }

    group.forEach((name: string) => {
      if (name) {
        canonicalNames.set((name || '').trim(), canonical);
        canonicalNames.set(normalize(name), canonical);
        canonicalNames.set(name.toLowerCase().trim(), canonical);
      }
    });
  });

  return canonicalNames;
};
