import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Application = {
  id: string;
  name: string;
  age: string;
  reason: string;
  created_at: string;
};

export default function AdminApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchApplications(); }, []);

  const fetchApplications = async () => {
    setLoading(true);
    const { data } = await supabase.from('applications').select();
    setApplications(data || []);
    setLoading(false);
  };

  return (
    <>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 20px 0' }}>
        応募データ一覧
      </h1>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, fontSize: 18 }}>読込中…</div>
      ) : applications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, fontSize: 18 }}>応募データがありません</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
          <thead>
            <tr style={{ background: '#f0f6fa' }}>
              <th style={{ border: '1px solid #e0e4ec', padding: 7 }}>名前</th>
              <th style={{ border: '1px solid #e0e4ec', padding: 7 }}>年齢/年代</th>
              <th style={{ border: '1px solid #e0e4ec', padding: 7 }}>志望理由</th>
              <th style={{ border: '1px solid #e0e4ec', padding: 7 }}>応募日時</th>
            </tr>
          </thead>
          <tbody>
            {applications.map(app => (
              <tr key={app.id}>
                <td style={{ border: '1px solid #e0e4ec', padding: 7 }}>{app.name}</td>
                <td style={{ border: '1px solid #e0e4ec', padding: 7 }}>{app.age}</td>
                <td style={{ border: '1px solid #e0e4ec', padding: 7 }}>{app.reason}</td>
                <td style={{ border: '1px solid #e0e4ec', padding: 7 }}>{app.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
