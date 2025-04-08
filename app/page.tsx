'use client';

import { useEffect, useState } from 'react';
import styles from "./page.module.css";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [scheduleStatus, setScheduleStatus] = useState<any>(null);

  const fetchGoldPrice = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gold-price');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ success: false, error: 'Có lỗi xảy ra' });
    } finally {
      setLoading(false);
    }
  };

  const startSchedule = async () => {
    try {
      const response = await fetch('/api/schedule');
      const data = await response.json();
      setScheduleStatus(data);
    } catch (error) {
      console.error('Error:', error);
      setScheduleStatus({ success: false, error: 'Có lỗi xảy ra' });
    }
  };

  useEffect(() => {
    fetchGoldPrice();
  }, []);

  return (
    <div className={styles.page}>
      <h1 className="text-3xl font-bold mb-8">Giá Vàng Hôm Nay</h1>

      <div className="space-y-4">
        <button
          onClick={fetchGoldPrice}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 w-full"
        >
          {loading ? 'Đang cập nhật...' : 'Cập nhật giá vàng'}
        </button>

        <button
          onClick={startSchedule}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 w-full"
        >
          Bật tự động gửi tin nhắn mỗi 12 giờ
        </button>

        {result && (
          <div className={`p-4 rounded ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {result.success ? 'Đã cập nhật giá vàng thành công!' : result.error}
          </div>
        )}

        {scheduleStatus && (
          <div className={`p-4 rounded ${scheduleStatus.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {scheduleStatus.message}
          </div>
        )}
      </div>
    </div>
  );
}
