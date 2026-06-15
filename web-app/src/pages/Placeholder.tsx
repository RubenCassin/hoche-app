export function Placeholder({ title }: { title: string }) {
  return (
    <div className="page">
      <h1 className="display page-title">{title}</h1>
      <div className="card" style={{ marginTop: 16 }}>
        <p className="muted">
          Cet écran arrive bientôt dans la version web. Pour l'instant, utilise l'app sur ton téléphone pour cette partie —
          la version PC se complète écran par écran.
        </p>
      </div>
    </div>
  );
}
