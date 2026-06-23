const WEIGHT_ANCHOR = 0.35;
const WEIGHT_PURITY = 0.30;
const WEIGHT_COURSE = 0.20;
const WEIGHT_COVERAGE = 0.15;

const THRESHOLD_HIGH = 0.80;
const THRESHOLD_MEDIUM = 0.55;

function tokenize(text) {
  return (text || '').toLowerCase().match(/[a-zäöüß]{2,}/g) || [];
}

export function scoreSplit({ courses, notes, raw, langModel }) {
  // anchor score
  const anchoredCount = courses.filter(c => c.anchored).length;
  const anchor = anchoredCount / Math.max(courses.length, 1);

  // purity score
  let puritySum = 0;
  let purityCount = 0;
  for (const course of courses) {
    if (!course.mono) {
      const deClean = (course.de || '').replace(/\([^)]*\)/g, '').trim();
      const enClean = (course.en || '').replace(/\([^)]*\)/g, '').trim();
      
      const deScoreLang = langModel.scoreLang(deClean);
      const enScoreLang = langModel.scoreLang(enClean);
      
      const de_purity = Math.max(0, deScoreLang) / (Math.abs(deScoreLang) + 1);
      const en_purity = Math.max(0, -enScoreLang) / (Math.abs(enScoreLang) + 1);
      
      puritySum += de_purity + en_purity;
      purityCount += 2;
    }
  }
  const purity = purityCount > 0 ? puritySum / purityCount : 1.0;

  // course score
  const baseCourseScore = courses.length >= 1 && courses.length <= 3 ? 1.0 : 0.0;
  let penalties = 0;
  for (const course of courses) {
    if (!course.mono) {
      if (!course.de || course.de.length === 0 || !course.en || course.en.length === 0) {
        penalties += 0.3;
      }
    }
  }
  const courseScore = Math.max(0, baseCourseScore - penalties);

  // coverage score
  const rawTokens = tokenize(raw);
  const splitText = courses.map(c => (c.de || '') + ' ' + (c.en || '')).join(' ') + ' ' + (notes || []).join(' ');
  const splitTokenSet = new Set(tokenize(splitText));
  const covered = rawTokens.filter(t => splitTokenSet.has(t)).length;
  const coverage = covered / Math.max(rawTokens.length, 1);

  // composite confidence
  const confidence = Math.max(0, Math.min(1,
    anchor * WEIGHT_ANCHOR +
    purity * WEIGHT_PURITY +
    courseScore * WEIGHT_COURSE +
    coverage * WEIGHT_COVERAGE
  ));

  // assign label based on thresholds
  let label = 'low';
  if (confidence >= THRESHOLD_HIGH) {
    label = 'high';
  } else if (confidence >= THRESHOLD_MEDIUM) {
    label = 'medium';
  }

  return {
    confidence,
    subScores: {
      anchor,
      purity,
      course: courseScore,
      coverage
    },
    label
  };
}