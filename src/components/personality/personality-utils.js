export const TOTAL_TIME = 40 * 60;
export const QUESTIONS_PER_PAGE = 1;
export const QUESTION_TIME_LIMIT = 10;

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function buildRoleFitMessage(roleGroup, traits) {
  const openness = traits.find((trait) => trait.name === '개방성')?.score || 50;
  const diligence = traits.find((trait) => trait.name === '성실성')?.score || 50;
  const stability = traits.find((trait) => trait.name === '정서 안정성')?.score || 50;
  const empathy = traits.find((trait) => trait.name === '친화성')?.score || 50;

  if (roleGroup === '프로그래밍') {
    return `프로그래밍 직군에서는 성실성 ${diligence}점과 정서 안정성 ${stability}점이 중요하게 작동합니다. 문제를 끝까지 추적하고 예외를 차분하게 다루는 태도가 강점으로 연결될 가능성이 높습니다.`;
  }

  if (roleGroup === '아트') {
    return `아트 직군에서는 개방성 ${openness}점과 친화성 ${empathy}점이 작업 해석과 피드백 수용에 직접 영향을 줍니다. 시안 탐색과 수정 과정을 안정적으로 반복할 수 있는지까지 함께 보입니다.`;
  }

  return `기획 직군에서는 성실성 ${diligence}점, 정서 안정성 ${stability}점, 친화성 ${empathy}점이 함께 중요합니다. 협업 빈도가 높고 조율이 많은 역할이라 구조적으로 설명하고 끝까지 정리하는 태도가 강점으로 작동합니다.`;
}

function buildRoleStrategies(roleGroup, lieAvg) {
  const shared = [
    '비슷한 성향을 묻는 문항에서는 한쪽 방향으로 지나치게 흔들리지 않게 응답하세요.',
    `사회적 바람직성 문항 평균은 ${lieAvg.toFixed(1)}점 수준입니다. 지나치게 완벽한 사람처럼 보이려는 응답은 오히려 부자연스럽게 보일 수 있습니다.`,
    '극단적 응답만 반복하기보다 상황에 따라 강약이 있는 선택을 유지하는 편이 자연스럽습니다.',
  ];

  if (roleGroup === '프로그래밍') {
    return [
      ...shared,
      '문제 해결과 검증 과정을 중시하는 직무이므로, 안정성과 책임감이 드러나는 응답 흐름이 유리합니다.',
    ];
  }

  if (roleGroup === '아트') {
    return [
      ...shared,
      '피드백을 받고 수정하는 과정이 많은 직무라, 유연성과 감정 조절이 함께 보이도록 답하는 편이 좋습니다.',
    ];
  }

  return [
    ...shared,
    '기획 직무는 조율과 판단이 많으므로, 무조건 긍정적이기보다 상황을 구조적으로 보려는 흐름이 자연스럽습니다.',
  ];
}

