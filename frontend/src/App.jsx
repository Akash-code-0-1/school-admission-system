import React, { useState, useEffect } from 'react';
import { apiRequest } from './api';
import { 
  GraduationCap, User, PlusCircle, Clock, CheckCircle2, 
  AlertCircle, RefreshCw, CreditCard, XCircle, Users, Check,
  Sparkles, Calendar, BookOpen
} from 'lucide-react';

export default function App() {
  const [studentId, setStudentId] = useState(() => localStorage.getItem('school_student_id') || '');
  const [classes, setClasses] = useState([]);
  const [myHolds, setMyHolds] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [newTotalSeats, setNewTotalSeats] = useState('');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('classes'); // 'classes' | 'myHolds' | 'createClass'
  const [lastSynced, setLastSynced] = useState(null);

  // Student ID formatting & validation
  const handleStudentIdChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 17);
    setStudentId(val);
    localStorage.setItem('school_student_id', val);
  };

  const showToast = (text, type = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 5000);
  };

  // 1. Fetch Class List (Auto Polling every 3s without page reload - §2.5 Rule 10)
  const loadClasses = async () => {
    try {
      const data = await apiRequest('/classes');
      if (Array.isArray(data)) {
        setClasses(data);
        setLastSynced(new Date());
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 2. Fetch My Applications
  const loadMyHolds = async () => {
    if (studentId.length !== 17) return;
    try {
      const data = await apiRequest('/me/holds', 'GET', null, studentId);
      if (Array.isArray(data)) setMyHolds(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadClasses();
    const interval = setInterval(loadClasses, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (studentId.length === 17) {
      loadMyHolds();
    } else {
      setMyHolds([]);
    }
  }, [studentId]);

  // Create Class (Admin)
  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim() || !newTotalSeats || parseInt(newTotalSeats) <= 0) {
      showToast('ক্লাসের সঠিক নাম এবং আসন সংখ্যা (কমপক্ষে ১) দিন।', 'error');
      return;
    }

    try {
      setLoading(true);
      await apiRequest('/classes', 'POST', {
        name: newClassName.trim(),
        totalSeats: parseInt(newTotalSeats)
      });
      showToast('নতুন ক্লাস ও শিফট সফলভাবে তৈরি হয়েছে!', 'success');
      setNewClassName('');
      setNewTotalSeats('');
      setActiveTab('classes');
      loadClasses();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Apply (Hold Seat)
  const handleApply = async (classId) => {
    if (studentId.length !== 17) {
      showToast('আবেদন করতে প্রথমে উপরে ১৭ সংখ্যার জন্ম নিবন্ধন নম্বর দিন!', 'error');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setLoading(true);
      await apiRequest(`/classes/${classId}/holds`, 'POST', null, studentId);
      showToast('সিট সফলভাবে রিজার্ভ হয়েছে! নির্ধারিত সময়ের মধ্যে ফি প্রদান করুন।', 'success');
      await Promise.all([loadClasses(), loadMyHolds()]);
      setActiveTab('myHolds');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Confirm Admission Fee
  const handleConfirm = async (holdId) => {
    try {
      setLoading(true);
      await apiRequest(`/holds/${holdId}/confirm`, 'POST', null, studentId);
      showToast('ভর্তি ফি সফলভাবে জমা হয়েছে এবং ভর্তি নিশ্চিত হয়েছে!', 'success');
      await Promise.all([loadClasses(), loadMyHolds()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel Hold
  const handleCancel = async (holdId) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে আবেদনটি বাতিল করতে চান? আসনটি তাৎক্ষণিক উন্মুক্ত হয়ে যাবে।')) return;
    try {
      setLoading(true);
      await apiRequest(`/holds/${holdId}`, 'DELETE', null, studentId);
      showToast('আবেদন বাতিল করা হয়েছে। সিটটি উন্মুক্ত করা হয়েছে।', 'info');
      await Promise.all([loadClasses(), loadMyHolds()]);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col antialiased">
      {/* Floating Modern Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`p-4 rounded-xl shadow-xl flex items-center justify-between border backdrop-blur-md ${
            toast.type === 'error' ? 'bg-red-50/95 border-red-200 text-red-900' :
            toast.type === 'success' ? 'bg-emerald-50/95 border-emerald-200 text-emerald-900' :
            'bg-blue-50/95 border-blue-200 text-blue-900'
          }`}>
            <div className="flex items-center space-x-3">
              {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" /> :
               toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> :
               <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0" />}
              <span className="text-sm font-medium leading-relaxed">{toast.text}</span>
            </div>
            <button onClick={() => setToast(null)} className="ml-3 text-slate-400 hover:text-slate-700 font-bold p-1">✕</button>
          </div>
        </div>
      )}

      {/* Main Top Header */}
      <header className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600/30 p-2.5 rounded-xl border border-blue-400/20 backdrop-blur-sm">
              <GraduationCap className="w-7 h-7 text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">অনলাইন স্কুল ভর্তি পোর্টাল</h1>
              <p className="text-xs text-blue-200 flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                আগে আবেদন করলে আগে পাবেন ভিত্তিতে ভর্তি
              </p>
            </div>
          </div>

          {/* Student Identity Box (§1.3) */}
          <div className="w-full md:w-auto bg-white/10 hover:bg-white/15 transition rounded-2xl p-3 border border-white/15 backdrop-blur-md shadow-inner flex items-center gap-3">
            <div className={`p-2 rounded-xl transition ${studentId.length === 17 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'}`}>
              <User className="w-5 h-5 flex-shrink-0" />
            </div>
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-medium text-blue-200">শিক্ষার্থীর ১৭ ডিজিটের জন্ম নিবন্ধন নম্বর</label>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                  studentId.length === 17 ? 'bg-emerald-500 text-white' : 'bg-blue-800 text-blue-300'
                }`}>
                  {studentId.length}/১৭
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="text"
                  placeholder="যেমন: 20152691234567890"
                  value={studentId}
                  onChange={handleStudentIdChange}
                  className="bg-transparent text-white font-mono text-sm tracking-wider focus:outline-none placeholder-blue-300/60 w-44"
                />
                {studentId.length === 17 && (
                  <span className="flex items-center gap-0.5 text-xs text-emerald-300 font-medium">
                    <Check className="w-3.5 h-3.5" /> সংরক্ষিত
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {/* Modern Tab Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 mb-8 gap-4">
          <div className="flex items-center bg-slate-200/60 p-1.5 rounded-2xl space-x-1 shadow-inner">
            <button
              onClick={() => setActiveTab('classes')}
              className={`flex items-center gap-2 py-2.5 px-5 font-semibold text-sm rounded-xl transition duration-200 ${
                activeTab === 'classes'
                  ? 'bg-white text-blue-900 shadow-md scale-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              ক্লাস তালিকা ও সিট অবস্থা
            </button>
            <button
              onClick={() => setActiveTab('myHolds')}
              className={`flex items-center gap-2 py-2.5 px-5 font-semibold text-sm rounded-xl transition duration-200 ${
                activeTab === 'myHolds'
                  ? 'bg-white text-blue-900 shadow-md scale-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
              }`}
            >
              <Clock className="w-4 h-4" />
              আমার আবেদনসমূহ 
              <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'myHolds' ? 'bg-blue-100 text-blue-800' : 'bg-slate-300 text-slate-700'
              }`}>
                {myHolds.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('createClass')}
              className={`flex items-center gap-2 py-2.5 px-5 font-semibold text-sm rounded-xl transition duration-200 ${
                activeTab === 'createClass'
                  ? 'bg-white text-blue-900 shadow-md scale-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-indigo-600" />
              নতুন ক্লাস তৈরি (Admin)
            </button>
          </div>

          {/* Real-time Indicator */}
          {lastSynced && (
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-white px-3.5 py-1.5 rounded-full border border-slate-200 shadow-sm">
              <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
              <span>প্রতি ৩ সেকেন্ডে অটো আপডেট হচ্ছে</span>
            </div>
          )}
        </div>

        {/* ==================== TAB 1: CLASS LIST ==================== */}
        {activeTab === 'classes' && (
          <div>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">সকল ক্লাস ও শিফটের সিট বিবরণী</h2>
                <p className="text-xs text-slate-500 mt-1">পছন্দের ক্লাসে আসন খালি থাকা সাপেক্ষে দ্রুত আবেদন সম্পন্ন করুন</p>
              </div>
            </div>

            {classes.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-2">কোনো ক্লাস পাওয়া যায়নি</h3>
                <p className="text-sm text-slate-500 mb-6">কোনো ক্লাস এখনো তৈরি করা হয়নি। "নতুন ক্লাস তৈরি (Admin)" ট্যাব থেকে ক্লাস যুক্ত করুন।</p>
                <button
                  onClick={() => setActiveTab('createClass')}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition"
                >
                  প্রথম ক্লাস তৈরি করুন
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map((cls) => {
                  const bookedPercentage = Math.min(100, Math.round(((cls.totalSeats - cls.availableSeats) / cls.totalSeats) * 100));
                  const isFull = cls.availableSeats <= 0;

                  return (
                    <div
                      key={cls.id}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 p-6 flex flex-col justify-between group"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div>
                            <span className="text-[11px] font-mono text-slate-400 block mb-0.5">আইডি: {cls.id}</span>
                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition">
                              {cls.name}
                            </h3>
                          </div>
                          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                            isFull 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {isFull ? 'সিট পূর্ণ' : 'ভর্তি চলছে'}
                          </span>
                        </div>

                        {/* Capacity Progress Bar */}
                        <div className="mb-5">
                          <div className="flex justify-between text-xs mb-1.5 font-medium text-slate-600">
                            <span>বুকিং প্রগ্রেস</span>
                            <span className="font-bold font-mono">{bookedPercentage}% পূর্ণ</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                bookedPercentage >= 100 ? 'bg-rose-500' :
                                bookedPercentage >= 75 ? 'bg-amber-500' :
                                'bg-blue-600'
                              }`}
                              style={{ width: `${bookedPercentage}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Seat Metrics Grid */}
                        <div className="grid grid-cols-2 gap-2.5 text-xs mb-6">
                          <div className="bg-slate-50 border border-slate-150 p-2.5 rounded-xl">
                            <span className="text-slate-500 text-[11px] block">মোট সিট</span>
                            <span className="font-extrabold text-slate-900 text-base font-mono">{cls.totalSeats}</span>
                          </div>
                          <div className="bg-emerald-50/70 border border-emerald-100 p-2.5 rounded-xl">
                            <span className="text-emerald-700 text-[11px] block">খালি সিট</span>
                            <span className="font-extrabold text-emerald-800 text-base font-mono">{cls.availableSeats}</span>
                          </div>
                          <div className="bg-amber-50/70 border border-amber-100 p-2.5 rounded-xl">
                            <span className="text-amber-700 text-[11px] block">হোল্ডে আছে</span>
                            <span className="font-extrabold text-amber-800 text-base font-mono">{cls.heldSeats}</span>
                          </div>
                          <div className="bg-blue-50/70 border border-blue-100 p-2.5 rounded-xl">
                            <span className="text-blue-700 text-[11px] block">নিশ্চিত ভর্তি</span>
                            <span className="font-extrabold text-blue-900 text-base font-mono">{cls.confirmedSeats}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => handleApply(cls.id)}
                        disabled={isFull || loading}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                          !isFull
                            ? 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-blue-500/20'
                            : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        }`}
                      >
                        {!isFull ? (
                          <>
                            <span>আবেদন করুন (Hold Seat)</span>
                          </>
                        ) : (
                          <span>সিট শেষ (খালি নেই)</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: MY APPLICATIONS ==================== */}
        {activeTab === 'myHolds' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">আমার আবেদনসমূহ</h2>
              <p className="text-xs text-slate-500 mt-1">শিক্ষার্থীর আবেদনের রিয়েল-টাইম স্ট্যাটাস এবং ভর্তি ফি জমাদান</p>
            </div>

            {studentId.length !== 17 ? (
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-6 text-amber-900 max-w-xl mx-auto flex items-start gap-4 shadow-sm">
                <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm mb-1">জন্ম নিবন্ধন নম্বর প্রদান করুন</h4>
                  <p className="text-xs leading-relaxed text-amber-800">
                    আপনার সংরক্ষিত আবেদন দেখতে এবং ফি প্রদান করতে উপরে প্রদর্শিত বক্সে আপনার ১৭ সংখ্যার জন্ম নিবন্ধন নম্বরটি ইনপুট করুন।
                  </p>
                </div>
              </div>
            ) : myHolds.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto">
                <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">কোনো আবেদন পাওয়া যায়নি</h3>
                <p className="text-sm text-slate-500 mb-6 font-mono text-xs">শিক্ষার্থী আইডি: {studentId}</p>
                <button
                  onClick={() => setActiveTab('classes')}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 transition"
                >
                  ক্লাস তালিকা থেকে আবেদন করুন
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-w-3xl mx-auto">
                {myHolds.map((hold) => (
                  <HoldCard
                    key={hold.holdId}
                    hold={hold}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    loading={loading}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: ADMIN CREATE CLASS ==================== */}
        {activeTab === 'createClass' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-150">
                <div className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">নতুন ক্লাস এবং শিফট যুক্ত করুন</h2>
                  <p className="text-xs text-slate-500">স্কুল এডমিন প্যানেল থেকে নতুন শিফট ও আসন সংখ্যা নির্ধারণ করুন</p>
                </div>
              </div>

              <form onSubmit={handleCreateClass} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    ক্লাসের নাম ও শিফট
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: Class 6 - Morning Shift"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    মোট আসন সংখ্যা (Total Seats)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="যেমন: 120"
                    value={newTotalSeats}
                    onChange={(e) => setNewTotalSeats(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-none transition"
                    required
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm transition shadow-md shadow-blue-500/20 active:scale-[0.99]"
                  >
                    {loading ? 'সংরক্ষণ করা হচ্ছে...' : 'ক্লাস সংরক্ষণ করুন'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Sub-Component: Application Card with Dynamic Expiry Countdown Timer
function HoldCard({ hold, onConfirm, onCancel, loading }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const expires = new Date(hold.expiresAt).getTime();
    return Math.max(0, Math.floor((expires - Date.now()) / 1000));
  });

  const [currentStatus, setCurrentStatus] = useState(hold.status);

  useEffect(() => {
    if (currentStatus !== 'HELD') return;

    const interval = setInterval(() => {
      const expires = new Date(hold.expiresAt).getTime();
      const seconds = Math.max(0, Math.floor((expires - Date.now()) / 1000));
      setTimeLeft(seconds);

      // Auto expire without page reload (§2.5 Rule 9)
      if (seconds <= 0) {
        setCurrentStatus('EXPIRED');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hold.expiresAt, currentStatus]);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isHoldActive = currentStatus === 'HELD' && timeLeft > 0;
  const isUrgent = isHoldActive && timeLeft <= 120; // less than 2 mins

  return (
    <div className={`bg-white border rounded-2xl p-6 shadow-sm transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 ${
      isUrgent ? 'border-amber-300 bg-amber-50/20 shadow-amber-500/5' : 'border-slate-200'
    }`}>
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <h3 className="font-extrabold text-slate-900 text-base">{hold.className}</h3>
          
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
            currentStatus === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            currentStatus === 'HELD' && isHoldActive ? 'bg-amber-50 text-amber-700 border-amber-200' :
            currentStatus === 'CANCELLED' ? 'bg-slate-100 text-slate-600 border-slate-200' :
            'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {currentStatus === 'CONFIRMED' ? 'ভর্তি নিশ্চিত (Confirmed)' :
             currentStatus === 'HELD' && isHoldActive ? 'আসন সংরক্ষিত (ফি বাকি)' :
             currentStatus === 'CANCELLED' ? 'আবেদন বাতিল (Cancelled)' :
             'মেয়াদ শেষ (Expired)'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-1">
          <span>আবেদন আইডি: {hold.holdId}</span>
        </div>

        {/* Live Countdown Clock */}
        {isHoldActive && (
          <div className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border mt-3 ${
            isUrgent ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}>
            <Clock className={`w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-slate-500'}`} />
            <span>ফি জমা দেওয়ার বাকি:</span>
            <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded-lg border border-slate-200">
              {formatTimer(timeLeft)}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 w-full md:w-auto">
        {isHoldActive ? (
          <>
            <button
              onClick={() => onConfirm(hold.holdId)}
              disabled={loading}
              className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>ভর্তি ফি দিন</span>
            </button>
            <button
              onClick={() => onCancel(hold.holdId)}
              disabled={loading}
              className="flex-1 md:flex-none bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              বাতিল
            </button>
          </>
        ) : (
          <div className="w-full md:w-auto text-center px-4 py-2.5 rounded-xl text-xs font-bold border bg-slate-50 text-slate-400 border-slate-200">
            {currentStatus === 'CONFIRMED' ? '✓ ভর্তি সফলভাবে সম্পন্ন হয়েছে' : '✕ মেয়াদের সময় শেষ হয়েছে'}
          </div>
        )}
      </div>
    </div>
  );
}