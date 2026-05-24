import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = 'https://mockmate-001-site1.mtempurl.com';

const Tracks = () => {
  const navigate = useNavigate();

  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editModal, setEditModal] = useState({
    open: false,
    mode: 'add', // add | edit
    track: null,
  });

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    track: null,
  });

  const [trackName, setTrackName] = useState('');
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
  };

  const token = () => localStorage.getItem('token');

  const authHeaderOnly = () => ({
    Authorization: `Bearer ${token()}`,
  });

  const authJsonHeaders = () => ({
    Authorization: `Bearer ${token()}`,
    'Content-Type': 'application/json',
  });

  const handleUnauthorized = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/tracks?PageIndex=1&PageSize=100`, {
        headers: authHeaderOnly(),
      });

      if (res.status === 401) return handleUnauthorized();

      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setTracks(json.data || []);
      } else {
        showToast(json?.message || 'Failed to load tracks', 'error');
      }
    } catch (e) {
      showToast('Network error while loading tracks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setTrackName('');
    setEditModal({ open: true, mode: 'add', track: null });
  };

  const openEdit = (track) => {
    setTrackName(track?.name || '');
    setEditModal({ open: true, mode: 'edit', track });
  };

  const closeEditModal = () => {
    if (saving) return;
    setEditModal({ open: false, mode: 'add', track: null });
    setTrackName('');
  };

  const openDelete = (track) => setDeleteModal({ open: true, track });
  const closeDeleteModal = () => {
    if (saving) return;
    setDeleteModal({ open: false, track: null });
  };

  // Add: POST /api/tracks  (BODY {name})
  // Edit: PUT /api/tracks/{id}?name=...
  const handleSaveTrack = async (e) => {
    e.preventDefault();

    const name = trackName.trim();
    if (name.length < 3) {
      showToast('Track name must be at least 3 characters', 'error');
      return;
    }

    setSaving(true);
    try {
      const isEdit = editModal.mode === 'edit';
      const trackId = editModal.track?.id;

      let res;

      if (isEdit) {
        // PUT with query name
        const url = `${API_BASE}/api/tracks/${trackId}?name=${encodeURIComponent(name)}`;
        res = await fetch(url, {
          method: 'PUT',
          headers: authHeaderOnly(), // no body
        });
      } else {
        // POST with body {name}
        const url = `${API_BASE}/api/tracks`;
        res = await fetch(url, {
          method: 'POST',
          headers: authJsonHeaders(),
          body: JSON.stringify({ name }),
        });
      }

      if (res.status === 401) return handleUnauthorized();

      const text = await res.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { message: text };
      }

      if (res.ok) {
        showToast(isEdit ? 'Track updated' : 'Track created', 'success');
        closeEditModal();
        await fetchTracks();
      } else {
        const msg =
          json?.validationErrors?.Name?.[0] ||
          json?.validationErrors?.name?.[0] ||
          json?.errors?.Name?.[0] ||
          json?.message ||
          'Bad Request';
        showToast(msg, 'error');
      }
    } catch (err) {
      showToast('Network error, please try again', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    const track = deleteModal.track;
    if (!track?.id) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/tracks/${track.id}`, {
        method: 'DELETE',
        headers: authHeaderOnly(),
      });

      if (res.status === 401) return handleUnauthorized();

      if (res.ok) {
        showToast('Track deleted', 'success');
        closeDeleteModal();
        await fetchTracks();
      } else {
        const text = await res.text();
        showToast(text || 'Delete failed', 'error');
      }
    } catch (err) {
      showToast('Network error while deleting', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 text-blue-500 font-black animate-pulse text-center uppercase tracking-widest">
        System Syncing...
      </div>
    );
  }

  return (
    <div className="relative">
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

      <header className="mb-16 flex justify-between items-end border-b border-gray-900 pb-10">
        <h1 className="text-7xl font-black italic text-white uppercase tracking-tighter">
          Tracks
        </h1>

        <button
          onClick={openAdd}
          className="bg-blue-600 hover:bg-white hover:text-black px-12 py-5 rounded-2xl font-black transition-all text-[11px] uppercase tracking-widest"
        >
          + New Track
        </button>
      </header>

      {tracks.length === 0 ? (
        <div className="text-gray-400 text-sm border border-gray-800 rounded-2xl p-8 bg-[#161b2b]">
          No tracks found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="bg-[#161b2b] border-2 border-gray-900 rounded-[3rem] p-10 hover:border-blue-600 transition-all group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-10 h-12">
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0">
                  <button
                    onClick={() => openEdit(track)}
                    className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                    title="Edit"
                  >
                    ✎
                  </button>

                  <button
                    onClick={() => openDelete(track)}
                    className="w-10 h-10 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>

                <div className="bg-[#0b0f1a] text-blue-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-500/10">
                  {track.skillCount || 0} Skills
                </div>
              </div>

              <h3 className="text-3xl font-black text-white uppercase tracking-tight mb-10 group-hover:text-blue-500 transition-colors leading-none">
                {track.name}
              </h3>

              <button
                onClick={() =>
                  navigate(
                    `/skills?trackId=${track.id}&trackName=${encodeURIComponent(track.name)}`
                  )
                }
                className="w-full py-5 bg-[#0b0f1a] border-2 border-gray-800 text-white rounded-[1.8rem] hover:bg-white hover:text-black transition-all font-black text-[10px] tracking-widest uppercase shadow-xl"
              >
                Explore
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {editModal.open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeEditModal} />
          <div className="relative w-full max-w-lg bg-[#161b2b] border border-gray-800 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-black mb-2">
              {editModal.mode === 'edit' ? 'Edit Track' : 'Add New Track'}
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              {editModal.mode === 'edit'
                ? 'Update track name then save.'
                : 'Write track name then create.'}
            </p>

            <form onSubmit={handleSaveTrack} className="space-y-4">
              <input
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                placeholder="Track Name"
                className="w-full bg-[#0b0f1a] border border-gray-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
              />

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={saving}
                  className="px-5 py-3 rounded-xl border border-gray-700 text-gray-200 hover:bg-white/5 transition-all disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all font-bold disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={closeDeleteModal} />
          <div className="relative w-full max-w-md bg-[#161b2b] border border-gray-800 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-black mb-2">Confirm Delete</h3>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to delete:
              <span className="text-white font-bold"> {deleteModal.track?.name}</span>؟
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={saving}
                className="px-5 py-3 rounded-xl border border-gray-700 text-gray-200 hover:bg-white/5 transition-all disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 transition-all font-bold disabled:opacity-60"
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

export default Tracks;