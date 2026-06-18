import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getFeed, createPost, likePost, type FeedItem } from '../api';

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function Feed() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [scope, setScope] = useState<'foryou' | 'friends'>('foryou');
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ['feed', scope], queryFn: () => getFeed(scope) });

  const post = async () => {
    const t = text.trim();
    if (!t || posting) return;
    setPosting(true);
    try { await createPost(t); setText(''); qc.invalidateQueries({ queryKey: ['feed'] }); } catch {}
    setPosting(false);
  };
  const like = async (it: FeedItem) => {
    if (!it.postId) return;
    await likePost(it.postId).catch(() => {});
    qc.invalidateQueries({ queryKey: ['feed'] });
  };

  return (
    <div className="page">
      <h1 className="display page-title">Feed</h1>

      <div className="seg" style={{ maxWidth: 320, marginBottom: 16 }}>
        <button className={'seg-btn' + (scope === 'foryou' ? ' on' : '')} onClick={() => setScope('foryou')}>Pour toi</button>
        <button className={'seg-btn' + (scope === 'friends' ? ' on' : '')} onClick={() => setScope('friends')}>Amis</button>
      </div>

      <div className="card composer">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Quoi de neuf sur l'oche ?" maxLength={280} rows={2} />
        <div className="composer-foot">
          <span className="muted mono">{text.length}/280</span>
          <button className="btn btn-amber btn-sm" onClick={post} disabled={!text.trim() || posting}>Publier</button>
        </div>
      </div>

      {isLoading ? (
        <p className="muted">Chargement…</p>
      ) : !data || data.length === 0 ? (
        <div className="card"><p className="muted">Rien pour l'instant. Publie un message ou suis des joueurs.</p></div>
      ) : (
        <div className="feed-list">
          {data.map((it) => (
            <div key={it.id} className="card feed-item">
              <div className="feed-top">
                <span className="feed-author" style={{ cursor: 'pointer' }} onClick={() => navigate(`/user/${it.user_id}`)}>{it.userName}</span>
                <span className="muted feed-user">{it.username}</span>
                <span className="muted feed-time">· {timeAgo(it.created_at)}</span>
              </div>
              {it.kind === 'post' ? (
                <>
                  <div className="feed-text">{it.text}</div>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <button className="like-btn" onClick={() => like(it)}>{it.liked ? '❤️' : '🤍'} {it.likeCount ?? 0}</button>
                    {it.postId && <button className="like-btn" onClick={() => navigate(`/post/${it.postId}`)}>💬 {it.commentCount ?? 0}</button>}
                  </div>
                </>
              ) : (
                <div className="feed-match">
                  <span className="match-badge">{it.gameType?.toUpperCase()}</span>
                  <span>{it.matchWon ? '🏆 Victoire' : 'Défaite'} {it.legsWon}–{it.oppLegs}{it.opponents?.length ? ` vs ${it.opponents.join(', ')}` : ''}</span>
                  {(it.total180s ?? 0) > 0 && <span className="amber-tag">💥 {it.total180s}×180</span>}
                  {(it.highestCheckout ?? 0) >= 100 && <span className="amber-tag">CO {it.highestCheckout}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
