import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPost, getComments, addComment, likePost } from '../api';

export function PostDetail() {
  const { id: idParam } = useParams();
  const id = Number(idParam);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: post } = useQuery({ queryKey: ['post', id], queryFn: () => getPost(id), enabled: id > 0 });
  const { data: comments = [] } = useQuery({ queryKey: ['comments', id], queryFn: () => getComments(id), enabled: id > 0 });
  const [text, setText] = useState('');

  const postId = post?.postId ?? id;
  const send = async () => {
    const t = text.trim(); if (!t) return; setText('');
    await addComment(postId, t).catch(() => {});
    qc.invalidateQueries({ queryKey: ['comments', id] });
  };
  const like = async () => { await likePost(postId).catch(() => {}); qc.invalidateQueries({ queryKey: ['post', id] }); };

  return (
    <div className="page" style={{ maxWidth: 620 }}>
      <div className="play-head" style={{ marginBottom: 8 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/feed')}>‹ Feed</button>
      </div>
      {!post ? <p className="muted">Chargement…</p> : (
        <>
          <div className="card feed-item" style={{ marginBottom: 16 }}>
            <div className="feed-top">
              <span className="feed-author" style={{ cursor: 'pointer' }} onClick={() => navigate(`/user/${post.user_id}`)}>{post.userName}</span>
              <span className="muted feed-user">{post.username}</span>
            </div>
            <div className="feed-text">{post.text}</div>
            <button className="like-btn" onClick={like}>{post.liked ? '♥' : '♡'} {post.likeCount ?? 0}</button>
          </div>

          <h3 className="display section-title" style={{ marginTop: 0 }}>Commentaires ({comments.length})</h3>
          <div className="feed-list" style={{ marginBottom: 16 }}>
            {comments.length === 0 ? <p className="muted">Sois le premier à commenter.</p> : comments.map((c) => (
              <div key={c.id} className="card feed-item">
                <div className="feed-top">
                  <span className="feed-author" style={{ cursor: 'pointer' }} onClick={() => navigate(`/user/${c.user_id}`)}>{c.userName}</span>
                  <span className="muted feed-user">{c.username}</span>
                </div>
                <div className="feed-text">{c.text}</div>
              </div>
            ))}
          </div>
          <div className="composer-bar">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ajouter un commentaire…" maxLength={280} onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
            <button className="btn btn-amber" onClick={send} disabled={!text.trim()}>Envoyer</button>
          </div>
        </>
      )}
    </div>
  );
}
