import React from 'react';
import {
  AlertCircle,
  CheckCircle,
  Code2,
  ExternalLink,
  Hash,
  Loader2,
  Pin,
  Plus,
  Search,
  Target,
  Trash2,
  UploadCloud,
  User,
  X,
} from 'lucide-react';
import { ROLE_GROUPS, getProfileDisplayRole, getRoleDetails } from '../data/skills';
import InstructorFeedbackForm from './InstructorFeedbackForm';

export default function InputWorkspace({
  analyzeApplication,
  clearPinnedSlot,
  coverLetterFile,
  currentProvider,
  handleAddSkill,
  handleInputChange,
  handlePinnedGiNoChange,
  handlePortfolioChange,
  handleQuickAddSkill,
  handleRemoveSkill,
  handleRoleGroupSelect,
  handleSubRoleChange,
  instructorFeedback,
  loading,
  normalizedUserInfo,
  pinnedSlots,
  portfolioFiles,
  resolvePinnedJob,
  resumeFile,
  rolePlaybook,
  selectedRoleDetail,
  selectedRoleGroupInfo,
  selectedSkillSuggestions,
  setCoverLetterFile,
  setInstructorFeedback,
  setPortfolioFiles,
  setResumeFile,
  setSkillInput,
  skillCategories,
  skillInput,
  userInfo,
}) {
  const roleDetails = getRoleDetails(normalizedUserInfo.roleGroup);
  const profileDisplayRole = getProfileDisplayRole(normalizedUserInfo);
  const fileUploadDisabled = currentProvider && !currentProvider.supportsFiles;

  return (
    <div className="apple-view space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="apple-intro">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">분석 프로필 & 서류 입력</h2>
        <p className="text-slate-500">정확한 매칭과 피드백을 위해 정보를 입력하고 관련 서류를 첨부해 주세요.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><User size={20} className="text-indigo-500" /> 내 프로필 정보</h3>
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-sm font-semibold text-slate-700">직무 대분류</label>
            <span className="text-xs text-slate-400">세부 직무와 역량 추천이 함께 바뀝니다.</span>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {ROLE_GROUPS.map((group) => {
              const isActive = group.label === normalizedUserInfo.roleGroup;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleRoleGroupSelect(group.label)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white shadow-lg'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-white'
                  }`}
                >
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>Track</p>
                  <p className="mt-1 text-base font-bold">{group.label}</p>
                  <p className={`mt-2 text-xs leading-relaxed ${isActive ? 'text-slate-200' : 'text-slate-500'}`}>{group.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">지원자 이름</label>
            <input type="text" name="name" value={userInfo.name} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="양윤석" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">세부 직무</label>
            <select value={normalizedUserInfo.subRole} onChange={handleSubRoleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
              {roleDetails.map((detail) => <option key={detail.label} value={detail.label}>{detail.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">총 경력 (년)</label>
            <input type="number" name="experience" min="0" max="30" value={userInfo.experience} onChange={handleInputChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>
        <p className="mb-5 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600 border border-slate-100">
          <span className="font-bold text-slate-800">{profileDisplayRole}</span>
          <span className="mx-2 text-slate-300">|</span>
          {selectedRoleDetail.focus}
        </p>

        <div className="mb-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Recruiter Lens</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">{selectedRoleGroupInfo.description}</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-900">{rolePlaybook.recruiterLens}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{rolePlaybook.skillGuide}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Evidence Checklist</p>
            <ul className="mt-3 space-y-2">
              {rolePlaybook.evidenceChecklist.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {normalizedUserInfo.roleGroup === '프로그래밍' && (
          <div className="mb-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
            <label className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Code2 size={16} className="text-sky-600" />
              GitHub 포트폴리오 저장소 URL
              <span className="text-xs font-normal text-slate-400">(선택, public repo)</span>
            </label>
            <input
              type="url"
              name="githubUrl"
              value={userInfo.githubUrl || ''}
              onChange={handleInputChange}
              className="mt-2 w-full rounded-xl border border-sky-100 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
              placeholder="https://github.com/username/project"
            />
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              무료 서버 부담을 줄이기 위해 저장소를 clone하지 않고 README, 루트 구조, package 파일 같은 핵심 정보만 읽어 기술문서 초안을 만듭니다.
            </p>
            <ul className="mt-3 space-y-1.5">
              {rolePlaybook.githubGuide?.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-sky-900">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">직무 역량 및 숙련도</label>
              <p className="text-xs text-slate-500">
                {rolePlaybook.skillGuide}
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Current Category · {skillInput.category}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <select
              value={skillInput.category}
              onChange={(e) => setSkillInput({ category: e.target.value, name: skillCategories[e.target.value][0], level: '중' })}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm"
            >
              {Object.keys(skillCategories).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select
              value={skillInput.name}
              onChange={(e) => setSkillInput((prev) => ({ ...prev, name: e.target.value }))}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm"
            >
              {(skillCategories[skillInput.category] || Object.values(skillCategories)[0]).map((skill) => <option key={skill} value={skill}>{skill}</option>)}
            </select>
            <div className="flex gap-2">
              <select
                value={skillInput.level}
                onChange={(e) => setSkillInput((prev) => ({ ...prev, level: e.target.value }))}
                className="w-20 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none text-sm font-bold text-center"
              >
                <option value="상">상</option>
                <option value="중">중</option>
                <option value="하">하</option>
              </select>
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg flex items-center gap-1 text-sm font-semibold transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" /> 추가
              </button>
            </div>
          </div>

          <div className="mb-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Quick Add</p>
            <div className="flex flex-wrap gap-2">
              {selectedSkillSuggestions.map((skill) => {
                const isSelected = userInfo.skills.some((entry) => entry.name === skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => handleQuickAddSkill(skill)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-800">서류에 적기 좋은 기준</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              사용해본 항목보다 증명 가능한 항목만 남기세요. 프로젝트명, 산출물, 성과 수치, 협업 역할 중 최소 하나와 연결되는 역량이 좋습니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[44px] p-3 bg-slate-50 rounded-xl border border-slate-100">
            {userInfo.skills.length === 0
              ? <span className="text-sm text-slate-400 my-auto">추가된 기술이 없습니다.</span>
              : userInfo.skills.map((skill, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-white border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full text-sm shadow-sm">
                    <span className="font-semibold">{skill.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${skill.level === '상' ? 'bg-emerald-100 text-emerald-700' : skill.level === '중' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{skill.level}</span>
                    <button type="button" onClick={() => handleRemoveSkill(skill.name)} className="text-indigo-300 hover:text-red-500 ml-0.5"><X className="w-4 h-4" /></button>
                  </div>
                ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
          <UploadCloud size={20} className="text-emerald-500" /> 서류 첨부
          <span className="text-slate-400 font-normal text-sm ml-1">(선택)</span>
        </h3>
        {fileUploadDisabled && (
          <p className="text-amber-600 text-xs mb-4 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
            ※ PDF 파일 분석은 <strong>Gemini</strong> 제공자에서만 지원됩니다. 다른 제공자는 프로필 정보만으로 분석합니다.
          </p>
        )}
        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="lg:max-w-[18rem]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Document Strategy</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-900">{rolePlaybook.portfolioGuide}</p>
            </div>
            <ul className="grid flex-1 gap-2 md:grid-cols-3">
              {rolePlaybook.fileChecklist.map((item) => (
                <li key={item} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs leading-relaxed text-slate-600">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`border border-slate-200 rounded-xl p-4 ${fileUploadDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <label className="block text-sm font-semibold text-slate-700 mb-2">이력서 (PDF)</label>
            <p className="mb-3 text-xs leading-relaxed text-slate-500">
              직무 키워드, 담당 범위, 결과 수치가 첫 페이지 안에서 읽히게 정리하는 편이 좋습니다.
            </p>
            <input type="file" accept=".pdf" onChange={(e) => { if (e.target.files[0]) setResumeFile(e.target.files[0]); }} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
            {resumeFile && (
              <div className="mt-2 text-xs text-slate-600 bg-slate-100 p-2 rounded flex justify-between">
                <span className="truncate">{resumeFile.name}</span>
                <button type="button" onClick={() => setResumeFile(null)}><Trash2 size={14} className="text-red-500" /></button>
              </div>
            )}
          </div>
          <div className={`border border-slate-200 rounded-xl p-4 ${fileUploadDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <label className="block text-sm font-semibold text-slate-700 mb-2">자기소개서 (PDF)</label>
            <p className="mb-3 text-xs leading-relaxed text-slate-500">
              지원 동기보다 문제 해결 방식, 협업 태도, 판단 근거가 드러나는 사례 위주가 좋습니다.
            </p>
            <input type="file" accept=".pdf" onChange={(e) => { if (e.target.files[0]) setCoverLetterFile(e.target.files[0]); }} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100" />
            {coverLetterFile && (
              <div className="mt-2 text-xs text-slate-600 bg-slate-100 p-2 rounded flex justify-between">
                <span className="truncate">{coverLetterFile.name}</span>
                <button type="button" onClick={() => setCoverLetterFile(null)}><Trash2 size={14} className="text-red-500" /></button>
              </div>
            )}
          </div>
          <div className={`border border-slate-200 rounded-xl p-4 md:col-span-2 ${fileUploadDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center justify-between">
              <span>포트폴리오 (PDF 다중)</span>
              <span className={`text-xs font-normal ${portfolioFiles.length >= 8 ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                {portfolioFiles.length > 0 ? `첨부 ${portfolioFiles.length}개` : '최대 8개'}
              </span>
            </label>
            <p className="mb-3 text-xs leading-relaxed text-slate-500">
              {normalizedUserInfo.roleGroup === '프로그래밍'
                ? '대표 프로젝트 문서, 기술 설명, 실행 화면, 구조도처럼 코드 이해를 돕는 자료부터 넣는 편이 좋습니다.'
                : normalizedUserInfo.roleGroup === '아트'
                  ? '결과물 단독보다 작업 과정, 역할 분리, 엔진 적용 컷이 포함된 시트를 우선 넣는 편이 좋습니다.'
                  : '기획 의도, 설계 근거, 검증 결과가 연결된 문서부터 넣는 편이 좋습니다.'}
            </p>
            <input
              type="file"
              accept=".pdf"
              multiple
              disabled={portfolioFiles.length >= 8}
              onChange={handlePortfolioChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100 disabled:opacity-40 disabled:cursor-not-allowed"
            />
            {portfolioFiles.length >= 8 && (
              <p className="mt-1 text-xs text-red-500">최대 8개까지 업로드할 수 있습니다. (각 10MB 이하)</p>
            )}
            {portfolioFiles.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {portfolioFiles.map((file, idx) => (
                  <div key={idx} className="text-xs text-slate-600 bg-slate-100 p-2 rounded flex justify-between items-center">
                    <span className="truncate flex-1">{file.name}</span>
                    <button type="button" onClick={() => setPortfolioFiles((prev) => prev.filter((_, i) => i !== idx))} className="ml-2"><Trash2 size={14} className="text-red-500" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
          <Pin size={20} className="text-rose-500" /> 우선 공고 지정
          <span className="text-slate-400 font-normal text-sm ml-1">(선택)</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          GameJob 공고 번호(GI_No)를 입력하면 해당 공고가 1~3순위에 고정됩니다.
          기존 데이터에 없는 공고는 자동으로 크롤링합니다.
          <span className="text-slate-400 ml-1">(예: 258667 또는 URL 전체 붙여넣기 가능)</span>
        </p>
        <div className="space-y-3">
          {pinnedSlots.map((slot) => (
            <div key={slot.rank} className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                slot.rank === 1 ? 'bg-sky-100 text-sky-700 border border-sky-200' :
                slot.rank === 2 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                  'bg-amber-100 text-amber-700 border border-amber-200'
              }`}>
                {slot.rank}
              </span>

              <div className="flex-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={slot.giNo}
                      onChange={(e) => handlePinnedGiNoChange(slot.rank, e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') resolvePinnedJob(slot.rank); }}
                      placeholder="공고 번호 (예: 258667)"
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      disabled={slot.status === 'loading'}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => resolvePinnedJob(slot.rank)}
                    disabled={!slot.giNo.trim() || slot.status === 'loading'}
                    className="px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {slot.status === 'loading'
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Search size={14} />}
                    조회
                  </button>
                  {slot.status === 'resolved' && (
                    <button
                      type="button"
                      onClick={() => clearPinnedSlot(slot.rank)}
                      className="px-2 py-2 text-slate-400 hover:text-red-500 transition-colors"
                      title="초기화"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {slot.status === 'loading' && (
                  <p className="mt-1.5 text-xs text-indigo-500 flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" />
                    공고 조회 중... (없으면 자동 크롤링)
                  </p>
                )}
                {slot.status === 'error' && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {slot.error}
                  </p>
                )}
                {slot.status === 'resolved' && slot.job && (
                  <div className="mt-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                      <span className="font-bold text-slate-700">{slot.job.company}</span>
                      <span className="text-slate-500">—</span>
                      <span className="text-slate-600 truncate">{slot.job.title}</span>
                      {slot.job.url && (
                        <a href={slot.job.url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700 flex-shrink-0">
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-[10px]">{slot.job.role}</span>
                      {slot.job.reqSkills?.slice(0, 4).map((skill, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px]">{skill}</span>
                      ))}
                      {(slot.job.reqSkills?.length || 0) > 4 && (
                        <span className="px-1.5 py-0.5 text-slate-400 text-[10px]">+{slot.job.reqSkills.length - 4}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <InstructorFeedbackForm value={instructorFeedback} onChange={setInstructorFeedback} />

      <button
        type="button"
        onClick={analyzeApplication}
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-70"
      >
        {loading
          ? <><Loader2 size={20} className="animate-spin" /> AI 분석 요청 처리 중 ({currentProvider?.label || 'Gemini'})...</>
          : <><Target size={20} /> AI 분석 시작 및 저장</>}
      </button>

      {loading && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-900">분석 요청은 정상적으로 처리되고 있습니다.</p>
              <p className="text-sm leading-relaxed text-amber-800">
                서버와 AI 모델이 응답을 정리하는 과정이라 최대 1분 정도 걸릴 수 있습니다. 진행 중에는 새로고침, 뒤로 가기, 탭 닫기를 하지 말고 잠시만 기다려 주세요.
              </p>
              <p className="text-xs font-semibold text-amber-700">응답이 도착하면 결과를 로컬에 저장한 뒤 서류 피드백 화면으로 자동 이동합니다.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
