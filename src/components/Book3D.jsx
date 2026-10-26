export function Book3D({ book, className = '' }) {
  return (
    <div className={`b3d ${className}`.trim()} style={{ '--c1': book.c1 || '#34495e', '--c2': book.c2 || '#1f2d3d' }}>
      <div className="b3d-back" />
      <div className="b3d-spine"><span>{book.title}</span></div>
      <div className="b3d-edge r" />
      <div className="b3d-edge t" />
      <div className="b3d-edge b" />
      <div className="b3d-first" />
      <div className="b3d-cover">
        <div className="face front">
          {book.cover ? (
            <img className="cover-img" src={book.cover} alt="" />
          ) : (
            <div className="cover-art">
              <span className="cv-tag">{book.tag || 'Book'}</span>
              <div className="cv-icon">{book.icon || '📖'}</div>
              <b className="cv-title">{book.title}</b>
              <span className="cv-author">{book.author}</span>
            </div>
          )}
        </div>
        <div className="face inner" />
      </div>
    </div>
  );
}
