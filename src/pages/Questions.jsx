import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const API = '/api';
const defaultMcqOption = () => ({ id: undefined, optionText: '', isCorrect: false });

const defaultCodingTemplate = () => ({
  id: undefined,
  languageId: 1,
  timeLimit: 1,
  memoryLimit: 256,
  defaultCode: '',
  driverCode: '',
});

const defaultCodingTestCase = () => ({
  id: undefined,
  input: '',
  expectedOutput: '',
  isHidden: false,
});

export default function Questions() {
  const navigate = useNavigate();
  const location = useLocation();

  const query = new URLSearchParams(location.search);
  const skillIdFromUrl = query.get('skillId') || '';
  const skillNameFromUrl = query.get('skillName') || '';

  const token = localStorage.getItem('token');

  const [loading, setLoading] = useState(true);
  const [skillsLoading, setSkillsLoading] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [skills, setSkills] = useState([]);
  const [tracks, setTracks] = useState([]);

  // Map: skillId -> trackName (we build it by calling /skills?TrackId=...)
  const [trackNameBySkillId, setTrackNameBySkillId] = useState({});

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
  };

  const [formModal, setFormModal] = useState({
    show: false,
    mode: 'add', // add | edit
    type: 'MCQ', // MCQ | Coding
    id: null,
  });

  const [deleteModal, setDeleteModal] = useState({ show: false, data: null });
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    text: '',
    seniorityLevel: '',
    skillId: skillIdFromUrl || '',

    options: [defaultMcqOption(), defaultMcqOption()],
    templates: [defaultCodingTemplate()],
    testCases: [defaultCodingTestCase()],
  });

  const authHeaderOnly = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    }),
    [token]
  );

  const authJsonHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }),
    [token]
  );

  const handleUnauthorized = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const extractList = (json) => {
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.data)) return json.data;
    if (Array.isArray(json?.items)) return json.items;
    if (Array.isArray(json?.result)) return json.result;
    return [];
  };

  const fetchSkills = async () => {
    setSkillsLoading(true);
    try {
      // IMPORTANT: PageSize must be <= server limit
      const res = await fetch(`${API}/skills?PageIndex=1&PageSize=100`, {
        headers: authHeaderOnly,
      });

      if (res.status === 401) return handleUnauthorized();

      const json = await res.json().catch(() => ({}));
      if (res.ok) setSkills(extractList(json));
      else {
        console.log('GET skills failed:', json);
        setSkills([]);
        showToast('Failed to load skills', 'error');
      }
    } catch (e) {
      console.log(e);
      setSkills([]);
      showToast('Network error while loading skills', 'error');
    } finally {
      setSkillsLoading(false);
    }
  };

  const fetchTracks = async () => {
    try {
      const res = await fetch(`${API}/tracks?PageIndex=1&PageSize=100`, {
        headers: authHeaderOnly,
      });

      if (res.status === 401) return handleUnauthorized();

      const json = await res.json().catch(() => ({}));
      if (res.ok) setTracks(extractList(json));
      else setTracks([]);
    } catch (e) {
      console.log(e);
      setTracks([]);
    }
  };

  // Build skillId -> trackName map by fetching skills per track
  const buildTrackNameBySkillId = async (tracksList) => {
    try {
      const results = await Promise.all(
        (tracksList || []).map(async (t) => {
          const res = await fetch(
            `${API}/skills?PageIndex=1&PageSize=100&TrackId=${t.id}`,
            { headers: authHeaderOnly }
          );

          if (res.status === 401) return { track: t, skills: [] };

          const json = await res.json().catch(() => ({}));
          return { track: t, skills: res.ok ? extractList(json) : [] };
        })
      );

      const map = {};
      results.forEach(({ track, skills }) => {
        skills.forEach((s) => {
          map[String(s.id)] = track.name;
        });
      });

      setTrackNameBySkillId(map);
    } catch (e) {
      console.log('buildTrackNameBySkillId error', e);
      setTrackNameBySkillId({});
    }
  };

  const fetchQuestions = async () => {
    const params = new URLSearchParams();
    params.set('PageIndex', '1');
    params.set('PageSize', '100');
    if (skillIdFromUrl) params.set('SkillId', skillIdFromUrl);

    const res = await fetch(`${API}/questions?${params.toString()}`, {
      headers: authHeaderOnly,
    });

    if (res.status === 401) return handleUnauthorized();

    const json = await res.json().catch(() => ({}));
    if (res.ok) setQuestions(extractList(json));
    else {
      console.log('GET questions failed:', json);
      setQuestions([]);
      showToast('Failed to load questions', 'error');
    }
  };

  const ensureSkillsLoaded = async () => {
    if (!skills || skills.length === 0) await fetchSkills();
  };

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchSkills(), fetchTracks(), fetchQuestions()]);
      } finally {
        setLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // whenever tracks change, rebuild the map skill->track
  useEffect(() => {
    if (tracks.length) buildTrackNameBySkillId(tracks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  useEffect(() => {
    if (skillIdFromUrl) {
      setForm((p) => ({ ...p, skillId: skillIdFromUrl }));
      fetchQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillIdFromUrl]);

  // ===== Skill name map (for cards) =====
  const skillNameById = useMemo(() => {
    const map = new Map();
    skills.forEach((s) => map.set(Number(s.id), s.name));
    return map;
  }, [skills]);

  // ===== Modal handlers =====
  const resetForm = (type = 'MCQ') => {
    setForm({
      title: '',
      text: '',
      seniorityLevel: '',
      skillId: skillIdFromUrl || '',
      options: [defaultMcqOption(), defaultMcqOption()],
      templates: [defaultCodingTemplate()],
      testCases: [defaultCodingTestCase()],
    });

    setFormModal((prev) => ({ ...prev, type }));
  };

  const openAdd = async (type) => {
    await ensureSkillsLoaded();
    resetForm(type);
    setFormModal({ show: true, mode: 'add', type, id: null });
  };

  const openEdit = async (q) => {
    await ensureSkillsLoaded();

    setLoading(true);
    try {
      const res = await fetch(`${API}/questions/${q.id}`, { headers: authHeaderOnly });
      if (res.status === 401) return handleUnauthorized();

      const json = await res.json().catch(() => ({}));
      const details = json?.data ?? json;

      const typeFromApi =
        details?.questionType ||
        details?.type ||
        (Array.isArray(details?.options) ? 'MCQ' : 'Coding');

      const fixedType = String(typeFromApi).toLowerCase().includes('mcq') ? 'MCQ' : 'Coding';

      setFormModal({ show: true, mode: 'edit', type: fixedType, id: q.id });

      setForm({
        title: details?.title || '',
        text: details?.text || '',
        seniorityLevel: details?.seniorityLevel || '',
        skillId:
          (details?.skillIds?.[0] ??
            details?.skillId ??
            details?.skills?.[0]?.id ??
            skillIdFromUrl ??
            '')?.toString?.() || '',

        options:
          Array.isArray(details?.options) && details.options.length
            ? details.options.map((o) => ({
                id: o?.id,
                optionText: o?.optionText ?? '',
                isCorrect: !!o?.isCorrect,
              }))
            : [defaultMcqOption(), defaultMcqOption()],

        templates:
          Array.isArray(details?.templates) && details.templates.length
            ? details.templates.map((t) => ({
                id: t?.id,
                languageId: t?.languageId ?? 1,
                timeLimit: t?.timeLimit ?? 1,
                memoryLimit: t?.memoryLimit ?? 256,
                defaultCode: t?.defaultCode ?? '',
                driverCode: t?.driverCode ?? '',
              }))
            : [defaultCodingTemplate()],

        testCases:
          Array.isArray(details?.testCases) && details.testCases.length
            ? details.testCases.map((tc) => ({
                id: tc?.id,
                input: tc?.input ?? '',
                expectedOutput: tc?.expectedOutput ?? '',
                isHidden: !!tc?.isHidden,
              }))
            : [defaultCodingTestCase()],
      });
    } catch (e) {
      console.log(e);
      showToast('Failed to load question details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const closeFormModal = () => {
    if (saving) return;
    setFormModal({ show: false, mode: 'add', type: 'MCQ', id: null });
  };

  const openDelete = (q) => setDeleteModal({ show: true, data: q });
  const closeDelete = () => {
    if (saving) return;
    setDeleteModal({ show: false, data: null });
  };

  // ===== Submit (Add/Edit) =====
  const submitQuestion = async (e) => {
    e.preventDefault();

    const title = form.title.trim();
    const text = form.text.trim();
    const level = form.seniorityLevel;
    const skillIdNum = Number(form.skillId);

    if (!title || !text || !level || !skillIdNum) {
      showToast('Please fill Title / Text / Level / Skill', 'error');
      return;
    }

    const isEdit = formModal.mode === 'edit';
    const type = formModal.type;

    setSaving(true);
    try {
      let url = '';
      const method = isEdit ? 'PUT' : 'POST';
      let payload = null;

      if (type === 'MCQ') {
        const options = (form.options || []).map((o) => ({
          id: o.id,
          optionText: (o.optionText || '').trim(),
          isCorrect: !!o.isCorrect,
        }));

        if (options.length < 2 || options.some((o) => !o.optionText)) {
          showToast('MCQ needs at least 2 filled options', 'error');
          return;
        }
        if (!options.some((o) => o.isCorrect)) {
          showToast('Select at least one correct option', 'error');
          return;
        }

        url = isEdit ? `${API}/questions/mcq/${formModal.id}` : `${API}/questions/mcq`;

        payload = {
          title,
          text,
          seniorityLevel: level,
          skillIds: [skillIdNum],
          options: options.map((o) => ({
            ...(isEdit && o.id != null ? { id: o.id } : {}),
            optionText: o.optionText,
            isCorrect: o.isCorrect,
          })),
        };
      } else {
        const templates = (form.templates || []).map((t) => ({
          id: t.id,
          languageId: Number(t.languageId) || 1,
          timeLimit: Number(t.timeLimit) || 1,
          memoryLimit: Number(t.memoryLimit) || 256,
          defaultCode: t.defaultCode ?? '',
          driverCode: t.driverCode ?? '',
        }));

        const testCases = (form.testCases || []).map((tc) => ({
          id: tc.id,
          input: tc.input ?? '',
          expectedOutput: tc.expectedOutput ?? '',
          isHidden: !!tc.isHidden,
        }));

        if (!templates.length) {
          showToast('Coding needs at least 1 template', 'error');
          return;
        }
        if (!testCases.length) {
          showToast('Coding needs at least 1 test case', 'error');
          return;
        }

        url = isEdit ? `${API}/questions/coding/${formModal.id}` : `${API}/questions/coding`;

        payload = {
          title,
          text,
          seniorityLevel: level,
          skillIds: [skillIdNum],
          templates: templates.map((t) => ({
            ...(isEdit && t.id != null ? { id: t.id } : {}),
            languageId: t.languageId,
            timeLimit: t.timeLimit,
            memoryLimit: t.memoryLimit,
            defaultCode: t.defaultCode,
            driverCode: t.driverCode,
          })),
          testCases: testCases.map((tc) => ({
            ...(isEdit && tc.id != null ? { id: tc.id } : {}),
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
          })),
        };
      }

      const res = await fetch(url, {
        method,
        headers: authJsonHeaders,
        body: JSON.stringify(payload),
      });

      if (res.status === 401) return handleUnauthorized();

      if (res.ok) {
        showToast(isEdit ? 'Question updated' : 'Question created', 'success');
        closeFormModal();
        await fetchQuestions();
      } else {
        const textErr = await res.text().catch(() => '');
        console.log('Save question error:', textErr);
        showToast('Save failed (check Network/Console)', 'error');
      }
    } catch (e) {
      console.log(e);
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ===== Delete =====
  const confirmDelete = async () => {
    const q = deleteModal.data;
    if (!q?.id) return;

    setSaving(true);
    try {
      const res = await fetch(`${API}/questions/${q.id}`, {
        method: 'DELETE',
        headers: authHeaderOnly,
      });

      if (res.status === 401) return handleUnauthorized();

      if (res.ok) {
        showToast('Question deleted', 'success');
        closeDelete();
        await fetchQuestions();
      } else {
        const textErr = await res.text().catch(() => '');
        console.log('Delete error:', textErr);
        showToast('Delete failed', 'error');
      }
    } catch (e) {
      console.log(e);
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const levelOptions = ['Junior', 'MidLevel', 'Senior', 'General'];

  if (loading) {
    return (
      <div className="p-20 text-blue-500 font-black text-center animate-pulse tracking-widest uppercase">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-10">
      {toast.show && (
        <div
          className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[999] transition-all border ${
            toast.type === 'success'
              ? 'bg-green-500/10 border-green-500 text-green-500'
              : 'bg-red-500/10 border-red-500 text-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}

      <header className="mb-10 border-b border-gray-900 pb-8">
        <div className="flex justify-between items-end gap-6 flex-wrap">
          <div>
            <h1 className="text-7xl font-black italic text-white uppercase tracking-tighter leading-none">
              Questions
            </h1>
            {skillIdFromUrl && (
              <p className="mt-3 text-gray-400 text-sm">
                Context Skill:{' '}
                <span className="text-white font-bold">{skillNameFromUrl || `#${skillIdFromUrl}`}</span>
              </p>
            )}
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => openAdd('MCQ')}
              className="bg-blue-600 hover:bg-white hover:text-black px-8 py-4 rounded-2xl font-black transition-all text-[11px] uppercase tracking-widest"
            >
              + Add MCQ
            </button>

            <button
              onClick={() => openAdd('Coding')}
              className="bg-purple-600 hover:bg-white hover:text-black px-8 py-4 rounded-2xl font-black transition-all text-[11px] uppercase tracking-widest"
            >
              + Add Coding
            </button>
          </div>
        </div>
      </header>

      {questions.length === 0 ? (
        <div className="bg-[#161b2b] border-2 border-gray-900 rounded-[3rem] p-10 text-gray-300">
          No questions found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {questions.map((q) => {
            const typeLabel = (q?.questionType || q?.type || 'QUESTION').toString();
            const levelLabel = (q?.seniorityLevel || '').toString();

            // best effort to find skillId from question
            const sId =
              (skillIdFromUrl ? Number(skillIdFromUrl) : undefined) ??
              q?.skillId ??
              (Array.isArray(q?.skillIds) ? q.skillIds[0] : undefined) ??
              (Array.isArray(q?.skills) ? q.skills[0]?.id : undefined);

            const sName =
              (skillIdFromUrl ? (skillNameFromUrl || '') : '') ||
              (Array.isArray(q?.skills) && q.skills[0]?.name ? q.skills[0].name : '') ||
              (sId != null ? (skillNameById.get(Number(sId)) || '') : '');

            const tName = sId != null ? (trackNameBySkillId[String(sId)] || '') : '';

            return (
              <div
                key={q.id}
                className="bg-[#161b2b] border-2 border-gray-900 rounded-[3.5rem] p-10 hover:border-blue-600 transition-all group relative overflow-hidden shadow-2xl"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-[9px] px-3 py-2 rounded-xl border font-black uppercase tracking-widest bg-white/5 text-gray-200 border-white/10">
                      {typeLabel}
                    </span>

                    {levelLabel && (
                      <span className="text-[9px] px-3 py-2 rounded-xl border font-black uppercase tracking-widest bg-blue-600/10 text-blue-300 border-blue-500/20">
                        {levelLabel}
                      </span>
                    )}

                    {sName && (
                      <span className="text-[9px] px-3 py-2 rounded-xl border font-black uppercase tracking-widest bg-purple-600/10 text-purple-200 border-purple-500/20">
                        {sName}
                      </span>
                    )}

                    {tName && (
                      <span className="text-[9px] px-3 py-2 rounded-xl border font-black uppercase tracking-widest bg-emerald-600/10 text-emerald-200 border-emerald-500/20">
                        {tName}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0">
                    <button
                      onClick={() => openEdit(q)}
                      className="w-10 h-10 bg-blue-600/20 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white flex items-center justify-center shadow-xl transition-all"
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => openDelete(q)}
                      className="w-10 h-10 bg-red-600/20 text-red-400 rounded-xl hover:bg-red-600 hover:text-white flex items-center justify-center shadow-xl transition-all"
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <h3 className="text-2xl font-black text-white uppercase mb-4 leading-tight">
                  {q.title || 'Untitled'}
                </h3>

                <p className="text-gray-400 text-sm leading-relaxed line-clamp-4">{q.text || ''}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {formModal.show && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl flex items-center justify-center z-[110] p-4">
          <div className="bg-[#161b2b] p-10 rounded-[3rem] border-4 border-gray-900 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-auto">
            <h2 className="text-3xl font-black mb-6 uppercase italic text-white text-center leading-none">
              {formModal.mode === 'edit' ? 'Update' : 'Add'}{' '}
              <span className="text-blue-500">{formModal.type}</span> Question
            </h2>

            <form onSubmit={submitQuestion} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Title"
                  className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                  required
                />

                <select
                  value={form.seniorityLevel}
                  onChange={(e) => setForm((p) => ({ ...p, seniorityLevel: e.target.value }))}
                  className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                  required
                >
                  <option value="" disabled>Select Level...</option>
                  {levelOptions.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={form.text}
                onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))}
                placeholder="Question text..."
                rows={4}
                className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                required
              />

              <select
                value={form.skillId}
                onChange={(e) => setForm((p) => ({ ...p, skillId: e.target.value }))}
                className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                required
                disabled={skillsLoading}
              >
                <option value="" disabled>
                  {skillsLoading ? 'Loading skills...' : 'Select Skill...'}
                </option>
                {skills.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* (MCQ / Coding sections unchanged - keep as in your current file if you want to shorten) */}
              {/* For brevity, we keep the modal fields that you already have from previous version. */}
              {/* NOTE: Your existing MCQ/Coding UI remains the same in this file above. */}

              {/* MCQ */}
              {formModal.type === 'MCQ' && (
                <div className="border border-gray-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black uppercase tracking-widest text-[11px] text-gray-300">OPTIONS</h3>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, options: [...p.options, defaultMcqOption()] }))}
                      className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10"
                    >
                      + OPTION
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.options.map((opt, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <input
                          value={opt.optionText}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((p) => {
                              const copy = [...p.options];
                              copy[idx] = { ...copy[idx], optionText: v };
                              return { ...p, options: copy };
                            });
                          }}
                          placeholder={`Option #${idx + 1}`}
                          className="flex-1 bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                          required
                        />

                        <label className="text-xs text-gray-300 font-black uppercase tracking-widest flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!opt.isCorrect}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setForm((p) => {
                                const copy = [...p.options];
                                copy[idx] = { ...copy[idx], isCorrect: checked };
                                return { ...p, options: copy };
                              });
                            }}
                          />
                          Correct
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            setForm((p) => ({ ...p, options: p.options.filter((_, i) => i !== idx) }))
                          }
                          className="w-10 h-10 bg-red-600/20 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                          title="Remove"
                          disabled={form.options.length <= 2}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Coding */}
              {formModal.type === 'Coding' && (
                <div className="space-y-6">
                  {/* Templates */}
                  <div className="border border-gray-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black uppercase tracking-widest text-[11px] text-gray-300">TEMPLATES</h3>
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, templates: [...p.templates, defaultCodingTemplate()] }))}
                        className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10"
                      >
                        + TEMPLATE
                      </button>
                    </div>

                    {form.templates.map((t, idx) => (
                      <div key={idx} className="border border-gray-900 rounded-2xl p-4 space-y-3 bg-black/10">
                        <div className="flex gap-3 flex-wrap">
                          <input
                            type="number"
                            value={t.languageId}
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm((p) => {
                                const copy = [...p.templates];
                                copy[idx] = { ...copy[idx], languageId: v };
                                return { ...p, templates: copy };
                              });
                            }}
                            placeholder="languageId"
                            className="w-36 bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                          />

                          <input
                            type="number"
                            value={t.timeLimit}
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm((p) => {
                                const copy = [...p.templates];
                                copy[idx] = { ...copy[idx], timeLimit: v };
                                return { ...p, templates: copy };
                              });
                            }}
                            placeholder="timeLimit"
                            className="w-36 bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                          />

                          <input
                            type="number"
                            value={t.memoryLimit}
                            onChange={(e) => {
                              const v = e.target.value;
                              setForm((p) => {
                                const copy = [...p.templates];
                                copy[idx] = { ...copy[idx], memoryLimit: v };
                                return { ...p, templates: copy };
                              });
                            }}
                            placeholder="memoryLimit"
                            className="w-36 bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setForm((p) => ({ ...p, templates: p.templates.filter((_, i) => i !== idx) }))
                            }
                            className="ml-auto w-10 h-10 bg-red-600/20 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                            title="Remove"
                            disabled={form.templates.length <= 1}
                          >
                            ×
                          </button>
                        </div>

                        <textarea
                          value={t.defaultCode}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((p) => {
                              const copy = [...p.templates];
                              copy[idx] = { ...copy[idx], defaultCode: v };
                              return { ...p, templates: copy };
                            });
                          }}
                          placeholder="defaultCode"
                          rows={3}
                          className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                        />

                        <textarea
                          value={t.driverCode}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((p) => {
                              const copy = [...p.templates];
                              copy[idx] = { ...copy[idx], driverCode: v };
                              return { ...p, templates: copy };
                            });
                          }}
                          placeholder="driverCode"
                          rows={3}
                          className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Test Cases */}
                  <div className="border border-gray-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black uppercase tracking-widest text-[11px] text-gray-300">TEST CASES</h3>
                      <button
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, testCases: [...p.testCases, defaultCodingTestCase()] }))}
                        className="bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10"
                      >
                        + TEST CASE
                      </button>
                    </div>

                    {form.testCases.map((tc, idx) => (
                      <div key={idx} className="border border-gray-900 rounded-2xl p-4 space-y-3 bg-black/10">
                        <div className="flex gap-3 items-center">
                          <label className="text-xs text-gray-300 font-black uppercase tracking-widest flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!tc.isHidden}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setForm((p) => {
                                  const copy = [...p.testCases];
                                  copy[idx] = { ...copy[idx], isHidden: checked };
                                  return { ...p, testCases: copy };
                                });
                              }}
                            />
                            Hidden
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              setForm((p) => ({ ...p, testCases: p.testCases.filter((_, i) => i !== idx) }))
                            }
                            className="ml-auto w-10 h-10 bg-red-600/20 text-red-400 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                            title="Remove"
                            disabled={form.testCases.length <= 1}
                          >
                            ×
                          </button>
                        </div>

                        <textarea
                          value={tc.input}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((p) => {
                              const copy = [...p.testCases];
                              copy[idx] = { ...copy[idx], input: v };
                              return { ...p, testCases: copy };
                            });
                          }}
                          placeholder="input"
                          rows={2}
                          className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                        />

                        <textarea
                          value={tc.expectedOutput}
                          onChange={(e) => {
                            const v = e.target.value;
                            setForm((p) => {
                              const copy = [...p.testCases];
                              copy[idx] = { ...copy[idx], expectedOutput: v };
                              return { ...p, testCases: copy };
                            });
                          }}
                          placeholder="expectedOutput"
                          rows={2}
                          className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-6 pt-2">
                <button
                  type="button"
                  onClick={closeFormModal}
                  disabled={saving}
                  className="flex-1 bg-gray-900 py-5 rounded-[2rem] font-black text-gray-500 uppercase text-[10px] disabled:opacity-60"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 py-5 rounded-[2rem] font-black text-white uppercase text-[10px] disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl flex items-center justify-center z-[120] p-4">
          <div className="bg-[#161b2b] p-10 rounded-[3rem] border-4 border-gray-900 w-full max-w-md shadow-2xl">
            <h2 className="text-3xl font-black mb-4 uppercase italic text-white text-center">
              Delete <span className="text-red-500">Question</span>
            </h2>

            <p className="text-gray-300 text-center mb-8">
              Are you sure you want to delete:
              <span className="text-white font-black"> {deleteModal.data?.title || `#${deleteModal.data?.id}`}</span> ?
            </p>

            <div className="flex gap-6">
              <button
                type="button"
                onClick={closeDelete}
                disabled={saving}
                className="flex-1 bg-gray-900 py-5 rounded-[2rem] font-black text-gray-500 uppercase text-[10px] disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={saving}
                className="flex-1 bg-red-600 py-5 rounded-[2rem] font-black text-white uppercase text-[10px] disabled:opacity-60"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}