export function analyzeLocally(likertAnswers, binaryAnswers, roleGroup = '기획') {
  const diligence = [18, 28, 31, 34, 64, 84, 89].map((id) => likertAnswers[id]).filter((value) => value !== undefined);
  const emotion = [11, 14, 41, 43, 47, 59, 60, 82, 83].map((id) => likertAnswers[id]).filter((value) => value !== undefined);
  const social = [4, 26, 29, 52, 54, 86].map((id) => likertAnswers[id]).filter((value) => value !== undefined);
  const openness = [5, 9, 37, 62, 71, 76].map((id) => likertAnswers[id]).filter((value) => value !== undefined);
  const selfEfficacy = [22, 32, 66, 67].map((id) => likertAnswers[id]).filter((value) => value !== undefined);
  const empathy = [19, 57, 69, 70, 85, 92].map((id) => likertAnswers[id]).filter((value) => value !== undefined);

  const calcScore = (values, invert = false) => {
    if (values.length === 0) return 50;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const score = Math.round((mean / 5) * 100);
    return invert ? 100 - score : score;
  };

  const emotionScore = calcScore(emotion, true);

  const traits = [
    { name: '성실성', score: calcScore(diligence), description: '계획, 책임감, 마감 관리, 반복 작업 완수 경향을 보여줍니다.' },
    { name: '정서 안정성', score: emotionScore, description: '스트레스 상황에서 감정을 조절하고 흔들림을 관리하는 정도를 보여줍니다.' },
    { name: '외향성', score: calcScore(social), description: '대인 상호작용과 에너지 사용 방식, 협업 선호 정도를 나타냅니다.' },
    { name: '친화성', score: calcScore(empathy), description: '협업 배려, 공감, 조율 태도가 얼마나 자연스러운지 보여줍니다.' },
    { name: '개방성', score: calcScore(openness), description: '새로운 방식 수용, 탐색 태도, 창의적 시도 성향과 연결됩니다.' },
    { name: '자기 효능감', score: calcScore(selfEfficacy), description: '문제를 해결할 수 있다는 믿음과 주도성 수준을 나타냅니다.' },
  ];

  const axisValue = (leftIds, rightIds) => {
    let score = 0;
    let count = 0;
    leftIds.forEach((id) => {
      if (binaryAnswers[id] === 'A') { score -= 30; count += 1; }
      if (binaryAnswers[id] === 'B') { score += 30; count += 1; }
    });
    rightIds.forEach((id) => {
      if (binaryAnswers[id] === 'A') { score += 30; count += 1; }
      if (binaryAnswers[id] === 'B') { score -= 30; count += 1; }
    });
    return count > 0 ? Math.round(score / count) : 0;
  };

  const workStyle = {
    axes: [
      { leftLabel: '협업 중심', rightLabel: '독립 중심', value: axisValue([20, 28], [10]), description: '혼자 깊게 파고드는 쪽인지, 협업하면서 풀어가는 쪽인지 보여줍니다.' },
      { leftLabel: '안정 추구', rightLabel: '변화 추구', value: axisValue([25, 3], [21]), description: '새로운 방식을 시도하는 편인지, 검증된 방식을 선호하는지 나타냅니다.' },
      { leftLabel: '규칙 준수', rightLabel: '자율 판단', value: axisValue([31, 28], [19]), description: '명확한 기준을 따르는지, 상황 판단으로 유연하게 움직이는지 드러납니다.' },
      { leftLabel: '안정 선호', rightLabel: '성장 선호', value: axisValue([31], [13, 19]), description: '즉시 안정과 장기 성장 중 무엇을 더 우선하는지 확인합니다.' },
      { leftLabel: '인정 추구', rightLabel: '완성 추구', value: axisValue([], [8, 18]), description: '외부 인정과 결과 완성도 중 어느 쪽 동기가 더 큰지 보여줍니다.' },
    ],
  };

  const lieItems = [10, 16, 39, 77, 91].map((id) => likertAnswers[id]).filter((value) => value !== undefined);
  const lieAvg = lieItems.length > 0 ? lieItems.reduce((sum, value) => sum + value, 0) / lieItems.length : 2.5;
  const consistencyScore = lieAvg > 4 ? 52 : 82;
  const strongestTraits = [...traits].sort((left, right) => right.score - left.score).slice(0, 2);
  const weakestTraits = [...traits].sort((left, right) => left.score - right.score).slice(0, 1);

  return {
    traits,
    workStyle,
    strengths: strongestTraits.map((trait) => ({
      title: `강점: ${trait.name}`,
      description: `${trait.name} 점수가 ${trait.score}점으로 높게 나타났습니다. ${trait.description}`,
    })),
    cautions: weakestTraits.map((trait) => ({
      title: `보완: ${trait.name}`,
      description: `${trait.name} 점수가 ${trait.score}점으로 상대적으로 낮습니다. 실제 면접에서는 이 영역을 보완하는 사례를 준비하는 편이 좋습니다.`,
    })),
    consistency: {
      score: consistencyScore,
      comment: lieAvg > 4
        ? '사회적 바람직성 문항에서 높은 응답이 보여, 실제 검사에서는 조금 더 솔직한 분포가 자연스럽습니다.'
        : '응답 흐름이 전반적으로 안정적입니다. 과도한 미화 없이 자연스럽게 답한 것으로 해석할 수 있습니다.',
    },
    gameIndustryFit: buildRoleFitMessage(roleGroup, traits),
    testStrategy: buildRoleStrategies(roleGroup, lieAvg),
  };
}

export function buildMarkdown(result, meta) {
  const lines = [];
  const dateLabel = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
  lines.push('# 인성검사 분석 결과');
  lines.push(`> 분석일: ${dateLabel} | 소요 시간: ${meta.elapsedTime} | 분석 방식: ${meta.source}`);
  lines.push('');
  lines.push('## 성격 특성 분석');
  (result.traits || []).forEach((trait) => {
    lines.push(`- **${trait.name}**: ${trait.score}점 — ${trait.description}`);
  });
  lines.push('');
  lines.push('## 업무 스타일');
  (result.workStyle?.axes || []).forEach((axis) => {
    lines.push(`- **${axis.leftLabel} ↔ ${axis.rightLabel}**: ${axis.value} / ${axis.description}`);
  });
  lines.push('');
  lines.push('## 강점');
  (result.strengths || []).forEach((item) => lines.push(`- **${item.title}**: ${item.description}`));
  lines.push('');
  lines.push('## 주의점');
  (result.cautions || []).forEach((item) => lines.push(`- **${item.title}**: ${item.description}`));
  lines.push('');
  lines.push('## 응답 일관성');
  lines.push(`- 점수: **${result.consistency?.score || 0}** / 100`);
  lines.push(`- ${result.consistency?.comment || ''}`);
  lines.push('');
  lines.push('## 게임 업계 적합도');
  lines.push(result.gameIndustryFit || '');
  lines.push('');
  lines.push('## 맞춤 준비 전략');
  (result.testStrategy || []).forEach((tip, index) => lines.push(`${index + 1}. ${tip}`));
  lines.push('');
  return lines.join('\n');
}

export function downloadMarkdown(markdown) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `인성검사_결과_${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function openPdfPrint(result, meta) {
  const markdown = buildMarkdown(result, meta)
    .replace(/\n/g, '<br />')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return;
  win.document.open();
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>인성검사 결과</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:32px;line-height:1.7;color:#0f172a;">${markdown}<div style="margin-top:24px;"><button onclick="window.print()" style="padding:12px 24px;border:0;border-radius:999px;background:#0f172a;color:#fff;font-weight:700;">PDF 저장</button></div></body></html>`);
  win.document.close();
  win.onload = () => setTimeout(() => win.print(), 300);
}
