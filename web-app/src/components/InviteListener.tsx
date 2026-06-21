import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onLive, liveSend } from '../live';

interface Invite { code: string; fromName: string; config: { startScore?: number; legsToWin?: number } }

// Bannière globale : apparaît n'importe où dans l'app quand un ami t'invite à un
// match en direct (event WS 'invited'). Parité avec LiveInviteListener (mobile).
export function InviteListener() {
  const navigate = useNavigate();
  const [inv, setInv] = useState<Invite | null>(null);

  useEffect(() => onLive((m: any) => {
    if (m.type === 'invited') setInv({ code: m.code, fromName: m.fromName, config: m.config || {} });
  }), []);

  if (!inv) return null;
  const fmt = `${inv.config.startScore ?? 501} · premier à ${inv.config.legsToWin ?? 3} legs`;
  const accept = () => { const code = inv.code; setInv(null); navigate(`/direct?join=${code}`); };
  const decline = () => { liveSend({ type: 'decline_invite', code: inv.code }); setInv(null); };

  return (
    <div className="invite-banner">
      <div className="eyebrow" style={{ color: 'var(--brick)' }}>🔴 Défi en direct</div>
      <div className="display invite-from">{inv.fromName} t'invite</div>
      <div className="muted mono" style={{ fontSize: 12 }}>X01 {fmt}</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button className="btn btn-primary btn-sm" onClick={accept}>Accepter</button>
        <button className="btn btn-ghost btn-sm" onClick={decline}>Refuser</button>
      </div>
    </div>
  );
}
