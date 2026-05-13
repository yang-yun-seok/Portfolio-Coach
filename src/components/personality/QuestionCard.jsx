import React from 'react';
import { LIKERT_OPTIONS } from '../../data/personalityTestData';

export default function QuestionCard({
  number,
  text,
  questionData,
  selected,
  onSelect,
  type,
  totalNumber,
}) {
  if (type === 'likert') {
    return (
      <article className="coach-personality-question">
        <header className="coach-personality-question-head">
          <span className="coach-personality-question-badge">{totalNumber || number}</span>
          <p>{text}</p>
        </header>
        <div className="coach-personality-question-body">
          <div className="coach-personality-likert-grid">
            {LIKERT_OPTIONS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => onSelect(index)}
                className={selected === index ? 'is-selected' : ''}
              >
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </article>
    );
  }

  const question = questionData;

  return (
    <article className="coach-personality-question">
      <header className="coach-personality-question-head">
        <span className="coach-personality-question-badge">{question.id}</span>
        <div>
          {question.group ? <span className="coach-personality-question-group">{question.group}</span> : null}
          <p>{question.text}</p>
        </div>
      </header>
      <div className="coach-personality-question-body coach-personality-binary-stack">
        <button
          type="button"
          onClick={() => onSelect('A')}
          className={`coach-personality-binary-option ${selected === 'A' ? 'is-selected' : ''}`}
        >
          <span className="coach-personality-binary-option-label">A</span>
          <span>{question.optionA}</span>
        </button>
        <button
          type="button"
          onClick={() => onSelect('B')}
          className={`coach-personality-binary-option ${selected === 'B' ? 'is-selected' : ''}`}
        >
          <span className="coach-personality-binary-option-label">B</span>
          <span>{question.optionB}</span>
        </button>
      </div>
    </article>
  );
}
