import React, { useState, useEffect } from 'react';
import { apiRequest } from './api';
import { ShieldCheck, User, PlusCircle, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [studentId, setStudentId] = useState(() => localStorage.getItem('school_student_id') || '');
  const [classes, setClasses] = useState([]);
  const [myHolds, setMyHolds] = useState([]);
  const [newClassName, setNewClassName] = useState('');
  const [newTotalSeats, setNewTotalSeats] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('classes'); // 'classes' | 'myHolds' | 'createClass'

  // Persist student ID across refreshes (§2.5)
  const handleStudentIdChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 17);
    setStudentId(val);
    localStorage.setItem('school_student_id', val);
  };

  const showNotification = (text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  // 1. Fetch Class List (Auto Polling every 3s without page reload - §2.5 Rule 10)
  const loadClasses = async () => {
    try {
      const data = await apiRequest('/classes');
      if (Array.isArray(data)) setClasses(data);
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
      showNotification('ক্লাসের সঠিক নাম এবং আসন সংখ্যা (১ বা তার বেশি) দিন।', 'error');
      return;
    }

    try {
      setLoading(true);
      await apiRequest('/classes', 'POST', {
        name: newClassName.trim(),
        totalSeats: parseInt(newTotalSeats)
      });
      showNotification('নতুন ক্লাস ও শিফট সফলভাবে তৈরি হয়েছে!', 'success');
      setNewClassName('');
      setNewTotalSeats('');
      setActiveTab('classes');
      loadClasses();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Apply (Hold Seat)
  const handleApply = async (classId) => {
    if (studentId.length !== 17) {
      showNotification('আবেদন করতে প্রথমে উপরে ১৭ ডিজিটের জন্ম নিবন্ধন নম্বর দিন!', 'error');
      return;
    }

    try {
      setLoading(true);
      await apiRequest(`/classes/${classId}/holds`, 'POST', null, studentId);
      showNotification('সিট সাময়িকভাবে হোল্ড করা হয়েছে! নির্ধারিত সময়ের মধ্যে ভর্তি ফি দিন।', 'success');
      loadClasses();
      loadMyHolds();
      setActiveTab('myHolds');
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Confirm Admission Fee
  const handleConfirm = async (holdId) => {
    try {
      setLoading(true);
      await apiRequest(`/holds/${holdId}/confirm`, 'POST', null, studentId);
      showNotification('ভর্তি ফি সফলভাবে জমা হয়েছে এবং ভর্তি নিশ্চিত হয়েছে!', 'success');
      loadClasses();
      loadMyHolds();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel Hold
  const handleCancel = async (holdId) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে আবেদনটি বাতিল করতে চান? সিটটি অন্য শিক্ষার্থীর জন্য খুলে দেওয়া হবে।')) return;
    try {
      setLoading(true);
      await apiRequest(`/holds/${holdId}`, 'DELETE', null, studentId);
      showNotification('আবেদন বাতিল করা হয়েছে।', 'info');
      loadClasses();
      loadMyHolds();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header Bar (§1.3) */}
      <header className="bg-blue-800 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-8 h-8 text-blue-200" />
            <div>
              <h1 className="text-xl font-bold">স্কুল ভর্তি পোর্টাল</h1>
              <p className="text-xs text-blue-200">আগে আবেদন করলে আগে পাবেন ভিত্তিতে অনলাইন ভর্তি</p>
            </div>
          </div>

          {/* Student Identity Input (§1.3) */}
          <div className="flex items-center bg-blue-900/80 rounded-lg p-2.5 border border-blue-600 w-full md:w-auto shadow-inner">
            <User className="w-5 h-5 text-blue-300 mr-2 flex-shrink-0" />
            <div className="flex flex-col flex-1">
              <label className="text-[11px] text-blue-200 font-medium">শিক্ষার্থীর জন্ম নিবন্ধন নম্বর (১৭ ডিজিট)</label>
              <input
                type="text"
                placeholder="যেমন: 20152691234567890"
                value={studentId}
                onChange={handleStudentIdChange}
                className="bg-transparent text-white font-mono text-sm focus:outline-none placeholder-blue-400"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-6 flex-1 w-full">
        {/* User-Friendly Notification Alert (§2.5 Rule 12) */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center justify-between shadow ${
            message.type === 'error' ? 'bg-red-50 text-red-800 border-l-4 border-red-500' :
            message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-500' :
            'bg-blue-50 text-blue-800 border-l-4 border-blue-500'
          }`}>
            <div className="flex items-center space-x-2">
              {message.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" /> : <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-500" />}
              <span className="font-medium text-sm">{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-xs font-bold px-2 py-1">✕</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-6 space-x-2">
          <button
            onClick={() => setActiveTab('classes')}
            className={`py-2 px-4 font-medium text-sm rounded-t-lg transition ${
              activeTab === 'classes' ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ক্লাস তালিকা ও সিট অবস্থা
          </button>
          <button
            onClick={() => setActiveTab('myHolds')}
            className={`py-2 px-4 font-medium text-sm rounded-t-lg transition ${
              activeTab === 'myHolds' ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            আমার আবেদনসমূহ ({myHolds.length})
          </button>
          <button
            onClick={() => setActiveTab('createClass')}
            className={`py-2 px-4 font-medium text-sm rounded-t-lg transition ${
              activeTab === 'createClass' ? 'bg-white text-blue-700 border-t-2 border-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            নতুন ক্লাস তৈরি (Admin)
          </button>
        </div>

        {/* Tab 1: Class List */}
        {activeTab === 'classes' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">সকল ক্লাস ও শিফটের সিট বিবরণী</h2>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin text-blue-500" /> প্রতি ৩ সেকেন্ডে অটো আপডেট হচ্ছে
              </span>
            </div>

            {classes.length === 0 ? (
              <div className="bg-white p-8 text-center text-gray-500 rounded-lg shadow-sm border">
                কোনো ক্লাস এখনো তৈরি করা হয়নি। "নতুন ক্লাস তৈরি (Admin)" ট্যাব থেকে ক্লাস যুক্ত করুন।
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls) => (
                  <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-2">{cls.name}</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                        <div className="bg-gray-50 p-2 rounded">
                          <span className="text-gray-500">মোট সিট:</span>
                          <span className="font-bold text-gray-800 block text-sm">{cls.totalSeats}</span>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded">
                          <span className="text-emerald-700">খালি সিট:</span>
                          <span className="font-bold text-emerald-800 block text-sm">{cls.availableSeats}</span>
                        </div>
                        <div className="bg-amber-50 p-2 rounded">
                          <span className="text-amber-700">হোল্ডে আছে:</span>
                          <span className="font-bold text-amber-800 block text-sm">{cls.heldSeats}</span>
                        </div>
                        <div className="bg-blue-50 p-2 rounded">
                          <span className="text-blue-700">নিশ্চিত ভর্তি:</span>
                          <span className="font-bold text-blue-800 block text-sm">{cls.confirmedSeats}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleApply(cls.id)}
                      disabled={cls.availableSeats <= 0 || loading}
                      className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition ${
                        cls.availableSeats > 0
                          ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-98 shadow'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {cls.availableSeats > 0 ? 'আবেদন করুন (Hold Seat)' : 'সিট শেষ (খালি নেই)'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: My Applications */}
        {activeTab === 'myHolds' && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">আমার আবেদনসমূহ</h2>
            {studentId.length !== 17 ? (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg text-amber-800 text-sm">
                আপনার আবেদন দেখতে দয়া করে পেইজের উপরে ১৭ সংখ্যার জন্ম নিবন্ধন নম্বর লিখুন।
              </div>
            ) : myHolds.length === 0 ? (
              <div className="bg-white p-8 text-center text-gray-500 rounded-lg shadow-sm border">
                এই শিক্ষার্থীর কোনো চলমান বা পূর্ববর্তী আবেদন পাওয়া যায়নি।
              </div>
            ) : (
              <div className="space-y-4">
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

        {/* Tab 3: Admin Class Creation */}
        {activeTab === 'createClass' && (
          <div className="max-w-md mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" /> নতুন ক্লাস এবং শিফট যুক্ত করুন
            </h2>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">ক্লাসের নাম ও শিফট</label>
                <input
                  type="text"
                  placeholder="যেমন: Class 6 - Morning Shift"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">মোট আসন (Total Seats)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="যেমন: 120"
                  value={newTotalSeats}
                  onChange={(e) => setNewTotalSeats(e.target.value)}
                  className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
              >
                {loading ? 'যুক্ত করা হচ্ছে...' : 'ক্লাস সংরক্ষণ করুন'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

// Sub-Component: Live Countdown Timer & Instant Expiry without Reload (§2.5 Rule 9)
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

  return (
    <div className="bg-white border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-gray-900 text-base">{hold.className}</h3>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            currentStatus === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
            currentStatus === 'HELD' && isHoldActive ? 'bg-amber-100 text-amber-800' :
            currentStatus === 'CANCELLED' ? 'bg-gray-100 text-gray-600' :
            'bg-red-100 text-red-800'
          }`}>
            {currentStatus}
          </span>
        </div>
        <p className="text-xs text-gray-400 font-mono">আবেদন আইডি: {hold.holdId}</p>

        {isHoldActive && (
          <div className="flex items-center gap-1.5 text-xs text-amber-700 mt-2 font-medium">
            <Clock className="w-4 h-4 animate-pulse text-amber-600" />
            মেয়াদ শেষ হতে বাকি: <span className="font-mono font-bold text-sm bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{formatTimer(timeLeft)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        {isHoldActive ? (
          <>
            <button
              onClick={() => onConfirm(hold.holdId)}
              disabled={loading}
              className="flex-1 sm:flex-none bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 active:scale-98 transition shadow"
            >
              ভর্তি ফি দিন
            </button>
            <button
              onClick={() => onCancel(hold.holdId)}
              disabled={loading}
              className="flex-1 sm:flex-none bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 transition"
            >
              বাতিল
            </button>
          </>
        ) : (
          <button
            disabled
            className="w-full sm:w-auto bg-gray-100 text-gray-400 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            {currentStatus === 'CONFIRMED' ? 'ভর্তি সফল হয়েছে' : 'মেয়াদ শেষ (Expired)'}
          </button>
        )}
      </div>
    </div>
  );
}