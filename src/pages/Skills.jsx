import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// تم إزالة الرابط المباشر والاعتماد على مسار البروكسي لتجنب الـ CORS
const API_BASE = ''; 

const Skills = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  // URL context (لو جاي من Tracks Explore)
  const query = new URLSearchParams(location.search);
  const urlTrackId = query.get('trackId') || '';
  const urlTrackName = query.get('trackName') || '';

  // Data
  const [skills, setSkills] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [tracksMap, setTracksMap] = useState({});

  // Filters
  const [trackFilterId, setTrackFilterId] = useState(urlTrackId); // يبدأ من URL لو موجود
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modals / Form
  const [modal, setModal] = useState({ show: false, type: '', data: null }); // add | edit
  const [deleteModal, setDeleteModal] = useState({ show: false, data: null });
  const [skillName, setSkillName] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState('');

  // UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
  };

  const handleUnauthorized = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // لو الـ URL trackId اتغير (لو حد فتح لينك مباشرة)
  useEffect(() => {
    setTrackFilterId(urlTrackId || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTrackId]);

  const authOnly = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const fetchTracks = async () => {
    // تعديل المسار ليعبر من خلال البروكسي
    const res = await fetch(`/api/tracks?PageIndex=1&PageSize=100`, {
      headers: authOnly,
    });

    if (res.status === 401) return handleUnauthorized();

    const json = await res.json().catch(() => ({}));
    const list = json?.data || [];

    const map = {};
    list.forEach((t) => (map[String(t.id)] = t.name));

    setTracks(list);
    setTracksMap(map);
  };

  const fetchSkills = async () => {
    // تعديل المسار ليعبر من خلال البروكسي
    let url = `/api/skills?PageIndex=1&PageSize=100`;

    if (trackFilterId) url += `&TrackId=${trackFilterId}`;
    if (debouncedSearch) url += `&SkillName=${encodeURIComponent(debouncedSearch)}`;

    const res = await fetch(url, { headers: authOnly });

    if (res.status === 401) return handleUnauthorized();

    const json = await res.json().catch(() => ({}));
    setSkills(json?.data || []);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await fetchTracks();
      await fetchSkills();
    } catch (e) {
      console.error(e);
      showToast('Failed to load skills', 'error');
    } finally {
      setLoading(false);
    }
  };

  // تحميل أول مرة
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // أي تغيير في trackFilterId أو search يعمل fetch للـ skills
  useEffect(() => {
    if (!token) return;
    fetchSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackFilterId, debouncedSearch]);

  const trackFilterName = trackFilterId ? tracksMap[String(trackFilterId)] : '';

  // CRUD
  const openAdd = () => {
    setSkillName('');
    setSelectedTrackId(trackFilterId || '');
    setModal({ show: true, type: 'add', data: null });
  };

  const openEdit = (skill) => {
    setSkillName(skill?.name || '');

    if (trackFilterId) {
      setSelectedTrackId(String(trackFilterId));
    } else if (Array.isArray(skill?.trackIds) && skill.trackIds.length) {
      setSelectedTrackId(String(skill.trackIds[0]));
    } else if (skill?.trackId != null) {
      setSelectedTrackId(String(skill.trackId));
    } else {
      setSelectedTrackId('');
    }

    setModal({ show: true, type: 'edit', data: skill });
  };

  const closeModal = () => {
    if (saving) return;
    setModal({ show: false, type: '', data: null });
    setSkillName('');
    setSelectedTrackId(trackFilterId || '');
  };

  const openDelete = (skill) => setDeleteModal({ show: true, data: skill });
  const closeDelete = () => {
    if (saving) return;
    setDeleteModal({ show: false, data: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isEdit = modal.type === 'edit';
    const name = skillName.trim();
    if (!name) return;

    const trackIdToUse = Number(trackFilterId || selectedTrackId);
    if (!trackIdToUse) {
      showToast('Select Track first', 'error');
      return;
    }

    const payload = { name, trackIds: [trackIdToUse] };

    setSaving(true);
    try {
      // تعديل المسارات للـ PUT والـ POST لتمر عبر البروكسي
      const url = isEdit
        ? `/api/skills/${modal.data.id}`
        : `/api/skills`;

      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) return handleUnauthorized();

      if (res.ok) {
        showToast(isEdit ? 'Skill updated' : 'Skill created', 'success');
        closeModal();
        await fetchSkills();
      } else {
        const text = await res.text();
        console.log('Save skill error:', text);
        showToast('Save failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    const skill = deleteModal.data;
    if (!skill?.id) return;

    setSaving(true);
    try {
      // تعديل المسار للـ DELETE ليمر عبر البروكسي
      const res = await fetch(`/api/skills/${skill.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) return handleUnauthorized();

      if (res.ok) {
        showToast('Skill deleted', 'success');
        closeDelete();
        await fetchSkills();
      } else {
        const text = await res.text();
        console.log('Delete skill error:', text);
        showToast('Delete failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const goToQuestions = (skill) => {
    const params = new URLSearchParams();
    params.set('skillId', String(skill.id));
    params.set('skillName', skill.name || '');

    if (trackFilterId) {
      params.set('trackId', String(trackFilterId));
      if (trackFilterName) params.set('trackName', String(trackFilterName));
    } else if (urlTrackId) {
      params.set('trackId', String(urlTrackId));
      if (urlTrackName) params.set('trackName', String(urlTrackName));
    }

    navigate(`/questions?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="p-20 text-blue-500 font-black text-center animate-pulse tracking-widest uppercase">
        Restoring Unit...
      </div>
    );
  }

  return (
    <div className="p-10">
      {/* Toast */}
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

      {/* Header */}
      <header className="mb-10 border-b border-gray-900 pb-8">
        <div className="flex flex-col gap-6">
          {/* Top row */}
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div>
              <h1 className="text-7xl font-black italic text-white uppercase tracking-tighter leading-none">
                Skills
              </h1>

              {trackFilterName && (
                <p className="mt-3 text-gray-400 text-sm">
                  Filter Track: <span className="text-white font-bold">{trackFilterName}</span>
                </p>
              )}
            </div>

            <button
              onClick={openAdd}
              className="bg-blue-600 hover:bg-white hover:text-black px-10 py-4 rounded-2xl font-black transition-all text-[11px] uppercase tracking-widest"
            >
              + Add Skill
            </button>
          </div>

          {/* Center row: Track filter + Search */}
          <div className="flex justify-center">
            <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4 items-center">
              {/* Track dropdown */}
              <select
                value={trackFilterId}
                onChange={(e) => setTrackFilterId(e.target.value)}
                className="w-full bg-[#0b0f1a] border border-gray-700 rounded-[2rem] px-5 py-4 outline-none focus:border-blue-500 transition-all text-sm"
              >
                <option value="">All Tracks</option>
                {tracks.map((t) => (
                  <option key={t.id} value={String(t.id)}>
                    {t.name}
                  </option>
                ))}
              </select>

              {/* Search input */}
              <div className="relative w-full">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search skills..."
                  className="w-full bg-[#0b0f1a] border border-gray-700 rounded-[2rem] px-6 py-4 pr-14 outline-none focus:border-blue-500 transition-all text-sm"
                />

                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0a7 7 0 0 1 14 0Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-12 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
                    title="Clear"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* List */}
      {skills.length === 0 ? (
        <div className="bg-[#161b2b] border-2 border-gray-900 rounded-[3rem] p-10 text-gray-300">
          No skills found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="bg-[#161b2b] border-2 border-gray-900 rounded-[3.5rem] p-10 hover:border-blue-600 transition-all group relative overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-start mb-8 h-10">
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0">
                  <button
                    onClick={() => openEdit(skill)}
                    className="w-10 h-10 bg-blue-600/20 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white flex items-center justify-center shadow-xl transition-all"
                    title="Edit"
                  >
                    ✎
                  </button>

                  <button
                    onClick={() => openDelete(skill)}
                    className="w-10 h-10 bg-red-600/20 text-red-400 rounded-xl hover:bg-red-600 hover:text-white flex items-center justify-center shadow-xl transition-all"
                    title="Delete"
                  >
                    🗑
                  </button>

                  <button
                    onClick={() => goToQuestions(skill)}
                    className="w-10 h-10 bg-purple-600/20 text-purple-300 rounded-xl hover:bg-purple-600 hover:text-white flex items-center justify-center shadow-xl transition-all"
                    title="Questions"
                  >
                    ?
                  </button>
                </div>
              </div>

              <h3 className="text-3xl font-black text-white uppercase mb-6 leading-none">
                {skill.name}
              </h3>

              <button
                onClick={() => goToQuestions(skill)}
                className="w-full py-5 bg-[#0b0f1a] border-2 border-gray-800 text-white rounded-[1.8rem] hover:bg-white hover:text-black transition-all font-black text-[10px] tracking-widest uppercase shadow-xl"
              >
                Explore Questions
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal.show && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl flex items-center justify-center z-[110] p-4">
          <div className="bg-[#161b2b] p-12 rounded-[3rem] border-4 border-gray-900 w-full max-w-md shadow-2xl">
            <h2 className="text-4xl font-black mb-10 uppercase italic text-white text-center leading-none">
              {modal.type === 'edit' ? 'Update' : 'Add'} <span className="text-blue-500">Skill</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-8">
              <input
                type="text"
                placeholder="Skill Name..."
                required
                className="w-full bg-[#0b0f1a] border-4 border-gray-900 rounded-[2.5rem] px-10 py-7 text-white outline-none focus:border-blue-600 transition-all font-black text-xl text-center"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
              />

              {!trackFilterId && (
                <select
                  value={selectedTrackId}
                  onChange={(e) => setSelectedTrackId(e.target.value)}
                  className="w-full bg-[#0b0f1a] border-4 border-gray-900 rounded-[2.5rem] px-8 py-6 text-white outline-none focus:border-blue-600 transition-all font-black text-sm"
                  required
                >
                  <option value="" disabled>
                    Select Track...
                  </option>
                  {tracks.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex gap-6 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex-1 bg-gray-900 py-6 rounded-[2rem] font-black text-gray-500 uppercase text-[10px] disabled:opacity-60"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 py-6 rounded-[2rem] font-black text-white uppercase text-[10px] disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl flex items-center justify-center z-[120] p-4">
          <div className="bg-[#161b2b] p-10 rounded-[3rem] border-4 border-gray-900 w-full max-w-md shadow-2xl">
            <h2 className="text-3xl font-black mb-4 uppercase italic text-white text-center">
              Delete <span className="text-red-500">Skill</span>
            </h2>

            <p className="text-gray-300 text-center mb-8">
              Are you sure you want to delete:
              <span className="text-white font-black"> {deleteModal.data?.name}</span> ?
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
                onClick={handleConfirmDelete}
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
};

export default Skills;