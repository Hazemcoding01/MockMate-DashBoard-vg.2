import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE = '';

export default function Interviews() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);

  const [details, setDetails] = useState({
    show: false,
    loading: false,
    id: null,
    data: null,
  });

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const toastMsg = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 2500);
  };

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
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

  const getSessionId = (s) => s?.interviewSessionId ?? s?.id ?? s?.sessionId;

  const parseFeedbackObj = (feedback) => {
    if (!feedback) return null;
    if (typeof feedback !== 'string') return feedback;
    try {
      return JSON.parse(feedback);
    } catch {
      return { overallSummary: feedback };
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      // تعديل الحروف لتطابق السويجر بالظبط (pageIndex و pageSize)
      const url = `${BASE}/api/users/me/interview-sessions?pageIndex=1&pageSize=50`;
      const res = await fetch(url, { headers });
      if (res.status === 401) return handleUnauthorized();

      const text = await res.text().catch(() => '');
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }

      if (!res.ok) {
        console.log('GET sessions failed:', res.status, text);
        toastMsg(`Failed to load sessions (${res.status})`, 'error');
        setSessions([]);
        return;
      }

      setSessions(extractList(json));
    } catch (e) {
      console.log(e);
      toastMsg('Network error while loading sessions', 'error');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetails = async (sessionId) => {
    setDetails({ show: true, loading: true, id: sessionId, data: null });

    try {
      const res = await fetch(`${BASE}/api/interview-sessions/${sessionId}`, { headers });
      if (res.status === 401) return handleUnauthorized();

      const text = await res.text().catch(() => '');
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text };
      }

      if (!res.ok) {
        console.log('GET details failed:', res.status, json);
        toastMsg(`Failed to load details (${res.status})`, 'error');
        setDetails({ show: true, loading: false, id: sessionId, data: json });
        return;
      }

      setDetails({ show: true, loading: false, id: sessionId, data: json?.data ?? json });
    } catch (e) {
      console.log(e);
      toastMsg('Network error while loading details', 'error');
      setDetails({ show: true, loading: false, id: sessionId, data: null });
    }
  };

  const closeDetails = () => setDetails({ show: false, loading: false, id: null, data: null });

  if (loading) {
    return (
      <div className="p-20 text-blue-500 font-black text-center animate-pulse tracking-widest uppercase">
        Loading sessions...
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

      <header className="mb-10 border-b border-gray-900 pb-8">
        <div className="flex justify-between items-end gap-6 flex-wrap">
          <h1 className="text-7xl font-black italic text-white uppercase tracking-tighter leading-none">
            Interviews
          </h1>

          <div className="flex gap-3 flex-wrap">
            <button
              className="px-6 py-4 rounded-2xl font-black transition-all text-[11px] uppercase tracking-widest border bg-blue-600 border-blue-600 text-white"
              disabled
              title="All sessions"
            >
              All Sessions
            </button>

            <button
              onClick={fetchSessions}
              className="px-6 py-4 rounded-2xl font-black transition-all text-[11px] uppercase tracking-widest border bg-white/5 border-white/10 text-gray-200 hover:bg-white/10"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {sessions.length === 0 ? (
        <div className="bg-[#161b2b] border-2 border-gray-900 rounded-[3rem] p-10 text-gray-300">
          No interview sessions found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {sessions.map((s, idx) => {
            const id = getSessionId(s) ?? idx;
            const fbObj = parseFeedbackObj(s?.feedback);

            return (
              <div
                key={id}
                className="bg-[#161b2b] border-2 border-gray-900 rounded-[3.5rem] p-10 hover:border-blue-600 transition-all shadow-2xl"
              >
                <div className="flex items-start justify-between gap-3 mb-6">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[9px] px-3 py-2 rounded-xl border font-black uppercase tracking-widest bg-white/5 text-gray-200 border-white/10">
                      ID: {id}
                    </span>

                    {s?.trackName && (
                      <span className="text-[9px] px-3 py-2 rounded-xl border font-black uppercase tracking-widest bg-blue-600/10 text-blue-300 border-blue-500/20">
                        {s.trackName}
                      </span>
                    )}

                    {s?.seniorityLevel && (
                      <span className="text-[9px] px-3 py-2 rounded-xl border font-black uppercase tracking-widest bg-purple-600/10 text-purple-200 border-purple-500/20">
                        {s.seniorityLevel}
                      </span>
                    )}

                    {s?.interviewType && (
                      <span className="text-[9px] px-3 py-2 rounded-xl border font-black uppercase tracking-widest bg-white/5 text-gray-200 border-white/10">
                        {s.interviewType}
                      </span>
                    )}
                  </div>

                  {getSessionId(s) && (
                    <button
                      onClick={() => openDetails(getSessionId(s))}
                      className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                    >
                      View
                    </button>
                  )}
                </div>

                <div className="text-sm text-gray-300 space-y-2">
                  <div>
                    <span className="text-gray-500">User:</span>{' '}
                    <span className="font-bold text-white">{s?.userName ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Score:</span>{' '}
                    <span className="font-bold text-white">{s?.score ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Start:</span>{' '}
                    <span className="font-bold text-white">{s?.startDate ?? '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">End:</span>{' '}
                    <span className="font-bold text-white">{s?.endDate ?? '—'}</span>
                  </div>
                </div>

                {fbObj?.overallSummary && (
                  <div className="mt-6 text-xs text-gray-400 bg-black/10 border border-gray-900 rounded-2xl p-4 max-h-28 overflow-auto whitespace-pre-wrap">
                    {fbObj.overallSummary}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
      {details.show && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl flex items-center justify-center z-[120] p-4">
          <div className="bg-[#161b2b] p-10 rounded-[3rem] border-4 border-gray-900 w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-white">Session Details #{details.id}</h2>
              <button
                onClick={closeDetails}
                className="px-5 py-3 rounded-xl border border-gray-700 text-gray-200 hover:bg-white/5 transition-all"
              >
                Close
              </button>
            </div>

            {details.loading ? (
              <div className="p-10 text-blue-500 font-black animate-pulse uppercase tracking-widest text-center">
                Loading...
              </div>
            ) : (
              <>
                {/* Feedback pretty view */}
                {details.data?.feedback && (() => {
                  const fb = parseFeedbackObj(details.data.feedback);
                  if (!fb) return null;

                  return (
                    <div className="mb-6 bg-black/10 border border-gray-900 rounded-2xl p-6">
                      <h3 className="font-black mb-3">Feedback</h3>

                      {fb?.overallSummary && (
                        <p className="text-gray-200 text-sm whitespace-pre-wrap">{fb.overallSummary}</p>
                      )}

                      {Array.isArray(fb?.strengths) && fb.strengths.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">
                            Strengths
                          </div>
                          <ul className="list-disc pl-5 text-sm text-gray-200 space-y-1">
                            {fb.strengths.map((x, i) => <li key={i}>{x}</li>)}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(fb?.weaknesses) && fb.weaknesses.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">
                            Weaknesses
                          </div>
                          <ul className="list-disc pl-5 text-sm text-gray-200 space-y-1">
                            {fb.weaknesses.map((x, i) => <li key={i}>{x}</li>)}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(fb?.detailedFeedback) && fb.detailedFeedback.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs text-gray-400 font-black uppercase tracking-widest mb-2">
                            Detailed Feedback
                          </div>
                          <div className="space-y-3">
                            {fb.detailedFeedback.map((d, i) => (
                              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <div className="font-bold text-white text-sm">{d.questionTitle}</div>
                                <div className="text-gray-200 text-sm mt-2 whitespace-pre-wrap">{d.feedback}</div>
                                {d.suggestion && (
                                  <div className="text-gray-400 text-xs mt-2 whitespace-pre-wrap">
                                    Suggestion: {d.suggestion}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Raw JSON */}
                <details className="bg-black/10 border border-gray-900 rounded-2xl p-6">
                  <summary className="cursor-pointer font-black text-sm text-gray-200">
                    Show raw JSON
                  </summary>
                  <pre className="mt-4 text-[12px] text-gray-200 whitespace-pre-wrap break-words">
                    {JSON.stringify(details.data, null, 2)}
                  </pre>
                </details>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}